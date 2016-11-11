from website.models import Article, Source, CommentAuthor, Comment, History, Tag
from wikum.settings import DISQUS_API_KEY
import urllib2
import json
import praw
import datetime
import re

USER_AGENT = "website:Wikum:v1.0.0 (by /u/smileyamers)"

THREAD_CALL = 'http://disqus.com/api/3.0/threads/list.json?api_key=%s&forum=%s&thread=link:%s'
COMMENTS_CALL = 'https://disqus.com/api/3.0/threads/listPosts.json?api_key=%s&thread=%s'

def get_article(url, source, num):
    article = Article.objects.filter(url=url)
    if article.count() == 0:
        if source.source_name == "The Atlantic":
            
            url = url.strip().split('?')[0]
            
            thread_call = THREAD_CALL % (DISQUS_API_KEY, source.disqus_name, url)
            result = urllib2.urlopen(thread_call)
            result = json.load(result)
            
            if len(result['response']) > 1 and result['response'][0]['link'] != url:
                return None
            
            title = result['response'][0]['clean_title']
            link = result['response'][0]['link']
            id = result['response'][0]['id']
            
        elif source.source_name == "Reddit":
            r = praw.Reddit(user_agent=USER_AGENT)
            submission = r.get_submission(url)
            title = submission.title
            link = url
            id = submission.id
            
        elif source.source_name == "Wikipedia Talk Page":
            url_parts = url.split('/wiki/Talk:')
            domain = url_parts[0]
            wiki_parts = url_parts[1].split('#')
            wiki_page = wiki_parts[0]
            section = None
            if len(url_parts) > 1:
                section = wiki_parts[1]
            
            from wikitools import wiki, api
            site = wiki.Wiki(domain + '/w/api.php')
            params = {'action': 'parse', 'prop': 'sections','page': 'Talk:' + wiki_page}
            request = api.APIRequest(site, params)
            result = request.query()
            id = str(result['parse']['pageid'])
            section_title = None
            if section:
                for s in result['parse']['sections']:
                    if s['anchor'] == section:
                        id = str(id) + '#' + str(s['index'])
                        section_title = s['line']
            title = result['parse']['title']
            if section_title:
                title = title + ' - ' + section_title
            link = url
            
        article,_ = Article.objects.get_or_create(disqus_id=id, title=title, url=link, source=source)
    else:
        article = article[num]
        
    return article

def get_source(url):
    if 'theatlantic' in url:
        return Source.objects.get(source_name="The Atlantic")
    elif 'reddit.com' in url:
        return Source.objects.get(source_name="Reddit")
    elif 'wikipedia.org/wiki/Talk' in url:
        return Source.objects.get(source_name="Wikipedia Talk Page")
    return None

def get_wiki_talk_posts(article, current_task, total_count):
    from wikitools import wiki, api
    domain = article.url.split('/wiki/Talk:')[0]
    site = wiki.Wiki(domain + '/w/api.php')
    
    title = article.title.split(' - ')
    
    params = {'action': 'query', 'titles': title[0],'prop': 'revisions', 'rvprop': 'content', 'format': 'json'}
    request = api.APIRequest(site, params)
    result = request.query()
    id = article.disqus_id.split('#')[0]
    text = result['query']['pages'][id]['revisions'][0]['*']
    import wikichatter as wc
    parsed_text = wc.parse(text.encode('ascii','ignore'))
    start_sections = parsed_text['sections']
    
    if len(title) > 1:
        section_title = title[1]
        sections = parsed_text['sections']
        for s in sections:
            heading_title = s['heading']
            heading_title = re.sub(']','', heading_title)
            heading_title = re.sub('[','', heading_title)
            if heading_title == section_title:
                start_sections = s['subsections']
                start_comments = s['comments']
    
                total_count = import_wiki_talk_posts(start_comments, article, None, current_task, total_count)
    
    total_count = import_wiki_sessions(start_sections, article, None, current_task, total_count)
    
def import_wiki_sessions(sections, article, reply_to, current_task, total_count):
    import wikichatter as wc
    for section in sections:
        heading = section.get('heading', None)
        if heading:
            parsed_text = wc.parse(heading.encode('ascii','ignore'))
            comment_author = CommentAuthor.objects.get(disqus_id='anonymous', is_wikipedia=True)
            comment_wikum = Comment.objects.create(article = article,
                                                   author = comment_author,
                                                   text = parsed_text,
                                                   reply_to_disqus = reply_to,
                                                   text_len = len(parsed_text),
                                                   )
            total_count += 1
            
            if current_task and total_count % 3 == 0:
                current_task.update_state(state='PROGRESS',
                                          meta={'count': total_count})
            
        else:
            comment_wikum = reply_to
        if len(section['comments']) > 0:
            total_count = import_wiki_talk_posts(section['comments'], article, comment_wikum, current_task, total_count)
        if len(section['subsections']) > 0:
            total_count = import_wiki_sessions(section['subsections'], article, comment_wikum, current_task, total_count)
    return total_count
    
def import_wiki_authors(authors, article):
    authors = '|'.join(authors)
    
    from wikitools import wiki, api
    domain = article.url.split('/wiki/Talk:')[0]
    site = wiki.Wiki(domain + '/w/api.php')
    
    params = {'action': 'query', 'list': 'users', 'ususers': authors, 'usprop': 'blockinfo|groups|editcount|registration|emailable|gender', 'format': 'json'}
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
    return comment_authors
    
    
