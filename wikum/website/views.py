from django.shortcuts import render
from django.http import HttpResponse
import json
from django.http import JsonResponse

from engine import *

from django.http import HttpResponse
from annoying.decorators import render_to
from django.http.response import HttpResponseBadRequest
import random

import pickle
from math import floor

from django.views.decorators.csrf import csrf_exempt
from website.import_data import get_source, get_article

import urllib2

from wikimarkup import parse
import parse_helper
import math
import json
from django.db.models import Q
from django.contrib.auth.models import User

@render_to('website/index.html')
def index(request):
    user = request.user
    sort = request.GET.get('sort')

    if not sort and not user.is_anonymous():
        a_1 = list(Article.objects.filter(owner=user).order_by('-percent_complete').select_related())
        a_2 = list(Article.objects.filter(~Q(owner=user)).order_by('-percent_complete').select_related())
        a = a_1 + a_2
    else:
        if not sort:
            sort = '-percent_complete'
        a = Article.objects.all().order_by(sort).select_related()
    
    for art in a:
        art.url = re.sub('#', '%23', art.url)
        art.url = re.sub('&', '%26', art.url)

    resp = {'page': 'index',
            'articles': a,
            'user': user,
            'sort': sort}
    
    if 'task_id' in request.session.keys() and request.session['task_id']:
        task_id = request.session['task_id']
        resp['task_id'] = task_id

    return resp

@render_to('website/visualization.html')
def visualization(request):
    user = request.user
    owner = request.GET.get('owner', None)
    if not owner or owner == "None":
        owner = None
    else:
        owner = User.objects.get(username=owner)
    url = request.GET['article']
    num = int(request.GET.get('num', 0))
    article = Article.objects.filter(url=url, owner=owner)[num]
    return {'article': article,
            'user': user,
            'source': article.source}

@csrf_exempt    
def poll_status(request):
    data = 'Fail'
    if request.is_ajax():
        if 'task_id' in request.POST.keys() and request.POST['task_id']:
            from tasks import import_article
            task_id = request.POST['task_id']
            task = import_article.AsyncResult(task_id)
            
            data = {'result': task.result, 'state': task.state}
        else:
            data = {'result': 'No task_id in the request', 'state': 'ERROR'}
    else:
        data = {'result': 'This is not an ajax request', 'state': 'ERROR'}
    
    if task.state == 'SUCCESS' or task.state == 'FAILURE':
        request.session['task_id'] = None
        if task.state == 'SUCCESS':
            if task.get() == 'FAILURE-ARTICLE':
                data['result'] = "Can't find that article in the Disqus API."
                data['state'] = 'FAILURE'
            elif task.get() == 'FAILURE-SOURCE':
                data['result'] = "That source is not supported."
                data['state'] = 'FAILURE'
            else:
                if request.session['owner'] == "None":
                    owner = None
                else:
                    owner = User.objects.get(username=request.session['owner'])
                
                a = Article.objects.filter(url=request.session['url'], owner=owner)
                if a.exists():
                    comment_count = a[0].comment_set.count()
                    if comment_count == 0:
                        a.delete()
                        data['result'] = 'This article\'s comments cannot be ingested by Wikum because of API limitations'
                        data['state'] = 'FAILURE'
        request.session['url'] = None
            

    json_data = json.dumps(data)
    return HttpResponse(json_data, content_type='application/json')
    

def import_article(request):       
    data = 'Fail'
    if request.is_ajax():
        from tasks import import_article
        owner = request.GET['owner']
        url = request.GET['article']
        job = import_article.delay(url, owner)
        
        request.session['task_id'] = job.id
        request.session['url'] = url
        request.session['owner'] = owner
        data = job.id
    else:
        data = 'This is not an ajax request!'
  
    json_data = json.dumps(data)

    return HttpResponse(json_data, content_type='application/json')

    
