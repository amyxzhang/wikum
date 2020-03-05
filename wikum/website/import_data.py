from website.models import Article, Source, CommentAuthor, Comment, History, Tag
from wikum.settings import DISQUS_API_KEY, PRAW_USERNAME, PRAW_PASSWORD, PRAW_CLIENT_ID, PRAW_CLIENT_SECRET
import urllib
import json
import praw
import datetime
from django.utils import timezone
import re
import requests

USER_AGENT = "website:Wikum:v1.0.0 (by /u/smileyamers)"

THREAD_CALL = 'http://disqus.com/api/3.0/threads/list.json?api_key=%s&forum=%s&thread=link:%s'
COMMENTS_CALL = 'https://disqus.com/api/3.0/threads/listPosts.json?api_key=%s&thread=%s'

DECIDE_CALL = '{ proposal(id: %s) { id cached_votes_up comments_count confidence_score description external_url geozone { id name } hot_score public_author { id username } public_created_at retired_at retired_explanation retired_reason summary tags(first: 10) { edges { node { id name } } } comments(first: 50, after: "%s") { pageInfo { hasNextPage endCursor } edges { node { public_author { id username } cached_votes_up cached_votes_down public_created_at id body ancestry } } } title video_url } }'

_CLOSE_COMMENT_KEYWORDS =  [r'{{(atop|quote box|consensus|Archive(-?)( ?)top|Discussion( ?)top|(closed.*?)?rfc top)', r'\|result=', r"(={2,3}|''')( )?Clos(e|ing)( comment(s?)|( RFC)?)( )?(={2,3}|''')" , 'The following discussion is an archived discussion of the proposal' , 'A summary of the debate may be found at the bottom of the discussion', 'A summary of the conclusions reached follows']
_CLOSE_COMMENT_RE = re.compile(r'|'.join(_CLOSE_COMMENT_KEYWORDS), re.IGNORECASE|re.DOTALL)

def get_article(url, user, source, num):

    article = Article.objects.filter(url=url, owner=user)

    if article.count() == 0:
        if source.source_name == "The Atlantic":

            url = url.strip().split('?')[0]

            thread_call = THREAD_CALL % (DISQUS_API_KEY, source.disqus_name, url)
            result = urllib.request.urlopen(thread_call)
            result = json.load(result)

            if len(result['response']) > 1 and result['response'][0]['link'] != url:
                return None

            title = result['response'][0]['clean_title']
            link = result['response'][0]['link']
            id = result['response'][0]['id']

        elif source.source_name == "Reddit":
            # r = praw.Reddit(client_id=PRAW_CLIENT_ID,
            #                 client_secret=PRAW_CLIENT_SECRET,
            #                 user_agent=USER_AGENT,
            #                 username=PRAW_USERNAME,
            #                 password=PRAW_PASSWORD
            #                 )
            # submission = r.submission(url)
            # title = submission.title
            # link = url
            # id = submission.id

            link = url + "/.json"
            rr = requests.get(link, headers = {'User-agent': 'your bot 0.1'})
            r = rr.json()
            title = r[0]["data"]["children"][0]["data"]["title"]
            id = r[0]["data"]["children"][0]["data"]["name"]

        elif source.source_name == "Wikipedia Talk Page":
            url_parts = url.split('/wiki/')
            domain = url_parts[0]
            wiki_sub = url_parts[1].split(':')
            wiki_parts = ':'.join(wiki_sub[1:]).split('#')
            wiki_page = wiki_parts[0]
            section = None
            if len(wiki_parts) > 1:
                section = wiki_parts[1]

            from wikitools import wiki, api
            site = wiki.Wiki(domain + '/w/api.php')
            page = urllib.parse.unquote(str(wiki_sub[0]) + ':' + wiki_page)
            params = {'action': 'parse', 'prop': 'sections','page': page ,'redirects':'yes' }
            request = api.APIRequest(site, params)
            result = request.query()

            id = str(result['parse']['pageid'])
            section_title = None
            section_index = None

            if section:
                for s in result['parse']['sections']:
                    if s['anchor'] == section:
                        id = str(id) + '#' + str(s['index'])
                        section_title = s['line']
                        section_index = s['index']
            title = result['parse']['title']
            if section_title:
                title = title + ' - ' + section_title

            link = urllib.parse.unquote(url)

        elif source.source_name == "Decide Proposal":
            url_parts = url.split('/proposals/')
            id = url_parts[1].split('-')[0]
            #title = url_parts[1]
            link = urllib.parse.unquote(url)
            r = requests.post('https://decide.madrid.es/graphql', data = {'query': DECIDE_CALL % (id, '')})
            title = json.loads(str(r.content))['data']['proposal']['title']

        elif source.source_name == "JOIN Taiwan":
            url_parts = url.split('/detail/')
            id = url_parts[1].split('?')[0]
            link = urllib.parse.unquote(url)
            r = requests.get('https://join.gov.tw/joinComments/board/policy/{0}'.format(id))
            title = r.json()['result'][0]['board']['title']
        article, created = Article.objects.get_or_create(disqus_id=id, title=title, url=link, source=source, owner=user)
        article.last_updated = datetime.datetime.now(tz=timezone.utc)
        article.save()
    else:
        article = article[num]

    return article

