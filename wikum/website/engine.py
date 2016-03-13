import json
import urllib2
from website.models import Article, Source, CommentAuthor, Comment, History
from wikum.settings import DISQUS_API_KEY
import datetime
from django.core.paginator import Paginator
from random import randint

THREAD_CALL = 'http://disqus.com/api/3.0/threads/list.json?api_key=%s&forum=%s&thread=link:%s'
COMMENTS_CALL = 'https://disqus.com/api/3.0/threads/listPosts.json?api_key=%s&thread=%s'


def random_with_N_digits(n):
    range_start = 10**(n-1)
    range_end = (10**n)-1
    return randint(range_start, range_end)

def get_source(url):
    if 'theatlantic' in url:
        return Source.objects.get(source_name="The Atlantic")
    return None

def get_article(url, source):
    article = Article.objects.filter(url=url)
    if article.count() == 0:
        thread_call = THREAD_CALL % (DISQUS_API_KEY, source.disqus_name, url)
        result = urllib2.urlopen(thread_call)
        result = json.load(result)
        
        title = result['response'][0]['clean_title']
        link = result['response'][0]['link']
        id = result['response'][0]['id']
        
        article,_ = Article.objects.get_or_create(disqus_id=id, title=title, url=link, source=source)
    else:
        article = article[0]
        
    return article

def count_replies(article):
    comments = Comment.objects.filter(article=article)
    for c in comments:
        if c.disqus_id != '':
            replies = Comment.objects.filter(reply_to_disqus=c.disqus_id).count()
            c.num_replies = replies
            c.save()


def import_posts(result, article):
    for response in result['response']:
        comment_id = response['id']
        comment = Comment.objects.filter(disqus_id=comment_id)
        
        if comment.count() == 0:
            
            anonymous = response['author']['isAnonymous']
            if anonymous:
                comment_author = CommentAuthor.objects.get(disqus_id=None)
            else:
                author_id = response['author']['id']
                
                comment_author = CommentAuthor.objects.filter(disqus_id=author_id)
                if comment_author.count() > 0:
                    comment_author = comment_author[0]
                else:
                    
                    comment_author = CommentAuthor.objects.create(username = response['author']['username'],
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
        
        

def get_posts(article):
    
    posts = article.comment_set
    if posts.count() == 0:
        comment_call = COMMENTS_CALL % (DISQUS_API_KEY, article.disqus_id)
        
        print comment_call
        
        result = urllib2.urlopen(comment_call)
        result = json.load(result)
        
        import_posts(result, article)
        
        while result['cursor']['hasNext']:
            next = result['cursor']['next']
            comment_call_cursor = '%s&cursor=%s' % (comment_call, next)
            
            print comment_call_cursor
            
            result = urllib2.urlopen(comment_call_cursor)
            result = json.load(result)
            
            import_posts(result, article)
            
        count_replies(article)
        
        posts = article.comment_set.filter(reply_to_disqus=None).order_by('-likes')
    else:
        posts = posts.filter(reply_to_disqus=None).order_by('-likes')
    
    return posts[0:50]