def summary_page(request):
    owner = request.GET.get('owner', None)
    if not owner or owner == "None":
        owner = None
    else:
        owner = User.objects.get(username=owner)
    url = request.GET['article']
    next = request.GET.get('next')
    num = int(request.GET.get('num', 0))
    
    if not next:
        next = 0
    else:
        next = int(next)
        
    source = get_source(url) 
        
    article = get_article(url, owner, source, num)
    
    posts = get_posts(article)
    article.url = re.sub('&', '%26', article.url)
    article.url = re.sub('#', '%23', article.url)

    return {'article': article,
            'url': article.url,
            'source': article.source,
            'num': num,
            }
    
@render_to('website/summary.html')
def summary(request):
    return summary_page(request)

@render_to('website/summary1.html')
def summary1(request):
    return summary_page(request)

@render_to('website/summary2.html')
def summary2(request):
    return summary_page(request)

@render_to('website/summary3.html')
def summary3(request):
    return summary_page(request)

@render_to('website/summary4.html')
def summary4(request):
    return summary_page(request)
    
def summary_data(request):
    url = urllib2.unquote(request.GET['article'])
    
    owner = request.GET.get('owner', None)
    if not owner or owner == "None":
        owner = None
    else:
        owner = User.objects.get(username=owner)
        
    num = int(request.GET.get('num', 0))
    sort = request.GET.get('sort', 'id')
    
    
    a = Article.objects.filter(url=url, owner=owner)[num]
    
    next = request.GET.get('next')
    if not next:
        next = 0
    else:
        next = int(next)
        
    start = 25 * next
    end = (25 * next) + 25
    
    
    if sort == 'id':
        posts = a.comment_set.filter(reply_to_disqus=None, hidden=False).order_by('id')[start:end]
    else:
        posts = a.comment_set.filter(reply_to_disqus=None, hidden=False).order_by('-points')[start:end]
    
    
    val2 = {}
    val2['children'], val2['hid'], val2['replace'], num_subchildren = recurse_viz(None, posts, False, a, False)
    
    return JsonResponse({'posts': val2})
    

@render_to('website/subtree.html')
def subtree(request):
    url = request.GET['article']
    owner = request.GET.get('owner', None)
    if not owner or owner == "None":
        owner = None
    else:
        owner = User.objects.get(username=owner)
    num = int(request.GET.get('num', 0))
    
    article = Article.objects.filter(url=url, owner=owner)[num]
    return {'article': article,
            'source': article.source}

@render_to('website/cluster.html')
def cluster(request):
    url = request.GET['article']
    owner = request.GET.get('owner', None)
    if not owner or owner == "None":
        owner = None
    else:
        owner = User.objects.get(username=owner)
    num = int(request.GET.get('num', 0))
    
    article = Article.objects.filter(url=url, owner=owner)[num]
    
    return {'article': article,
            'source': article.source}

def recurse_up_post(post):
    post.json_flatten = ""
    post.save()
    
    parent = Comment.objects.filter(disqus_id=post.reply_to_disqus, article=post.article)
    if parent.count() > 0:
        recurse_up_post(parent[0])

def recurse_down_post(post):
    children = Comment.objects.filter(reply_to_disqus=post.disqus_id, article=post.article)
    for child in children:
        print child.id
        child.json_flatten = ""
        child.save()
        recurse_down_post(child)
        
def recurse_down_num_subtree(post):
    children = Comment.objects.filter(reply_to_disqus=post.disqus_id, article=post.article)
    for child in children:
        child.num_subchildren = 0
        child.json_flatten = ''
        child.save()
        recurse_down_num_subtree(child)

