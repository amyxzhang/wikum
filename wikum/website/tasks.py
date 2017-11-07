from __future__ import absolute_import
from celery import shared_task, current_task
from celery.exceptions import Ignore
from website.import_data import get_source, get_article, get_disqus_posts,\
    get_reddit_posts, count_replies, get_wiki_talk_posts
from django.db import connection

@shared_task()
def import_article(url):
    connection.close()
    
    source = get_source(url)

    print source

    if source:
        article = get_article(url, source, 0)
        if article:
            posts = article.comment_set
            total_count = 0
            
            if posts.count() == 0:
                if article.source.source_name == "The Atlantic":
                    get_disqus_posts(article, current_task, total_count)
                    
                elif article.source.source_name == "Reddit":
                    get_reddit_posts(article, current_task, total_count)
                    
                elif article.source.source_name == "Wikipedia Talk Page":
                    get_wiki_talk_posts(article, current_task, total_count)
                    
                article.comment_num = article.comment_set.count()
                article.save()
                count_replies(article)
        else:
            return 'FAILURE-ARTICLE'
    else:
        return 'FAILURE-SOURCE'
        
        