def import_wiki_talk_posts(comments, article, reply_to, current_task, total_count):
    
    from wikimarkup import parse, registerInternalLinkHook

    def wikipediaLinkHook(parser_env, namespace, body):
        # namespace is going to be 'Wikipedia' 
        (article, pipe, text) = body.partition('|') 
        href = article.strip().capitalize().replace(' ', '_') 
        text = (text or article).strip() 
        return '<a href="http://en.wikipedia.org/wiki/%s">%s</a>' % (href, text)
    
    registerInternalLinkHook('*', wikipediaLinkHook)
    
    for comment in comments:
        text = parse(comment['text_blocks'])
        time = datetime.datetime.strptime(comment['time_stamp'], '%H:%M, %d %B %Y (%Z)')
        author = comment['author']
        comment_author = import_wiki_authors([author], article)
        
        cosigners = comment['cosigners']
        comment_cosigners = import_wiki_authors(cosigners, article)
            
        comment_wikum = Comment.objects.create(article = article,
                                               author = comment_author,
                                               text = text,
                                               reply_to_disqus = reply_to,
                                               text_len = len(text),
                                               created_at=time,
                                               )
        for signer in comment_cosigners:
            comment_wikum.cosigners.add(signer)
            
        comment_wikum.save()
        comment_wikum.disqus_id = comment_wikum.id
        comment_wikum.save()
        
        total_count += 1
        
        if current_task and total_count % 3 == 0:
            current_task.update_state(state='PROGRESS',
                                      meta={'count': total_count})
        
        replies = comment['comments']
        total_count = import_wiki_talk_posts(replies, article, comment.id, current_task, total_count)
    
    return total_count
        

def get_reddit_posts(article, current_task, total_count):
    r = praw.Reddit(user_agent=USER_AGENT)
    submission = r.get_submission(submission_id=article.disqus_id)

    submission.replace_more_comments(limit=None, threshold=0)
    
    all_forest_comments = submission.comments
    
    import_reddit_posts(all_forest_comments, article, None, current_task, total_count)
    
def count_replies(article):
    comments = Comment.objects.filter(article=article)
    for c in comments:
        if c.disqus_id != '':
            replies = Comment.objects.filter(reply_to_disqus=c.disqus_id, article=article).count()
            c.num_replies = replies
            c.save()


def get_disqus_posts(article, current_task, total_count):
    comment_call = COMMENTS_CALL % (DISQUS_API_KEY, article.disqus_id)
            
    result = urllib2.urlopen(comment_call)
    result = json.load(result)
    
    count = import_disqus_posts(result, article)
    
    if current_task:
        total_count += count
                    
        if total_count % 3 == 0:
            current_task.update_state(state='PROGRESS',
                                      meta={'count': total_count})
    
    while result['cursor']['hasNext']:
        next = result['cursor']['next']
        comment_call_cursor = '%s&cursor=%s' % (comment_call, next)
        
        
        result = urllib2.urlopen(comment_call_cursor)
        result = json.load(result)
        
        count = import_disqus_posts(result, article)
        
        if current_task:
            total_count += count
            
            if total_count % 3 == 0:
                current_task.update_state(state='PROGRESS',
                                          meta={'count': total_count})


def import_reddit_posts(comments, article, reply_to, current_task, total_count):
    
    if current_task and total_count % 3 == 0:
        current_task.update_state(state='PROGRESS',
                                  meta={'count': total_count})
    
    for comment in comments:
        
        comment_id = comment.id
        comment_wikum = Comment.objects.filter(disqus_id=comment_id, article=article)
        
        if comment_wikum.count() == 0:
            
            from praw.errors import NotFound
            
            try:
                author_id = comment.author.id
                comment_author = CommentAuthor.objects.filter(disqus_id=author_id)
                if comment_author.count() > 0:
                    comment_author = comment_author[0]
                else:
                    comment_author = CommentAuthor.objects.create(username=comment.author.name, 
                                                              disqus_id=author_id,
                                                              joined_at=datetime.datetime.fromtimestamp(int(comment.author.created_utc)),
                                                              is_reddit=True,
                                                              is_mod=comment.author.is_mod,
                                                              is_gold=comment.author.is_gold,
                                                              comment_karma=comment.author.comment_karma,
                                                              link_karma=comment.author.link_karma
                                                              )
            except AttributeError:
                comment_author = CommentAuthor.objects.get(disqus_id='anonymous')
            except NotFound:
                comment_author = CommentAuthor.objects.get(disqus_id='anonymous')
            
            html_text = comment.body_html
            html_text = re.sub('<div class="md">', '', html_text)
            html_text = re.sub('</div>', '', html_text)
            
            total_count += 1
            
            comment_wikum = Comment.objects.create(article = article,
                                             author = comment_author,
                                             text = html_text,
                                             disqus_id = comment.id,
                                             reply_to_disqus = reply_to,
                                             text_len = len(html_text),
                                             likes = comment.ups,
                                             dislikes = comment.downs,
                                             reports = len(comment.user_reports),
                                             points = comment.score,
                                             controversial_score = comment.controversiality,
                                             created_at=datetime.datetime.fromtimestamp(int(comment.created_utc)),
                                             edited = comment.edited,
                                             flagged = len(comment.user_reports) > 0,
                                             deleted = comment.banned_by != None,
                                             approved = comment.approved_by != None,
                                             )
            replies = comment.replies
            total_count = import_reddit_posts(replies, article, comment.id, current_task, total_count)
    
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
        
    return count