def recurse_viz(parent, posts, replaced, article, is_collapsed):
    children = []
    hid_children = []
    replace_children = []
    
    pids = [post.disqus_id for post in posts]
    
    if replaced:
        num_subtree_children = 0
    else:
        num_subtree_children = len(pids)
    
    reps = Comment.objects.filter(reply_to_disqus__in=pids, article=article).select_related()
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
                
            v1 = {'size': post.points,
                  'd_id': post.id,
                  'parent': parent.id if parent else None,
                  'author': author,
                  'replace_node': post.is_replacement,
                  'collapsed': is_collapsed,
                  'tags': [(tag.text, tag.color) for tag in post.tags.all()]
                  }

            if 'https://en.wikipedia.org/wiki/' in article.url:
                v1['name'] = parse(post.text)
                v1['wikitext'] = post.text
                
                if post.summary.strip() == '':
                    v1['summary'] = ''
                else:
                    v1['summary'] = parse(post.summary)
                
                v1['sumwiki'] = post.summary
                    
                if post.extra_summary.strip() == '':
                    v1['extra_summary'] = ''
                else:
                    v1['summary'] = parse(post.extra_summary)
                
                v1['extrasumwiki'] = post.extra_summary
                
            else:
                v1['name'] = post.text
                v1['summary'] = post.summary
                v1['extra_summary'] = post.extra_summary
                
            
            
            c1 = reps.filter(reply_to_disqus=post.disqus_id).order_by('-points')
            if c1.count() == 0:
                vals = []
                hid = []
                rep = []
                num_subchildren = 0
            else:
                replace_future = replaced or post.is_replacement
                vals, hid, rep, num_subchildren = recurse_viz(post, c1, replace_future, article, is_collapsed or post.is_replacement)
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
        
        a.summary_num = a.summary_num + 1
        a.percent_complete = count_article(a)
        
        a.save()
        
        if 'wikipedia.org' in a.url:
            res = {}
            if top_summary.strip() != '':
                res['top_summary'] = parse(top_summary)
            else:
                res['top_summary'] = ''
            
            res['top_summary_wiki'] = top_summary
            
            if bottom_summary.strip() != '':
                res['bottom_summary'] = parse(bottom_summary)
            else:
                res['bottom_summary'] = ''
            
            res['bottom_summary_wiki'] = bottom_summary
                
            return JsonResponse(res)
        else:
            return JsonResponse({'top_summary': top_summary,
                                 'bottom_summary': bottom_summary})
        
        
    except Exception, e:
        print e
        return HttpResponseBadRequest()
           
           
def delete_comment(post, article):
    parent = Comment.objects.filter(disqus_id=post.reply_to_disqus, article=post.article)
    delete_comment_recurse(post, article)
    
    if parent.count() > 0:
        recurse_up_post(parent[0])
        

def delete_comment_recurse(post, article):
    children = Comment.objects.filter(reply_to_disqus=post.disqus_id, article=post.article)
    for child in children:
        delete_comment_recurse(child, article)
    post.delete()
       
        
def summarize_selected(request):
    try:
        article_id = request.POST['article']
        a = Article.objects.get(id=article_id)
        ids = request.POST.getlist('ids[]')
        children_ids = request.POST.getlist('children[]')
        children_ids = [int(x) for x in children_ids]
        child_id = request.POST['child']
        
        delete_nodes = request.POST.getlist('delete_nodes[]')
        
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
                                             points=child.points,
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
            
                
        for node in delete_nodes:
            delete_node(node)
        
        
        recurse_up_post(new_comment)
        
        recurse_down_num_subtree(new_comment)
        
        make_vector(new_comment, a)
        
        a.summary_num = a.summary_num + 1
        a.percent_complete = count_article(a)
        
        a.save()
        
        
        if 'wikipedia.org' in a.url:
            res = {'d_id': new_comment.id}
            if top_summary.strip() != '':
                res['top_summary'] = parse(top_summary)
            else:
                res['top_summary'] = ''
            
            res['top_summary_wiki'] = top_summary
            
            if bottom_summary.strip() != '':
                res['bottom_summary'] = parse(bottom_summary)
            else:
                res['bottom_summary'] = ''
            
            res['bottom_summary_wiki'] = bottom_summary
                
            return JsonResponse(res)
        else:
            return JsonResponse({'d_id': new_comment.id,
                                 'top_summary': top_summary,
                                 'bottom_summary': bottom_summary})
        
    except Exception, e:
        print e
        return HttpResponseBadRequest()  
   