def get_source(url):
    if 'theatlantic' in url:
        return Source.objects.get(source_name="The Atlantic")
    elif 'reddit.com' in url:
        return Source.objects.get(source_name="Reddit")
    elif 'wikipedia.org/wiki/' in url:
        return Source.objects.get(source_name="Wikipedia Talk Page")
    elif 'decide.madrid.es/proposals' in url:
        return Source.objects.get(source_name="Decide Proposal")
    elif 'join.gov.tw' in url:
        return Source.objects.get(source_name="JOIN Taiwan")
    return None



def get_wiki_talk_posts(article, current_task, total_count):


    from wikitools import wiki, api
    domain = article.url.split('/wiki/')[0]
    site = wiki.Wiki(domain + '/w/api.php')

    title = article.title.split(' - ')
    # "section_index" is the index number of the section within the page.
    # There are some cases when wikicode does not parse a section as a section when given a "whole page".
    # To prevent this, we first grab only the section(not the entire page) using "section_index" and parse it.
    section_index = article.section_index

    params = {'action': 'query', 'titles': title[0],'prop': 'revisions', 'rvprop': 'content', 'format': 'json','redirects':'yes'}
    if section_index:
        params['rvsection'] = section_index

    request = api.APIRequest(site, params)
    result = request.query()
    id = article.disqus_id.split('#')[0]
    text = result['query']['pages'][id]['revisions'][0]['*']

    def get_section(sections, section_title):
        for s in sections:
            heading_title = s.get('heading', '')
            heading_title = re.sub(r'\]', '', heading_title)
            heading_title = re.sub(r'\[', '', heading_title)
            heading_title = re.sub('<[^<]+?>', '', heading_title)
            if heading_title.strip() == str(section_title).strip():
                return s

    def find_outer_section(title, text, id):
        # Check if closing comment is in here, if not look for the outer section.
        # If there is an outer section, choose it only if it has a closing statement,
        if len(title)>1:
            section_title = title[1].encode('ascii', 'ignore')
            params = {'action': 'query', 'titles': title[0], 'prop': 'revisions', 'rvprop': 'content', 'format': 'json', 'redirects': 'yes'}
            result = api.APIRequest(site, params).query()
            whole_text = result['query']['pages'][id]['revisions'][0]['*']

            import wikichatter as wc
            parsed_whole_text = wc.parse(whole_text.encode('ascii','ignore'))
            sections = parsed_whole_text['sections']

            for outer_section in sections:
                found_subection = get_section(outer_section['subsections'], section_title)
                if found_subection:
                    outer_comments = outer_section['comments']
                    for comment in outer_comments:
                        comment_text = '\n'.join(comment['text_blocks'])
                        if re.search(_CLOSE_COMMENT_RE, comment_text):
                            params = {'action': 'parse', 'prop': 'sections', 'page': title[0], 'redirects': 'yes'}
                            result = api.APIRequest(site, params).query()
                            for s in result['parse']['sections']:
                                if s['line'] == outer_section.get('heading').strip():
                                    section_index = s['index']
                                    params = {'action': 'query', 'titles': title[0], 'prop': 'revisions',
                                               'rvprop': 'content', 'rvsection': section_index, 'format': 'json',
                                              'redirects': 'yes'}
                                    result = api.APIRequest(site, params).query()
                                    final_section_text = result['query']['pages'][id]['revisions'][0]['*']
                                    return final_section_text
        return text

    # If there isn't a closing statement, it means that the RfC could exist as a subsection of another section, with the closing statement in the parent section.
    # Example: https://en.wikipedia.org/wiki/Talk:Alexz_Johnson#Lead_image
    if not re.search(_CLOSE_COMMENT_RE, text):
        text = find_outer_section(title, text, id)

    import wikichatter as wc
    parsed_text = wc.parse(text.encode('ascii','ignore'))

    start_sections = parsed_text['sections']
    if len(title) > 1:
        section_title = title[1].encode('ascii','ignore')
        sections = parsed_text['sections']
        found_section = get_section(sections, section_title)
        if found_section:
            start_sections = found_section['subsections']
            start_comments = found_section['comments']
            total_count = import_wiki_talk_posts(start_comments, article, None, current_task, total_count)

    total_count = import_wiki_sessions(start_sections, article, None, current_task, total_count)


