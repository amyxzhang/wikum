from django.shortcuts import render
from django.http import HttpResponse
import json
from django.http import JsonResponse

from engine import *

from django.http import HttpResponse
from annoying.decorators import render_to
from django.http.response import HttpResponseBadRequest
import random

@render_to('website/index.html')
def index(request):
    a = Article.objects.all()
    return {'page': 'index',
            'articles': a}


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

@render_to('website/subtree.html')
def subtree(request):
    url = request.GET['article']
    article = Article.objects.get(url=url)
    return {'article': article,
            'source': article.source}

@render_to('website/cluster.html')
def cluster(request):
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

def recurse_down_post(post):
    children = Comment.objects.filter(reply_to_disqus=post.disqus_id)
    for child in children:
        child.json_flatten = ""
        child.save()
        recurse_down_post(child)
        
def recurse_down_num_subtree(post):
    children = Comment.objects.filter(reply_to_disqus=post.disqus_id)
    for child in children:
        child.num_subchildren = 0
        child.save()
        recurse_down_post(child)

def recurse_viz(parent, posts, replaced):
    children = []
    hid_children = []
    replace_children = []
    
    pids = [post.disqus_id for post in posts]
    
    if replaced:
        num_subtree_children = 0
    else:
        num_subtree_children = len(pids)
    
    reps = Comment.objects.filter(reply_to_disqus__in=pids).select_related()
    for post in posts:
        if post.json_flatten == '':
        #if True:
            if post.author:
                if post.author.anonymous:
                    author = "Anonymous"
                else:
                    author = post.author.username
            else:
                author = ""
                
            v1 = {'size': post.likes,
                  'd_id': post.id,
                  'author': author,
                  'replace_node': post.is_replacement
                  }
            
            if post.summary != '':
                v1['summary'] = post.summary
            else:
                v1['summary'] = '' 
                
            v1['name'] = post.text
            
            c1 = reps.filter(reply_to_disqus=post.disqus_id).order_by('-likes')
            if c1.count() == 0:
                vals = []
                hid = []
                rep = []
                num_subchildren = 0
            else:
                replace_future = replaced or post.is_replacement
                vals, hid, rep, num_subchildren = recurse_viz(post, c1, replace_future)
            v1['children'] = vals
            v1['hid'] = hid
            v1['replace'] = rep
            post.json_flatten = json.dumps(v1)
            if not post.is_replacement:
                post.num_subchildren = num_subchildren
            else:
                post.num_subchildren = 0
            post.save()
            if not post.is_replacement:
                num_subtree_children += num_subchildren
        else:
            v1 = json.loads(post.json_flatten)
        
        if post.hidden:
            hid_children.append(v1)
        elif parent and parent.is_replacement:
            replace_children.append(v1)
        else:
            children.append(v1)
            
    return children, hid_children, replace_children, num_subtree_children
        

def summarize_comment(request):
    try:
        article_id = request.POST['article']
        a = Article.objects.get(id=article_id)
        id = request.POST['id']
        summary = request.POST['comment']
        
        req_user = request.user if request.user.is_authenticated() else None
        
        c = Comment.objects.get(id=id)
        from_summary = c.summary
        c.summary = summary
        c.save()
        
        if from_summary != '':
            action = 'edit_sum'
            explanation = 'edit summary'
        else :
            action = 'sum_comment'
            explanation = 'initial summary'
            

        h = History.objects.create(user=req_user, 
                                   article=a,
                                   action=action,
                                   from_str=from_summary,
                                   to_str=summary,
                                   explanation=explanation)
        
        h.comments.add(c)
        recurse_up_post(c)
        return JsonResponse({})
        
    except Exception, e:
        print e
        return HttpResponseBadRequest()
           
def summarize_selected(request):
    try:
        article_id = request.POST['article']
        a = Article.objects.get(id=article_id)
        ids = request.POST.getlist('ids[]')
        children_ids = request.POST.getlist('children[]')
        children_ids = [int(x) for x in children_ids]
        child_id = request.POST['child']
        
        summary = request.POST['comment']
        
        req_user = request.user if request.user.is_authenticated() else None
        
        comments = Comment.objects.filter(id__in=ids)
        children = [c for c in comments if c.id in children_ids]
        child = Comment.objects.get(id=child_id)

        new_id = random_with_N_digits(10);
            
        new_comment = Comment.objects.create(article=a, 
                                             is_replacement=True, 
                                             reply_to_disqus=child.reply_to_disqus,
                                             summary=summary,
                                             disqus_id=new_id,
                                             likes=child.likes,
                                             text_len=len(summary))

        h = History.objects.create(user=req_user, 
                                   article=a,
                                   action='sum_selected',
                                   to_str=summary,
                                   explanation='initial summary of group of comments') 
       
        for c in children:
            c.reply_to_disqus = new_id
            c.save()
            
        for c in comments:
            h.comments.add(c)
        
        recurse_up_post(new_comment)
        
        recurse_down_num_subtree(new_comment)
        
        return JsonResponse({"d_id": new_comment.id})
        
    except Exception, e:
        print e
        return HttpResponseBadRequest()  
   
              