def delete_node(did):
    try:
    
        c = Comment.objects.get(id=did)
        article = c.article
        
        if c.is_replacement:
            parent = Comment.objects.filter(disqus_id=c.reply_to_disqus, article=article)
            
            if parent.count() > 0:
                parent_id = parent[0].disqus_id
            else:
                parent_id = None
            
            children = Comment.objects.filter(reply_to_disqus=c.disqus_id, article=article)
            
            for child in children:
                child.reply_to_disqus = parent_id
                child.json_flatten = ''
                child.save()
            
            c.delete()
        
            if parent.count() > 0:
                recurse_up_post(parent[0])
    except Exception, e:
        print e
    
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
                                                 points=c.points,
                                                 text_len=len(summary))
        
            c.reply_to_disqus = new_id
            c.save()

            h = History.objects.create(user=req_user, 
                                       article=a,
                                       action='sum_nodes',
                                       to_str=summary,
                                       explanation='initial summary of subtree')
            
            d_id = new_comment.id
            
            recurse_down_num_subtree(new_comment)
            
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
        
        
        
        for node in delete_nodes:
            delete_node(node)
        
        h.comments.add(c)
        recurse_up_post(c)
        
        
        make_vector(new_comment, a)
        
        a.summary_num = a.summary_num + 1
        a.percent_complete = count_article(a)
        
        a.save()
        
        if 'wikipedia.org' in a.url:
            res = {'d_id': d_id}
            if top_summary.strip() != '':
                res['top_summary'] = parse(top_summary)
            else:
                res['top_summary'] = ''
            
            res['top_summary_wiki'] = top_summary
            
            if bottom_summary.strip() != '':
                res['bottom_summary'] = parse(bottom_summary)
            else:
                res['bottom_summary'] = ''
            
            res['bottom_summary_wiki'] = bottom_summary
                
            return JsonResponse(res)
        else:
            return JsonResponse({'d_id': d_id,
                                 'top_summary': top_summary,
                                 'bottom_summary': bottom_summary})
        
    except Exception, e:
        print e
        
        import traceback
        print traceback.format_exc()
        
        return HttpResponseBadRequest()  

def tag_comments(request):
    try:
        article_id = request.POST['article']
        a = Article.objects.get(id=article_id)
        req_user = request.user if request.user.is_authenticated() else None
        
        ids = request.POST.getlist('ids[]')
        tag = request.POST['tag']
        
        
        t, created = Tag.objects.get_or_create(article=a, text=tag.lower())
        if created:
            r = lambda: random.randint(0, 255)
            color = '%02X%02X%02X' % (r(), r(), r())
            t.color = color
            t.save()
        else:
            color = t.color
        
        comments = Comment.objects.filter(id__in=ids, hidden=False)
        
        affected_comms = [];
        
        for comment in comments:
            tag_exists = comment.tags.filter(text=t.text)
            if tag_exists.count() == 0:
                comment.tags.add(t)
                affected_comms.append(comment)

            
        h = History.objects.create(user=req_user, 
                                   article=a,
                                   action='tag_comments',
                                   explanation='Add tag %s to comments' % t.text)
            
        for com in affected_comms:
            recurse_up_post(com)
            
        if len(affected_comms) > 0:
            return JsonResponse({'color': color})
        else:
            return JsonResponse({})
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
                
                parent = Comment.objects.filter(disqus_id=c.reply_to_disqus, article=a)
                if parent.count() > 0:
                    recurse_up_post(parent[0])
            
            a.comment_num = a.comment_num - affected
            a.percent_complete = count_article(a)
        
            a.save()
            
            
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
           
           
def auto_summarize_comment(request):
    
    from sumy.nlp.stemmers import Stemmer
    #from sumy.utils import get_stop_words
    from sumy.parsers.html import HtmlParser
    from sumy.nlp.tokenizers import Tokenizer
    #from sumy.summarizers.lsa import LsaSummarizer as Summarizer
    #from sumy.summarizers.text_rank import TextRankSummarizer as Summarizer
    from sumy.summarizers.lex_rank import LexRankSummarizer as Summarizer
         
    stemmer = Stemmer("english")
    summarizer = Summarizer(stemmer)
    
    comment_ids = request.POST.getlist('d_ids[]')
    
    sent_list = []
    
    for comment_id in comment_ids:
        comment = Comment.objects.get(id=comment_id)
        text = comment.text
        
        text = re.sub('<br>', ' ', text)
        text = re.sub('<BR>', ' ', text)
        
        parser = HtmlParser.from_string(text, '', Tokenizer("english"))
        
        num_sents = request.GET.get('num_sents', None)
        if not num_sents:
            all_sents = parser.tokenize_sentences(text)
            num_sents = floor(float(len(all_sents))/3.0)
        
        sents = summarizer(parser.document, num_sents)
         
        
        for sent in sents:
            sent_list.append(sent._text)
     
    return JsonResponse({"sents": sent_list})
     
     