def import_wiki_sessions(sections, article, reply_to, current_task, total_count):
    for section in sections:
        heading = section.get('heading', None)
#         if heading:
#             parsed_text = heading
#             comment_author = CommentAuthor.objects.get(disqus_id='anonymous', is_wikipedia=True)
#
#             comments = Comment.objects.filter(article=article, author=comment_author, text=parsed_text)
#             if comments.count() > 0:
#                 comment_wikum = comments[0]
#             else:
#                 comment_wikum = Comment.objects.create(article = article,
#                                                        author = comment_author,
#                                                        text = parsed_text,
#                                                        reply_to_disqus = reply_to,
#                                                        text_len = len(parsed_text),
#                                                        )
#                 comment_wikum.save()
#                 comment_wikum.disqus_id = comment_wikum.id
#                 comment_wikum.save()
#
#             disqus_id = comment_wikum.disqus_id
#
#             total_count += 1
#
#             if current_task and total_count % 3 == 0:
#                 current_task.update_state(state='PROGRESS',
#                                           meta={'count': total_count})
#
#         else:
        disqus_id = reply_to

        if len(section['comments']) > 0:
            total_count = import_wiki_talk_posts(section['comments'], article, disqus_id, current_task, total_count)
        if len(section['subsections']) > 0:
            total_count = import_wiki_sessions(section['subsections'], article, disqus_id, current_task, total_count)
    return total_count

def import_wiki_authors(authors, article):
    found_authors = []
    anonymous_exist = False
    for author in authors:
        if author:
            found_authors.append(author)
        else:
            anonymous_exist = True
    authors_list = '|'.join(found_authors)

    from wikitools import wiki, api
    domain = article.url.split('/wiki/')[0]
    site = wiki.Wiki(domain + '/w/api.php')
    params = {'action': 'query', 'list': 'users', 'ususers': authors_list, 'usprop': 'blockinfo|groups|editcount|registration|emailable|gender', 'format': 'json'}

    request = api.APIRequest(site, params)
    result = request.query()
    comment_authors = []
    for user in result['query']['users']:
        try:
            author_id = user['userid']
            comment_author = CommentAuthor.objects.filter(disqus_id=author_id)
            if comment_author.count() > 0:
                comment_author = comment_author[0]
            else:
                joined_at = datetime.datetime.strptime(user['registration'], '%Y-%m-%dT%H:%M:%SZ')
                comment_author = CommentAuthor.objects.create(username=user['name'],
                                                              disqus_id=author_id,
                                                              joined_at=user['registration'],
                                                              edit_count=user['editcount'],
                                                              gender=user['gender'],
                                                              groups=','.join(user['groups']),
                                                              is_wikipedia=True
                                                              )
        except Exception:
            comment_author = CommentAuthor.objects.create(username=user['name'], is_wikipedia=True)
        comment_authors.append(comment_author)

    if anonymous_exist:
        comment_authors.append(CommentAuthor.objects.get(disqus_id='anonymous', is_wikipedia=True))

    return comment_authors


