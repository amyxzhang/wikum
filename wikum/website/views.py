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
    
    threads = []
    
    for post in posts:
        replies = []
        c = Comment.objects.filter(reply_to_disqus=post.disqus_id).order_by('-likes')
        for i in c:
            replies2 = []
            t = Comment.objects.filter(reply_to_disqus=i.disqus_id).order_by('-likes')
            for u in t:
                replies3 = []
                v = Comment.objects.filter(reply_to_disqus=u.disqus_id).order_by('-likes')
                for x in v:
                    replies4 = []
                    a = Comment.objects.filter(reply_to_disqus=x.disqus_id).order_by('-likes')
                    for b in a:
                        replies5 = []
                        d = Comment.objects.filter(reply_to_disqus=b.disqus_id).order_by('-likes')
                        for e in d:
                            replies6 = []
                            f = Comment.objects.filter(reply_to_disqus=e.disqus_id).order_by('-likes')
                            for g in f:
                                replies7 = []
                                h = Comment.objects.filter(reply_to_disqus=g.disqus_id).order_by('-likes')
                                for i in h:
                                    replies7.append(i)
                                
                                post_info7 = (g, replies7)
                                replies6.append(post_info7)
                            
                            post_info6 = (e, replies6)
                            replies5.append(post_info6)
                            
                        post_info5 = (b, replies5)
                        replies4.append(post_info5)
                        
                    post_info4 = (x, replies4)
                    replies3.append(post_info4)
                    
                post_info3 = (u, replies3)
                replies2.append(post_info3)
                
            post_info2 = (i, replies2)
            replies.append(post_info2)
        
        post_info = (post, replies)
        threads.append(post_info)
            
    
    return {'article': article,
            'source': source,
            'posts': threads,
            'page': 'comments'}
    
    