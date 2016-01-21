from django.shortcuts import render

from engine import *

from django.http import HttpResponse
from annoying.decorators import render_to


@render_to('website/index.html')
def index(request):
    return {'page': 'index'}


@render_to('website/comments.html')
def comments(request):
    url = request.GET['article']
    source = get_source(url)    
    article = get_article(url, source)
    
    posts = get_posts(article)
    
    threads = {}
    
    for post in posts:
        c = Comment.objects.filter(reply_to_disqus=post.disqus_id)
        threads[post] = []
        for i in c:
            s_thread = {}
            t = Comment.objects.filter(reply_to_disqus=i.disqus_id)
            s_thread[i] = []
            for u in t:
                s_thread[i].append(u)
            threads[post].append(s_thread)
            
    print threads
    
    return {'article': article,
            'source': source,
            'posts': threads,
            'page': 'comments'}
    
    