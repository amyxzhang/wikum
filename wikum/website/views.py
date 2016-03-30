from django.shortcuts import render
from django.http import HttpResponse
import json
from django.http import JsonResponse

from engine import *

from sklearn.cluster import KMeans

from django.http import HttpResponse
from annoying.decorators import render_to
from django.http.response import HttpResponseBadRequest
import random
import numpy as np
import pickle
from math import floor
from sklearn.cluster.k_means_ import MiniBatchKMeans
from sklearn.metrics.pairwise import euclidean_distances

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
    
@render_to('website/summary.html')
def summary(request):
    url = request.GET['article']
    next = request.GET.get('next')
    if not next:
        next = 0
    else:
        next = int(next)
        
    article = Article.objects.get(url=url)
    
    
    return {'article': article,
            'source': article.source,
            'next': next+1,
            }
    
def summary_data(request):
    url = request.GET['article']
    a = Article.objects.get(url=url)
    
    next = request.GET.get('next')
    if not next:
        next = 0
    else:
        next = int(next)
    
    posts = a.comment_set.filter(reply_to_disqus=None, hidden=False).order_by('-likes')[next:next+1]
    val = {'posts': []}
    for post in posts:
        val['posts'].append(
                            {'text': post.text if post.summary == '' else post.summary,
                             'd_id': post.id
                             })
    
    
    return JsonResponse(val)

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
                  'replace_node': post.is_replacement,
                  'summary': post.summary,
                  'extra_summary': post.extra_summary
                  }

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
        
        top_summary, bottom_summary = get_summary(summary)
        
        req_user = request.user if request.user.is_authenticated() else None
        
        c = Comment.objects.get(id=id)
        from_summary = c.summary + '\n----------\n' + c.extra_summary
        c.summary = top_summary
        c.extra_summary = bottom_summary
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
        return JsonResponse({'top_summary': top_summary,
                             'bottom_summary': bottom_summary})
        
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
        
        
        delete_nodes = request.POST.getlist('delete_nodes[]')
        delete_sents = request.POST.get('delete_sents')
        
        delete_sents = json.loads(delete_sents)
        
        for node in delete_nodes:
            delete_node(node)
        
        for sent in delete_sents:
            delete_sent(sent[1], sent[0])
        
        
        summary = request.POST['comment']
        
        top_summary, bottom_summary = get_summary(summary)
        
        req_user = request.user if request.user.is_authenticated() else None
        
        comments = Comment.objects.filter(id__in=ids)
        children = [c for c in comments if c.id in children_ids]
        child = Comment.objects.get(id=child_id)

        new_id = random_with_N_digits(10);
            
        new_comment = Comment.objects.create(article=a, 
                                             is_replacement=True, 
                                             reply_to_disqus=child.reply_to_disqus,
                                             summary=top_summary,
                                             extra_summary=bottom_summary,
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
        
        make_vector(new_comment, a)
        
        return JsonResponse({'d_id': new_comment.id,
                             'top_summary': top_summary,
                             'bottom_summary': bottom_summary})
        
    except Exception, e:
        print e
        return HttpResponseBadRequest()  
   
def delete_node(did):
    
    c = Comment.objects.get(id=did)
    
    if c.is_replacement:
        parent = Comment.objects.filter(disqus_id=c.reply_to_disqus)
        
        if parent.count() > 0:
            parent_id = parent[0].disqus_id
        else:
            parent_id = None
        
        children = Comment.objects.filter(reply_to_disqus=c.disqus_id)
        
        for child in children:
            child.reply_to_disqus = parent_id
            child.json_flatten = ''
            child.save()
        
        c.delete()
    
        if parent.count() > 0:
            recurse_up_post(parent[0])

def delete_sent(sent, did):
    c = Comment.objects.get(id=did)
    summary = c.summary
    summary = summary.replace(sent, '')
    c.summary = summary.strip()
    c.save()
    
    recurse_up_post(c)
    
def get_summary(summary):
    
    summary_split = re.compile("([-=]){5,}").split(summary)
    top_summary = summary_split[0].strip()
    bottom_summary = ''
    
    if len(summary_split) > 1:
        bottom_summary = ' '.join(summary_split[2:]).strip()
        
    return top_summary, bottom_summary
    
    
def summarize_comments(request):
    try:
        article_id = request.POST['article']
        a = Article.objects.get(id=article_id)
        id = request.POST['id']
        summary = request.POST['comment']
        
        top_summary, bottom_summary = get_summary(summary)

        delete_nodes = request.POST.getlist('delete_nodes[]')
        delete_sents = request.POST.get('delete_sents')
        
        delete_sents = json.loads(delete_sents)
        
        for node in delete_nodes:
            delete_node(node)
        
        for sent in delete_sents:
            delete_sent(sent[1], sent[0])
        
        req_user = request.user if request.user.is_authenticated() else None
        
        c = Comment.objects.get(id=id)
        
        if not c.is_replacement:
            new_id = random_with_N_digits(10);
            
            new_comment = Comment.objects.create(article=a, 
                                                 is_replacement=True, 
                                                 reply_to_disqus=c.reply_to_disqus,
                                                 summary=top_summary,
                                                 extra_summary=bottom_summary,
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
            from_summary = c.summary + '\n----------\n' + c.extra_summary
            c.summary = top_summary
            c.extra_summary=bottom_summary
            c.save()
            
            h = History.objects.create(user=req_user, 
                           article=a,
                           action='edit_sum_nodes',
                           from_str=from_summary,
                           to_str=summary,
                           explanation='edit summary of subtree')
            
            d_id = c.id
            
            new_comment = c
        
        
        h.comments.add(c)
        recurse_up_post(c)
        recurse_down_num_subtree(new_comment)
        
        make_vector(new_comment, a)
        
        return JsonResponse({'d_id': d_id,
                             'top_summary': top_summary,
                             'bottom_summary': bottom_summary})
        
    except Exception, e:
        print e
        
        import traceback
        print traceback.format_exc()
        
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

def move_comments(request):
    try:
        new_parent_id = request.POST['new_parent']
        node_id = request.POST['node']
        
        req_user = request.user if request.user.is_authenticated() else None
        
        comment = Comment.objects.get(id=node_id)
        
        old_parent = None
        if comment.reply_to_disqus:
            old_parent = Comment.objects.get(disqus_id=comment.reply_to_disqus)
        
        article = comment.article
        
        new_parent_comment = Comment.objects.get(id=new_parent_id)
        
        comment.reply_to_disqus = new_parent_comment.disqus_id
        comment.save()
        
        h = History.objects.create(user=req_user, 
                                       article=article,
                                       action='move_comment',
                                       explanation='Move comment')

        h.comments.add(comment)
        if old_parent:
            h.comments.add(old_parent)

        recurse_up_post(new_parent_comment)
        
        if old_parent:
            recurse_up_post(old_parent)
        
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
        
        comment = Comment.objects.get(id=id)
        
        if comment.is_replacement:
            delete_node(comment.id)
            affected = False
        elif not comment.hidden:
            comment.hidden = True
            comment.save()
            affected = True
        else:
            affected = False
        
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
    hist = History.objects.filter(article_id=article).order_by('-datetime').select_related()[0:20]
    
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
    cluster_size = int(request.GET.get('size'))
    
    a = Article.objects.get(url=article_url)
    
    val = {'name': '<P><a href="%s">Read the article in the %s</a></p>' % (a.url, a.source.source_name),
           'size': 400,
           'article': True}
    
    posts = a.comment_set.filter(hidden=False, num_subchildren=0, reply_to_disqus=None)
    
    num_posts = posts.count()

    clust_size = int(round(((float(cluster_size) * (90 - 60)) / 100.0) + 60.0))

    clustval = int(round(float(num_posts)/100.0)) * clust_size
    
    posts_vectors = []
    for post in posts:
        try:
            posts_vectors.append(pickle.loads(post.vector).toarray()[0])
        except Exception, e:
            make_vector(post, a)
            posts_vectors.append(pickle.loads(post.vector).toarray()[0])
    
    num_clusters = num_posts - clustval
     
    km = MiniBatchKMeans(n_clusters=num_clusters)
     
    km.fit(posts_vectors)
     
    clusters = km.labels_.tolist()
    
    cluster_centers = km.cluster_centers_
    
    cluster_dict = {}
    for cluster in clusters:
        if cluster not in cluster_dict:
            cluster_dict[cluster] = 0
        cluster_dict[cluster] += 1
        
    count_dict = {}
    
    for cluster, num in cluster_dict.items():
        if num != 1:
            if num not in count_dict:
                count_dict[num] = []
            count_dict[num].append(cluster)
            
    counts_sorted = sorted(count_dict.keys())
    
    indice = int(round(((float(cluster_size) * (len(counts_sorted))) / 100.0)))
    if indice == 0:
        indice = 1
    
    indice = counts_sorted[indice-1]
    
    potential_clusters = count_dict[indice]
    
    vector_dict = {}
    
    for cluster, vector in zip(clusters, posts_vectors):
        if cluster in potential_clusters:
            if cluster not in vector_dict:
                vector_dict[cluster] = []
            vector_dict[cluster].append(vector)
    
    min_dist = 10000
    min_cluster = None
    
    for cluster, vectors in vector_dict.items():
        dist = np.mean(euclidean_distances(np.array(vectors), [cluster_centers[cluster]]))
        if dist < min_dist:
            min_dist = dist
            min_cluster = cluster

    posts_cluster = []
    
    for cluster, post in zip(clusters, posts):
        if cluster == min_cluster:
            posts_cluster.append(post)
    
    val['children'], val['hid'], val['replace'], num_subchildren = recurse_viz(None, posts_cluster, False)
    
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
     
     
def get_comments(request):
    try:
        comment_id = int(request.GET.get('comment'))
        
        c = Comment.objects.get(id=comment_id)
        
        val2 = {}
        val2['children'], val2['hid'], val2['replace'], num_subchildren = recurse_viz(None, [c], False)
        
        val = recurse_get_parents(val2, c, c.article)
        
        return JsonResponse(val)
        
    except Exception, e:
        print e
        return HttpResponseBadRequest()
        
     
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
        parent_dict['summary'] = parent.summary
        parent_dict['extra_summary'] = parent.extra_summary
            
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
    
    

   
                
        
        
        
    
                
    