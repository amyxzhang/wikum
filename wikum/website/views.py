from django.shortcuts import render
from django.http import HttpResponse
import json
from django.http import JsonResponse

from engine import *

from django.http import HttpResponse
from annoying.decorators import render_to
from django.http.response import HttpResponseBadRequest


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
    

@render_to('website/visualization.html')
def visualization(request):
    url = request.GET['article']
    article = Article.objects.get(url=url)
    return {'article': article,
            'source': article.source}


def recurse_up_post(post):
    post.json_flatten = ""
    post.save()
    
    parent = Comment.objects.filter(disqus_id=post.reply_to_disqus)
    if parent.count() > 0:
        recurse_up_post(parent[0])
    

def recurse_viz(posts):
    children = []
    hid_children = []
    pids = [post.disqus_id for post in posts]
    reps = Comment.objects.filter(reply_to_disqus__in=pids).select_related()
    for post in posts:
        if post.json_flatten == '':
        # if True:
            v1 = {'size': post.likes,
                  'd_id': post.id,
                  'author': post.author.username if not post.author.anonymous else 'Anonymous'
                  }
            if post.summary != '':
                v1['name'] = '<P><strong>Summary:</strong> ' + post.summary + '</p>'
            else:
                v1['name'] = post.text
            c1 = reps.filter(reply_to_disqus=post.disqus_id).order_by('-likes')
            if c1.count() == 0:
                vals = []
                hid = []
            else:
                vals, hid = recurse_viz(c1)
            v1['children'] = vals
            v1['hid'] = hid
            post.json_flatten = json.dumps(v1)
            post.save()
        else:
            v1 = json.loads(post.json_flatten)
        if not post.hidden:
            children.append(v1)
        else:
            hid_children.append(v1)
    return children, hid_children
        

def summarize_comment(request):
    try:
        user = request.user
        article_id = request.POST['article']
        a = Article.objects.get(id=article_id)
        id = request.POST['id']
        summary = request.POST['summary']
        
        c = Comment.objects.get(id=id)
        from_summary = c.summary
        c.summary = summary
        c.save()
            
        if request.user.is_authenticated():
            h = History.objects.create(user=request.user, 
                                       article=a,
                                       action='sum_comment',
                                       from_str=from_summary,
                                       to_str=summary,
                                       explanation='initial summary')
        else:
            h = History.objects.create(user=None, 
                                       article=a,
                                       action='sum_comment',
                                       from_str=from_summary,
                                       to_str=summary,
                                       explanation='initial summary')
        
        h.comments.add(c)

        recurse_up_post(c)
            
        return JsonResponse({})
        
    except Exception, e:
        print e
        return HttpResponseBadRequest()
                

def hide_comment(request):
    try:
        user = request.user
        article_id = request.POST['article']
        a = Article.objects.get(id=article_id)
        id = request.POST['id']
        explain = request.POST['comment']
        
        c = Comment.objects.get(id=id)
        
        if not c.hidden:
            c.hidden = True
            c.save()
            
            if request.user.is_authenticated():
                h = History.objects.create(user=request.user, 
                                           article=a,
                                           action='hide_comment',
                                           explanation=explain)
            else:
                h = History.objects.create(user=None, 
                                           article=a,
                                           action='hide_comment',
                                           explanation=explain)
            
            h.comments.add(c)
            
            parent = Comment.objects.filter(disqus_id=c.reply_to_disqus)
            if parent.count() > 0:
                recurse_up_post(parent[0])
            
            return JsonResponse({})
    except Exception, e:
        print e
        return HttpResponseBadRequest()
    
    
   
@render_to('website/history.html')
def history(request):
    article = request.GET['article']
    hist = History.objects.filter(article_id=article).order_by('-datetime').select_related()
    
    if hist.count() > 0:
        a = hist[0].article
    else :
        a = Article.objects.get(id=article)
    
    return {'history': hist,
            'article': a}
    

def viz_data(request):
    article_url = request.GET['article']
    
    a = Article.objects.get(url=article_url)
    
    val = {'name': '<P><a href="%s">Read the article in the %s</a></p>' % (a.url, a.source.source_name),
           'size': 400,
           'article': True}

    posts = a.comment_set.filter(reply_to_disqus=None).order_by('-likes')[0:20]
    val['children'], val['hid'] = recurse_viz(posts)
    return JsonResponse(val)
    
    
    
    
    
    