def import_wiki_talk_posts(comments, article, reply_to, current_task, total_count):
    for comment in comments:
        text = '\n'.join(comment['text_blocks']).strip()

        author = comment.get('author')
        
        if not (not author and text.startswith('{{') and text.endswith('}}') and len(text) < 50 and not comment['comments']):
            if author:
                comment_author = import_wiki_authors([author], article)[0]
            else:
                comment_author = CommentAuthor.objects.get(disqus_id='anonymous', is_wikipedia=True)
    
            comments = Comment.objects.filter(article=article, author=comment_author,text=text)
            if comments.count() > 0:
                comment_wikum = comments[0]
            else:
                time = None
                timestamp = comment.get('time_stamp')
                if timestamp:
                    formats = ['%H:%M, %d %B %Y (%Z)', '%H:%M, %d %b %Y (%Z)', '%H:%M %b %d, %Y (%Z)']
                    for date_format in formats:
                        try:
                            time = datetime.datetime.strptime(timestamp, date_format)
                        except ValueError:
                            pass
                if not time:
                    if text.strip().endswith('(UTC)'):
                        temp_str = text.split(':')
                        date_str = temp_str[-2][-2:] + ':' + temp_str[-1]
                        try:
                            time = datetime.datetime.strptime(date_str, ' %H:%M, %d %B %Y (%Z)')
                        except ValueError:
                            pass
                cosigners = [sign['author'] for sign in comment['cosigners']]
                comment_cosigners = import_wiki_authors(cosigners, article)
    
    
                comment_wikum = Comment.objects.create(article = article,
                                                       author = comment_author,
                                                       text = text,
                                                       reply_to_disqus = reply_to,
                                                       text_len = len(text),
                                                       )
                if time:
                    comment_wikum.created_at = time
    
                comment_wikum.save()
                comment_wikum.disqus_id = comment_wikum.id
                comment_wikum.import_order = comment_wikum.id
                comment_wikum.save()
    
                for signer in comment_cosigners:
                    comment_wikum.cosigners.add(signer)

            total_count += 1

        if current_task and total_count % 3 == 0:
            current_task.update_state(state='PROGRESS',
                                      meta={'count': total_count})

        replies = comment['comments']
        if replies:
            total_count = import_wiki_talk_posts(replies, article, comment_wikum.disqus_id, current_task, total_count)

    return total_count


def get_reddit_posts(article, current_task, total_count, url):
    # r = praw.Reddit(client_id=PRAW_CLIENT_ID,
    #                 client_secret=PRAW_CLIENT_SECRET,
    #                 user_agent=USER_AGENT,
    #                 username=PRAW_USERNAME,
    #                 password=PRAW_PASSWORD
    #                )
    
    # submission = r.submission(submission_id=article.disqus_id)

    # submission.comments.replace_more(limit=None, threshold=0)

    # all_forest_comments = submission.comments
    # print(submission)

    # import_reddit_posts(all_forest_comments, article, None, current_task, total_count)
    link = url + "/.json"
    rr = requests.get(link, headers = {'User-agent': 'your bot 0.1'})
    r = rr.json()
    content = r[0]["data"]["children"][0]
    r = r[1]["data"]["children"]
    import_reddit_posts(r, article, None, current_task, total_count, content)

def count_replies(article):
    comments = Comment.objects.filter(article=article)
    for c in comments:
        if c.disqus_id != '':
            replies = Comment.objects.filter(reply_to_disqus=c.disqus_id, article=article).count()
            c.num_replies = replies
            c.save()