def tag_comment(request):
    try:
        article_id = request.POST['article']
        a = Article.objects.get(id=article_id)
        id = request.POST['id']
        tag = request.POST['tag']
        req_user = request.user if request.user.is_authenticated() else None
        
        comment = Comment.objects.get(id=id)
        
        
        t, created = Tag.objects.get_or_create(article=a, text=tag.lower())
        if created:
            r = lambda: random.randint(0, 255)
            color = '%02X%02X%02X' % (r(), r(), r())
            t.color = color
            t.save()
        else:
            color = t.color
        
        affected= False
        
        tag_exists = comment.tags.filter(text=t.text)
        if tag_exists.count() == 0:
            comment.tags.add(t)
            affected = True
            
        if affected:
            h = History.objects.create(user=req_user, 
                                       article=a,
                                       action='tag_comment',
                                       explanation="Add tag %s to a comment" % t.text)
            
            h.comments.add(comment)
            
            recurse_up_post(comment)
                
            
        if affected:
            return JsonResponse({'color': color})
        else:
            return JsonResponse()
    except Exception, e:
        print e
        return HttpResponseBadRequest()

def delete_comment_summary(request):
    try:
        article_id = request.POST['article']
        article = Article.objects.get(id=article_id)
        comment_id = request.POST['id']
        explain = request.POST['comment']
        req_user = request.user if request.user.is_authenticated() else None

        comment = Comment.objects.get(id=comment_id)
        if not comment.is_replacement:
            comment.summary = ""
            comment.save()
            recurse_up_post(comment)
            h = History.objects.create(user=req_user,
                                       article=article,
                                       action='delete_comment_summary',
                                       explanation=explain)
            h.comments.add(comment)
            
            article.percent_complete = count_article(article)
            
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
        
            recurse_down_post(comment)
            
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
            
            parent = Comment.objects.filter(disqus_id=c.reply_to_disqus, article=a)
            if parent.count() > 0:
                recurse_up_post(parent[0])
                
            
            a.comment_num = a.comment_num - 1
            a.percent_complete = count_article(a)
        
            a.save()
            
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
            reps = Comment.objects.filter(reply_to_disqus=reply.disqus_id, article=reply.article)
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

        replies = Comment.objects.filter(reply_to_disqus=c.disqus_id, article=a)
        
        affected = recurse_down_hidden(replies, 0)
        
        if affected > 0:
            h = History.objects.create(user=req_user, 
                                       article=a,
                                       action='hide_replies',
                                       explanation=explain)
            
            replies = Comment.objects.filter(reply_to_disqus=c.disqus_id, article=a)
            for reply in replies:
                h.comments.add(reply)
            
            recurse_up_post(c)
            
            ids = [reply.id for reply in replies]
            
            a.comment_num = a.comment_num - affected
            a.percent_complete = count_article(a)
        
            a.save()
            
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
    
