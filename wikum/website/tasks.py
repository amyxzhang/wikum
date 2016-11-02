from __future__ import absolute_import
from celery import shared_task, current_task
from website.engine import get_source, get_article, COMMENTS_CALL,\
    import_disqus_posts, USER_AGENT, count_replies, create_vectors
from wikum.settings import DISQUS_API_KEY
import urllib2
import json
import praw
import datetime
from website.models import Comment, CommentAuthor
import re

@shared_task()
def import_article(url):
    source = get_source(url)    
    article = get_article(url, source, 0)
    posts = article.comment_set
    total_count = 0
    
    if posts.count() == 0:
        if article.source.source_name == "The Atlantic":
            get_disqus_posts(article, current_task, total_count)
            
        elif article.source.source_name == "Reddit":
            get_reddit_posts(article, current_task, total_count)
        count_replies(article)
        create_vectors(article)
        
        posts = article.comment_set.filter(reply_to_disqus=None)
        from website.views import recurse_viz
        recurse_viz(None, posts, False, article, False)


def get_reddit_posts(article, current_task, total_count):
    r = praw.Reddit(user_agent=USER_AGENT)
    submission = r.get_submission(submission_id=article.disqus_id)

    submission.replace_more_comments(limit=None, threshold=0)
    
    all_forest_comments = submission.comments
    
    import_reddit_posts(all_forest_comments, article, None, current_task, total_count)
    

def get_disqus_posts(article, current_task, total_count):
    comment_call = COMMENTS_CALL % (DISQUS_API_KEY, article.disqus_id)
            
    result = urllib2.urlopen(comment_call)
    result = json.load(result)
    
    count = import_disqus_posts(result, article)
    
    total_count += count
                
    current_task.update_state(state='PROGRESS',
                              meta={'count': total_count})
    
    while result['cursor']['hasNext']:
        next = result['cursor']['next']
        comment_call_cursor = '%s&cursor=%s' % (comment_call, next)
        
        
        result = urllib2.urlopen(comment_call_cursor)
        result = json.load(result)
        
        count = import_disqus_posts(result, article)
        
        total_count += count
        
        current_task.update_state(state='PROGRESS',
                                  meta={'count': total_count})


def import_reddit_posts(comments, article, reply_to, current_task, total_count):
    
    if total_count % 30 == 0:
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
            import_reddit_posts(replies, article, comment.id, current_task, total_count)
    