def get_decide_proposal_posts(article, current_task, total_count):
    decide_comment_call = DECIDE_CALL % (article.disqus_id, '')

    r = requests.post('https://decide.madrid.es/graphql', data = {'query': decide_comment_call})
    result = json.loads(str(r.content))

    count = import_decide_proposal_posts(result, article)

    ### current_task?
    if current_task:
        total_count += count

        ### why (total_count % 3 == 0) ?
        if total_count % 3 == 0:
            current_task.update_state(state='PROGRESS',
                                      meta={'count': total_count})

    while result['data']['proposal']['comments']['pageInfo']['endCursor']:
        next = result['data']['proposal']['comments']['pageInfo']['endCursor']
        decide_comment_call_cursor = decide_comment_call = DECIDE_CALL % (article.disqus_id, next)



        r = requests.post('https://decide.madrid.es/graphql', data = {'query': decide_comment_call_cursor})
        result = json.loads(str(r.content))

        count = import_decide_proposal_posts(result, article)

        if current_task:
            total_count += count

            if total_count % 3 == 0:
                current_task.update_state(state='PROGRESS',
                                          meta={'count': total_count})


def get_disqus_posts(article, current_task, total_count):
    comment_call = COMMENTS_CALL % (DISQUS_API_KEY, article.disqus_id)

    result = urllib.request.urlopen(comment_call)
    result = json.load(result)

    count = import_disqus_posts(result, article)

    ### current_task?
    if current_task:
        total_count += count

        ### why (total_count % 3 == 0) ?
        if total_count % 3 == 0:
            current_task.update_state(state='PROGRESS',
                                      meta={'count': total_count})

    while result['cursor']['hasNext']:
        next = result['cursor']['next']
        comment_call_cursor = '%s&cursor=%s' % (comment_call, next)


        result = urllib.request.urlopen(comment_call_cursor)
        result = json.load(result)

        count = import_disqus_posts(result, article)

        if current_task:
            total_count += count

            if total_count % 3 == 0:
                current_task.update_state(state='PROGRESS',
                                          meta={'count': total_count})

def get_join_taiwan_posts(article, current_task, total_count):
    page = 1
    size = 20
    while True:
        r = requests.get('https://join.gov.tw/joinComments/board/policy/{id}?page={page}&size={size}'.format(id=article.disqus_id, page=page, size=size))
        data = r.json()
        if not data['success']:
            raise Exception('Cannot get comments form JOIN Taiwan API')
        if len(data['result']) > 0:
            count = import_join_taiwan_posts(data['result'], article, current_task, total_count)
        if data['currentPage'] == data['totalPages']:
            break
        page += 1