def summarize_comments(request):
    try:
        article_id = request.POST['article']
        a = Article.objects.get(id=article_id)
        id = request.POST['id']
        summary = request.POST['comment']
        
        req_user = request.user if request.user.is_authenticated() else None
        
        c = Comment.objects.get(id=id)
        
        if not c.is_replacement:
            new_id = random_with_N_digits(10);
            
            new_comment = Comment.objects.create(article=a, 
                                                 is_replacement=True, 
                                                 reply_to_disqus=c.reply_to_disqus,
                                                 summary=summary,
                                                 disqus_id=new_id,
                                                 likes=c.likes,
                                                 text_len=len(summary))
        
            c.reply_to_disqus = new_id
            c.save()

            h = History.objects.create(user=req_user, 
                                       article=a,
                                       action='sum_nodes',
                                       to_str=summary,
                                       explanation='initial summary of subtree')
            
            d_id = new_comment.id
            
        else:
            from_summary = c.summary
            c.summary = summary
            c.save()
            
            h = History.objects.create(user=req_user, 
                           article=a,
                           action='edit_sum_nodes',
                           from_str=from_summary,
                           to_str=summary,
                           explanation='edit summary of subtree')
            
            d_id = c.id
        
        
        h.comments.add(c)
        recurse_up_post(c)
        recurse_down_num_subtree(new_comment)
        
        return JsonResponse({"d_id": d_id})
        
    except Exception, e:
        print e
        return HttpResponseBadRequest()  

def hide_comments(request):
    try:
        article_id = request.POST['article']
        a = Article.objects.get(id=article_id)
        req_user = request.user if request.user.is_authenticated() else None
        
        ids = request.POST.getlist('ids[]')
        explain = request.POST['comment']
        
        affected = Comment.objects.filter(id__in=ids, hidden=False).update(hidden=True)
        
        if affected > 0:
            
            h = History.objects.create(user=req_user, 
                                       article=a,
                                       action='hide_comments',
                                       explanation=explain)
            
            for id in ids:
                c = Comment.objects.get(id=id)
                h.comments.add(c)
                
                parent = Comment.objects.filter(disqus_id=c.reply_to_disqus)
                if parent.count() > 0:
                    recurse_up_post(parent[0])
            
        return JsonResponse({})
    except Exception, e:
        print e
        return HttpResponseBadRequest()

def hide_comment(request):
    try:
        article_id = request.POST['article']
        a = Article.objects.get(id=article_id)
        id = request.POST['id']
        explain = request.POST['comment']
        req_user = request.user if request.user.is_authenticated() else None
        
        affected = Comment.objects.filter(id=id, hidden=False).update(hidden=True)
        
        if affected:
            h = History.objects.create(user=req_user, 
                                       article=a,
                                       action='hide_comment',
                                       explanation=explain)
            
            c = Comment.objects.get(id=id)
            h.comments.add(c)
            
            parent = Comment.objects.filter(disqus_id=c.reply_to_disqus)
            if parent.count() > 0:
                recurse_up_post(parent[0])
            
        return JsonResponse({})
    except Exception, e:
        print e
        return HttpResponseBadRequest()
    
def recurse_down_hidden(replies, count):
    for reply in replies:
        if not reply.hidden:
            reply.hidden = True
            reply.json_flatten = ''
            reply.save()
            count += 1
            reps = Comment.objects.filter(reply_to_disqus=reply.disqus_id)
            count = recurse_down_hidden(reps, count)
    return count
    
