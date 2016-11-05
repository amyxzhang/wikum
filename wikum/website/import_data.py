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
            thread_call = THREAD_CALL % (DISQUS_API_KEY, source.disqus_name, url)
            result = urllib2.urlopen(thread_call)
            result = json.load(result)
            
            title = result['response'][0]['clean_title']
            link = result['response'][0]['link']
            id = result['response'][0]['id']
            
        elif source.source_name == "Reddit":
            r = praw.Reddit(user_agent=USER_AGENT)
            submission = r.get_submission(url)
            title = submission.title
            link = url
            id = submission.id
            
        article,_ = Article.objects.get_or_create(disqus_id=id, title=title, url=link, source=source)
    else:
        article = article[num]
        
    return article

def get_source(url):
    if 'theatlantic' in url:
        return Source.objects.get(source_name="The Atlantic")
    elif 'reddit.com' in url:
        return Source.objects.get(source_name="Reddit")
    return None


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
                    
        if current_task and total_count % 3 == 0:
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
            
            if current_task and total_count % 3 == 0:
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