def import_reddit_posts(comments, article, reply_to, current_task, total_count, title=""):
    if title == "":
        if current_task and total_count % 3 == 0:
            current_task.update_state(state='PROGRESS',
                                    meta={'count': total_count})

        for comment in comments:
            comment_id = comment["data"]["id"]
            comment_wikum = Comment.objects.filter(disqus_id=comment_id, article=article)

            if comment_wikum.count() == 0:

                try:
                    author_id = comment["data"]["author_fullname"]
                    comment_author = CommentAuthor.objects.filter(disqus_id=author_id)
                    if comment_author.count() > 0:
                        comment_author = comment_author[0]
                    else:
                        comment_author = CommentAuthor.objects.create(username=comment["data"]["author"],
                                                                disqus_id=author_id,
                                                                joined_at=datetime.datetime.fromtimestamp(int(comment["data"]["created_utc"])),
                                                                is_reddit=True,
                                                                is_mod=comment["data"]["can_mod_post"],
                                                                is_gold=comment["data"]["author_premium"],
                                                                #   comment_karma=comment.author.comment_karma,
                                                                #   link_karma=comment.author.link_karma
                                                                )
                except:
                    comment_author = CommentAuthor.objects.get(disqus_id='anonymous', is_wikipedia=False)
                # except NotFound:
                #     comment_author = CommentAuthor.objects.get(disqus_id='anonymous', is_wikipedia=False)

                html_text = comment["data"]["body"]
                html_text = re.sub('<div class="md">', '', html_text)
                html_text = re.sub('</div>', '', html_text)

                total_count += 1

                comment_wikum = Comment.objects.create(article = article,
                                                author = comment_author,
                                                text = html_text,
                                                disqus_id = comment["data"]["id"],
                                                reply_to_disqus = reply_to,
                                                text_len = len(html_text),
                                                likes = comment["data"]["ups"],
                                                dislikes = comment["data"]["downs"],
                                                reports = len(comment["data"]["user_reports"]),
                                                points = comment["data"]["score"],
                                                controversial_score = comment["data"]["controversiality"],
                                                created_at=datetime.datetime.fromtimestamp(int(comment["data"]["created_utc"])),
                                                edited = comment["data"]["edited"],
                                                flagged = len(comment["data"]["user_reports"]) > 0,
                                                #  deleted = comment["data"]["banned_by"] != None,
                                                #  approved = comment["data"]["approved_by"] != None,
                                                )
                comment_wikum.import_order = comment_wikum.id
                comment_wikum.save()

                try:
                    replies = comment["data"]["replies"]["data"]["children"]
                    total_count = import_reddit_posts(replies, article, comment["data"]["id"], current_task, total_count)
                except:
                    pass

        return total_count
    else:
        if current_task and total_count % 3 == 0:
            current_task.update_state(state='PROGRESS',
                                    meta={'count': total_count})
        comment = title
        comment_id = comment["data"]["id"]
        comment_wikum = Comment.objects.filter(disqus_id=comment_id, article=article)

        if comment_wikum.count() == 0:

            try:
                author_id = comment["data"]["author_fullname"]
                comment_author = CommentAuthor.objects.filter(disqus_id=author_id)
                if comment_author.count() > 0:
                    comment_author = comment_author[0]
                else:
                    comment_author = CommentAuthor.objects.create(username=comment["data"]["author"],
                                                            disqus_id=author_id,
                                                            joined_at=datetime.datetime.fromtimestamp(int(comment["data"]["created_utc"])),
                                                            is_reddit=True,
                                                            is_mod=comment["data"]["can_mod_post"],
                                                            is_gold=comment["data"]["author_premium"],
                                                            #   comment_karma=comment.author.comment_karma,
                                                            #   link_karma=comment.author.link_karma
                                                            )
            except:
                comment_author = CommentAuthor.objects.get(disqus_id='anonymous', is_wikipedia=False)
            # except NotFound:
            #     comment_author = CommentAuthor.objects.get(disqus_id='anonymous', is_wikipedia=False)

            html_text = comment["data"]["selftext"]
            html_text = re.sub('<div class="md">', '', html_text)
            html_text = re.sub('</div>', '', html_text)

            total_count += 1

            comment_wikum = Comment.objects.create(article = article,
                                            author = comment_author,
                                            text = html_text,
                                            disqus_id = comment["data"]["id"],
                                            reply_to_disqus = reply_to,
                                            text_len = len(html_text),
                                            likes = comment["data"]["ups"],
                                            dislikes = comment["data"]["downs"],
                                            reports = len(comment["data"]["user_reports"]),
                                            points = comment["data"]["score"],
                                            # controversial_score = comment["data"]["controversiality"],
                                            created_at=datetime.datetime.fromtimestamp(int(comment["data"]["created_utc"])),
                                            edited = comment["data"]["edited"],
                                            flagged = len(comment["data"]["user_reports"]) > 0,
                                            #  deleted = comment["data"]["banned_by"] != None,
                                            #  approved = comment["data"]["approved_by"] != None,
                                            )
            comment_wikum.import_order = comment_wikum.id
            comment_wikum.save()

            total_count = import_reddit_posts(comments, article, None, current_task, total_count, "")
        return total_count

def import_disqus_posts(result, article):
    count = 0
    for response in result['response']:
        comment_id = response['id']
        comment = Comment.objects.filter(disqus_id=comment_id, article=article)

        if comment.count() == 0:

            count += 1

            anonymous = response['author']['isAnonymous']
            if anonymous:
                comment_author = CommentAuthor.objects.get(disqus_id='anonymous')
            else:
                author_id = response['author']['id']

                comment_author = CommentAuthor.objects.filter(disqus_id=author_id)
                if comment_author.count() > 0:
                    comment_author = comment_author[0]
                else:

                    comment_author,_ = CommentAuthor.objects.get_or_create(username = response['author']['username'],
                                                          real_name = response['author']['name'],
                                                          power_contrib = response['author']['isPowerContributor'],
                                                          anonymous = anonymous,
                                                          reputation = response['author']['reputation'],
                                                          joined_at = datetime.datetime.strptime(response['author']['joinedAt'], '%Y-%m-%dT%H:%M:%S'),
                                                          disqus_id = author_id,
                                                          avatar = response['author']['avatar']['small']['permalink'],
                                                          primary = response['author']['isPrimary']
                                                          )

            comment = Comment.objects.create(article = article,
                                             author = comment_author,
                                             text = response['message'],
                                             disqus_id = response['id'],
                                             reply_to_disqus = response['parent'],
                                             text_len = len(response['message']),
                                             likes = response['likes'],
                                             dislikes = response['dislikes'],
                                             reports = response['numReports'],
                                             points = response['points'],
                                             created_at = datetime.datetime.strptime(response['createdAt'], '%Y-%m-%dT%H:%M:%S'),
                                             edited = response['isEdited'],
                                             spam = response['isSpam'],
                                             highlighted = response['isHighlighted'],
                                             flagged = response['isFlagged'],
                                             deleted = response['isDeleted'],
                                             approved = response['isApproved']
                                             )
            comment.import_order = comment.id
            comment.save()

    return count