def tags(request):
    article_url = request.GET['article']
    owner = request.GET.get('owner', None)
    if not owner or owner == "None":
        owner = None
    else:
        owner = User.objects.get(username=owner)
    num = int(request.GET.get('num', 0))
    
    a = Article.objects.filter(url=article_url, owner=owner)[num]
    
    tags = list(a.tag_set.all().values_list('text', flat=True))
    
    json_data = json.dumps(tags)
    
    return HttpResponse(json_data, content_type='application/json')

def determine_is_collapsed(post, article):
    parent = Comment.objects.filter(disqus_id=post.reply_to_disqus, article=article)
    if parent.count() > 0:
        if parent[0].is_replacement:
            return True
        else:
            return determine_is_collapsed(parent[0], article)
    return False

def viz_data(request):
    article_url = request.GET['article']
    owner = request.GET.get('owner', None)
    if not owner or owner == "None":
        owner = None
    else:
        owner = User.objects.get(username=owner)
    sort = request.GET.get('sort')
    next = request.GET.get('next')
    filter = request.GET.get('filter', '')
    
    if not next:
        next = 0
    else:
        next = int(next)
        
    start = 25 * next
    end = (25 * next) + 25
    
    num = int(request.GET.get('num', 0))
    
    a = Article.objects.filter(url=article_url, owner=owner)[num]
    
    val = {'name': '<P><a href="%s">Read the article in the %s</a></p>' % (a.url, a.source.source_name),
           'size': 400,
           'article': True}


    if filter != '':
        
        if sort == 'id':
            posts = a.comment_set.filter(hidden=False, tags__text=filter).order_by('id')[start:end]
        elif sort == 'likes':
            posts = a.comment_set.filter(hidden=False, tags__text=filter).order_by('-points')[start:end]
        elif sort == "replies":
            posts = a.comment_set.filter(hidden=False, tags__text=filter).order_by('-num_replies')[start:end]
        elif sort == "long":
            posts = a.comment_set.filter(hidden=False, tags__text=filter).order_by('-text_len')[start:end]
        elif sort == "short":
            posts = a.comment_set.filter(hidden=False, tags__text=filter).order_by('text_len')[start:end]
        elif sort == 'newest':
            posts = a.comment_set.filter(hidden=False, tags__text=filter).order_by('-created_at')[start:end]
        elif sort == 'oldest':
            posts = a.comment_set.filter(hidden=False, tags__text=filter).order_by('created_at')[start:end]    
        
        val['children'] = []
        val['hid'] = []
        val['replace'] = []
        for post in posts:
            val2 = {}
            
            is_collapsed = determine_is_collapsed(post, a)
            
            val2['children'], val2['hid'], val2['replace'], num_subchildren = recurse_viz(None, [post], False, a, is_collapsed)
            
            val_child = recurse_get_parents(val2, post, a)
            val['children'].append(val_child['children'][0])
        
    else:
        if sort == 'id':
            posts = a.comment_set.filter(reply_to_disqus=None, hidden=False).order_by('id')[start:end]
        elif sort == 'likes':
            posts = a.comment_set.filter(reply_to_disqus=None, hidden=False).order_by('-points')[start:end]
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
                
        val['children'], val['hid'], val['replace'], num_subchildren = recurse_viz(None, posts, False, a, False)
    return JsonResponse(val)
    
def cluster_data(request):
    
    #from sklearn.cluster import KMeans
    from sklearn.cluster.k_means_ import MiniBatchKMeans
    from sklearn.metrics.pairwise import euclidean_distances
    import numpy as np
    
    article_url = request.GET['article']
    
    owner = request.GET.get('owner', None)
    if not owner or owner == "None":
        owner = None
    else:
        owner = User.objects.get(username=owner)
    
    cluster_size = int(request.GET.get('size'))
    num = int(request.GET.get('num', 0))
    
    a = Article.objects.filter(url=article_url, owner=owner)[num]
    
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
    
    val['children'], val['hid'], val['replace'], num_subchildren = recurse_viz(None, posts_cluster, False, a, False)
    
    return JsonResponse(val)
    
    
