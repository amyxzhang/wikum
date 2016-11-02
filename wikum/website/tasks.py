from __future__ import absolute_import
from celery import shared_task, current_task
from wikum.website.import_data import get_source, get_article, get_disqus_posts,\
    get_reddit_posts, count_replies

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
        
        posts = article.comment_set.filter(reply_to_disqus=None)
        from website.views import recurse_viz
        recurse_viz(None, posts, False, article, False)

