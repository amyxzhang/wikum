from __future__ import absolute_import
from celery import shared_task, current_task
from celery.exceptions import Ignore
from website.import_data import get_source, get_article, get_disqus_posts,\
    get_reddit_posts, count_replies, get_wiki_talk_posts, get_decide_proposal_posts
from django.db import connection
from django.contrib.auth.models import User

@shared_task()
def import_article(url, owner):
    connection.close()

    source = get_source(url)

    if source:
        
        if owner == "None":
            user = None
        else:
            user = User.objects.get(username=owner)
        
        article = get_article(url, user, source, 0)
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

                elif article.source.source_name == "Decide Proposal":
                    get_decide_proposal_posts(article, current_task, total_count)
                    
                article.comment_num = article.comment_set.count()
                article.save()
                count_replies(article)
        else:
            return 'FAILURE-ARTICLE'
    else:
        return 'FAILURE-SOURCE'
        
        