def import_decide_proposal_posts(result, article):
    count = 0
    for r in result['data']['proposal']['comments']['edges']:
        response = r['node']
        comment_id = response['id']
        comment = Comment.objects.filter(disqus_id=comment_id, article=article)

        if comment.count() == 0:

            count += 1

            anonymous = False
            if not 'public_author' in response:
                anonymous = True
            elif response['public_author'] is None:
                anonymous = True
            elif not 'id' in response['public_author']:
                anonymous = True
            elif response['public_author']['id'] is None:
                anonymous = True



            if anonymous:
                comment_author = CommentAuthor.objects.get(disqus_id='anonymous', is_decide=True)
            else:
                author_id = response['public_author']['id']
                comment_author = CommentAuthor.objects.filter(disqus_id=author_id)

                if comment_author.count() > 0:
                    comment_author = comment_author[0]
                else:
                    real_name = ''
                    if not response['public_author']['username'] is None:
                        real_name = response['public_author']['username']
                    comment_author,_ = CommentAuthor.objects.get_or_create(username = real_name,
                                                          real_name = real_name,
                                                          anonymous = anonymous,
                                                          disqus_id = author_id,
                                                          is_decide=True
                                                          )


            parent = None
            if not response['ancestry'] is None:
                parent = response['ancestry'].split('/')[-1]

            comment = Comment.objects.create(article = article,
                                             author = comment_author,
                                             text = response['body'],
                                             disqus_id = response['id'],
                                             reply_to_disqus = parent,
                                             text_len = len(response['body']),
                                             likes = response['cached_votes_up'],
                                             dislikes = response['cached_votes_down'],
                                             points = response['cached_votes_up']-response['cached_votes_down'],
                                             created_at = datetime.datetime.strptime(response['public_created_at'].split(' +')[0], '%Y-%m-%d %H:%M:%S')
                                             )
            comment.import_order = comment.id
            comment.save()

    return count

def import_join_taiwan_posts(result, article, current_task, total_count):
    count = 0
    for data in result:
        text = data['content4Html']
        comment_id = data['msgUid']
        author_id = data['author']['userUid']
        anonymous = data['anonymous']
        parent = data['parentMsgUid']
        try:
            if anonymous:
                author = CommentAuthor.objects.get(disqus_id='anonymous', is_join=True)
            else:
                author, _ = CommentAuthor.objects.get_or_create(username = data['author']['displayName'],
                                                                real_name = data['author']['displayName'],
                                                                anonymous = anonymous,
                                                                disqus_id = author_id,
                                                                is_join = True,
                                                                )
            comment, _ = Comment.objects.get_or_create(disqus_id = comment_id,
                                                       text = text,
                                                       article = article,
                                                       reply_to_disqus = parent,
                                                       author = author,
                                                       )
            author.save()
            comment.import_order = comment.id
            comment.save()
            total_count += 1
            count += 1
        except Exception:
            pass

        if len(data['replyMessages']) > 0:
            import_join_taiwan_posts(data['replyMessages'], article, current_task, total_count)

        if current_task and total_count % 3 == 0:
            current_task.update_state(state='PROGRESS',
                                      meta={'count': total_count})
    return count