def hide_replies(request):
    try:
        article_id = request.POST['article']
        a = Article.objects.get(id=article_id)
        id = request.POST['id']
        explain = request.POST['comment']
        req_user = request.user if request.user.is_authenticated() else None
        
        c = Comment.objects.get(id=id)

        replies = Comment.objects.filter(reply_to_disqus=c.disqus_id)
        
        affected = recurse_down_hidden(replies, 0)
        
        if affected > 0:
            h = History.objects.create(user=req_user, 
                                       article=a,
                                       action='hide_replies',
                                       explanation=explain)
            
            replies = Comment.objects.filter(reply_to_disqus=c.disqus_id)
            for reply in replies:
                h.comments.add(reply)
            
            recurse_up_post(c)
            
            ids = [reply.id for reply in replies]
            
            return JsonResponse({'ids': ids})
        else:
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
    sort = request.GET.get('sort')
    next = request.GET.get('next')
    
    if not next:
        next = 0
    else:
        next = int(next)
        
    start = 20 * next
    end = (20 * next) + 20
    
    a = Article.objects.get(url=article_url)
    
    val = {'name': '<P><a href="%s">Read the article in the %s</a></p>' % (a.url, a.source.source_name),
           'size': 400,
           'article': True}

    if sort == 'likes':
        posts = a.comment_set.filter(reply_to_disqus=None, hidden=False).order_by('-likes')[start:end]
    elif sort == "replies":
        posts = a.comment_set.filter(reply_to_disqus=None, hidden=False).order_by('-num_replies')[start:end]
    elif sort == "long":
        posts = a.comment_set.filter(reply_to_disqus=None, hidden=False).order_by('-text_len')[start:end]
    elif sort == "short":
        posts = a.comment_set.filter(reply_to_disqus=None, hidden=False).order_by('text_len')[start:end]
    elif sort == 'newest':
        posts = a.comment_set.filter(reply_to_disqus=None, hidden=False).order_by('-created_at')[start:end]
    elif sort == 'oldest':
        posts = a.comment_set.filter(reply_to_disqus=None, hidden=False).order_by('created_at')[start:end]
            
    val['children'], val['hid'], val['replace'], num_subchildren = recurse_viz(None, posts, False)
    return JsonResponse(val)
    
def cluster_data(request):
    article_url = request.GET['article']
    next = request.GET.get('next')
    
    if not next:
        next = 0
    else:
        next = int(next)
    
    a = Article.objects.get(url=article_url)
    
    val = {'name': '<P><a href="%s">Read the article in the %s</a></p>' % (a.url, a.source.source_name),
           'size': 400,
           'article': True}
    
    posts = a.comment_set.filter(hidden=False, num_subchildren=0, reply_to_disqus=None)[(next*10):(next*10) + 10]
    
    val['children'], val['hid'], val['replace'], num_subchildren = recurse_viz(None, posts, False)
    
    return JsonResponse(val)
    
    
def subtree_data(request):
    article_url = request.GET['article']
    sort = request.GET.get('sort')
    next = request.GET.get('next')
    
    a = Article.objects.get(url=article_url)

    least = 1
    most = 7
    
    if not next:
        next = 0
    else:
        next = int(next)
    
    if sort == 'likes':
        posts = [a.comment_set.filter(hidden=False, num_subchildren__gt=least, num_subchildren__lt=most).order_by('-likes')[next]]
    elif sort == "replies":
        posts = [a.comment_set.filter(hidden=False, num_subchildren__gt=least, num_subchildren__lt=most).order_by('-num_replies')[next]]
    elif sort == "long":
        posts = [a.comment_set.filter(hidden=False, num_subchildren__gt=least, num_subchildren__lt=most).order_by('-text_len')[next]]
    elif sort == "short":
        posts = [a.comment_set.filter(hidden=False, num_subchildren__gt=least, num_subchildren__lt=most).order_by('text_len')[next]]
    elif sort == 'newest':
        posts = [a.comment_set.filter(hidden=False, num_subchildren__gt=least, num_subchildren__lt=most).order_by('-created_at')[next]]
    elif sort == 'oldest':
        posts = [a.comment_set.filter(hidden=False, num_subchildren__gt=least, num_subchildren__lt=most).order_by('created_at')[next]]
    else:
        posts = [a.comment_set.filter(hidden=False, num_subchildren__gt=least, num_subchildren__lt=most)[next]]       
    

    val2 = {}
    val2['children'], val2['hid'], val2['replace'], num_subchildren = recurse_viz(None, posts, False)
    
    val = recurse_get_parents(val2, posts[0], a)
    
    return JsonResponse(val)
     
def recurse_get_parents(parent_dict, post, article):
    
    parent = Comment.objects.filter(disqus_id=post.reply_to_disqus)
    if parent:
        parent = parent[0]
        
        
        if parent.author:
            if parent.author.anonymous:
                author = "Anonymous"
            else:
                author = parent.author.username
        else:
            author = ""
                    
        parent_dict['size'] = parent.likes
        parent_dict['d_id'] = parent.id
        parent_dict['author'] = author
        parent_dict['replace_node'] = parent.is_replacement
        parent_dict['parent_node'] = True
        

        if parent.summary != '':
            parent_dict['summary'] = parent.summary
        else:
            parent_dict['summary'] = '' 
            
        parent_dict['name'] = parent.text
        
        new_dict = {}
        
        new_dict['children'] = [parent_dict]
        new_dict['hid'] = []
        new_dict['replace'] = []
        
        return recurse_get_parents(new_dict, parent, article)

    else:
        parent_dict['name'] = '<P><a href="%s">Read the article in the %s</a></p>' % (article.url, article.source.source_name)
        parent_dict['size'] = 400
        parent_dict['article'] = True
        
        return parent_dict
    
    

   
                
        
        
        
    
                
    