def subtree_data(request):
    article_url = request.GET['article']
    sort = request.GET.get('sort', None)
    next = request.GET.get('next', None)
    owner = request.GET.get('owner', None)
    if not owner or owner == "None":
        owner = None
    else:
        owner = User.objects.get(username=owner)
    
    comment_id = request.GET.get('comment_id', None)
    
    num = int(request.GET.get('num', 0))
    
    a = Article.objects.filter(url=article_url, owner=owner)[num]

    least = 2
    most = 6
    
    if not next:
        next = 0
    else:
        next = int(next)
    
    
    if comment_id:
        posts = Comment.objects.filter(id=comment_id)
    else:
        if sort == 'id':
            posts = a.comment_set.filter(hidden=False, num_subchildren__gt=least, num_subchildren__lt=most).order_by('id')
        elif sort == 'likes':
            posts = a.comment_set.filter(hidden=False, num_subchildren__gt=least, num_subchildren__lt=most).order_by('-points')
        elif sort == "replies":
            posts = a.comment_set.filter(hidden=False, num_subchildren__gt=least, num_subchildren__lt=most).order_by('-num_replies')
        elif sort == "long":
            posts = a.comment_set.filter(hidden=False, num_subchildren__gt=least, num_subchildren__lt=most).order_by('-text_len')
        elif sort == "short":
            posts = a.comment_set.filter(hidden=False, num_subchildren__gt=least, num_subchildren__lt=most).order_by('text_len')
        elif sort == 'newest':
            posts = a.comment_set.filter(hidden=False, num_subchildren__gt=least, num_subchildren__lt=most).order_by('-created_at')
        elif sort == 'oldest':
            posts = a.comment_set.filter(hidden=False, num_subchildren__gt=least, num_subchildren__lt=most).order_by('created_at')
        else:
            posts_all = a.comment_set.filter(hidden=False, num_subchildren__gt=least, num_subchildren__lt=most)
            count = posts_all.count()
            next = random.randint(0,count-1)
            posts = a.comment_set.filter(hidden=False, num_subchildren__gt=least, num_subchildren__lt=most)     
            
        if posts.count() > next:
            posts = [posts[next]]
        else:
            posts = None

    if posts:
        val2 = {}
        
        is_collapsed = determine_is_collapsed(posts[0], a)
        
        val2['children'], val2['hid'], val2['replace'], num_subchildren = recurse_viz(None, posts, False, a, is_collapsed)
        
        val = recurse_get_parents(val2, posts[0], a)
        val['no_subtree'] = False
    else:
        val = {'no_subtree': True}
    
    return JsonResponse(val)
     
def recurse_get_parents(parent_dict, post, article):
    
    parent = Comment.objects.filter(disqus_id=post.reply_to_disqus, article=article)
    if parent:
        parent = parent[0]
        
        
        if parent.author:
            if parent.author.anonymous:
                author = "Anonymous"
            else:
                author = parent.author.username
        else:
            author = ""
                    
        parent_dict['size'] = parent.points
        parent_dict['d_id'] = parent.id
        parent_dict['author'] = author
        parent_dict['replace_node'] = parent.is_replacement
        parent_dict['parent_node'] = True
        parent_dict['summary'] = parent.summary
        parent_dict['extra_summary'] = parent.extra_summary
        parent_dict['tags'] = [(tag.text, tag.color) for tag in parent.tags.all()]
            
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
    
    

def recurse_get_parents_stop(parent_dict, post, article, stop_id):
    
    parent = Comment.objects.filter(disqus_id=post.reply_to_disqus, article=article)
    if parent and parent[0].id != stop_id:
        parent = parent[0]
        
        
        if parent.author:
            if parent.author.anonymous:
                author = "Anonymous"
            else:
                author = parent.author.username
        else:
            author = ""
                    
        parent_dict['size'] = parent.points
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
        
        return recurse_get_parents_stop(new_dict, parent, article, stop_id)

    else:
        return parent_dict['children'][0]
    
                
        
        
        
    
                
    