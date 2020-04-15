from __future__ import print_function
from __future__ import absolute_import
from future import standard_library
standard_library.install_aliases()
from builtins import zip
from builtins import str
from builtins import range
from django.shortcuts import render, redirect
from django.http import HttpResponse
import json
from django.http import JsonResponse

from .engine import *

from django.http import HttpResponse
from annoying.decorators import render_to
from django.http.response import HttpResponseBadRequest
import random

import pickle
from math import floor

from django.views.decorators.csrf import csrf_exempt
from website.import_data import get_source, get_article

import urllib.request, urllib.error, urllib.parse

from wikimarkup.parser import Parser
from . import parse_helper
import math
import json
from django.db.models import Q, Avg
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from website.models import Article, Source, CommentRating, CommentAuthor, Permissions, Notification, WikumUser

parser = Parser()

def index(request):
    user = request.user

    if user.is_authenticated:
        a = Article.objects.filter(owner=user).order_by('-last_updated').select_related()
        for art in a:
            art.url = re.sub('#', '%23', art.url)
            art.url = re.sub('&', '%26', art.url)
            
        b = set()
        p = Permissions.objects.filter(user=user).select_related('article')
        for i in p:
            if i.article not in a:
                i.article.url = re.sub('#', '%23', i.article.url)
                i.article.url = re.sub('&', '%26', i.article.url)
                b.add(i.article)
        
        b = list(b)
        b = sorted(b, key=lambda x: x.last_updated, reverse=True)
        
        resp = {'articles': a,
                'shared_articles': b,
                'user': user
                }
        return render(request, 'website/home.html', resp)
    else:
        b = Article.objects.all().order_by('-last_updated')[0:4]
        a = Article.objects.all().order_by('-percent_complete')[0:4]
        
        for art in a:
            art.url = re.sub('#', '%23', art.url)
            art.url = re.sub('&', '%26', art.url)
            
        for art in b:
            art.url = re.sub('#', '%23', art.url)
            art.url = re.sub('&', '%26', art.url)
        
        resp = {'recent_articles': b,
                'finished_articles': a,
                'user': user}
        
        if 'task_id' in list(request.session.keys()) and request.session['task_id']:
            task_id = request.session['task_id']
            resp['task_id'] = task_id

        return render(request, 'website/index.html', resp)


@render_to('website/index.html')
def about(request):
    user = request.user
    b = Article.objects.all().order_by('-created_at')[0:4]
    a = Article.objects.all().order_by('-percent_complete')[0:4]
    resp = {'recent_articles': b,
            'finished_articles': a,
            'user': user}
    
    for art in a:
        art.url = re.sub('#', '%23', art.url)
        art.url = re.sub('&', '%26', art.url)
        
    for art in b:
        art.url = re.sub('#', '%23', art.url)
        art.url = re.sub('&', '%26', art.url)
    
    if 'task_id' in list(request.session.keys()) and request.session['task_id']:
        task_id = request.session['task_id']
        resp['task_id'] = task_id
    return resp

@render_to('website/explore_public.html')
def explore_public(request):
    user = request.user
    sort = request.GET.get('sort', None)
    
    if not sort and not user.is_anonymous:
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

    resp = {'articles': a,
            'user': user,
            'sort': sort}

    return resp

@login_required
@render_to('website/notifications_page.html')
def notifications_page(request):
    user = request.user
    notifs = Notification.objects.filter(recipient=user).order_by('-date_created').select_related()
    unseen_nots = notifs.filter(seen=False)
    for n in unseen_nots:
        n.seen = True
        n.save()

    return {'notifications': notifs,
            'unseen_nots': unseen_nots,
            'user': user}

@render_to('website/unauthorized.html')
def unauthorized(request):
    return {}

@render_to('website/visualization_upvote.html')
def visualization_upvote(request):
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


def visualization_flag(request):
    user = request.user
    owner = request.GET.get('owner', None)
    if not owner or owner == "None":
        owner = None
    else:
        owner = User.objects.get(username=owner)
        
    article_id = int(request.GET['id'])
    article = Article.objects.get(id=article_id)

    permission = None
    if user.is_authenticated:
        permission = Permissions.objects.filter(user=user, article=article)
        if permission.exists():
            permission = permission[0]
        
    if article.access_mode < 4 or (user.is_authenticated and permission and permission.access_level < 4) or user == owner:

        if owner != None and user.is_authenticated and owner == user:
            all_perms = Permissions.objects.filter(article=article).select_related()
        else:
            all_perms = []
            
        context = {'article': article,
                'user': user,
                'source': article.source,
                'permission': permission,
                'all_perms': all_perms}
        
        return render(request, 'website/visualization_flags.html', context)
    else:
        response = redirect('/unauthorized')
        return response


@render_to('website/visualization.html')
def visualization(request):
    user = request.user
    owner = request.GET.get('owner', None)
    if not owner or owner == "None":
        owner = None
    else:
        owner = User.objects.get(username=owner)
    article_id = int(request.GET['id'])
    article = Article.objects.get(id=article_id)
    return {'article': article,
            'user': user,
            'source': article.source}

@csrf_exempt    
def poll_status(request):
    data = 'Fail'
    if request.is_ajax():
        if 'task_id' in list(request.POST.keys()) and request.POST['task_id']:
            from .tasks import import_article
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
                
                a = Article.objects.filter(url=request.session['url']+ "/.json", owner=owner)
                if a.exists():
                    data['id'] = a[0].id
                    comment_count = a[0].comment_set.count()
                    
#                 urlparsed = urllib.parse.unquote(request.session['url'])
#                 articles_list = Article.objects.filter(url=urlparsed, owner=owner)
#                 if len(articles_list):
#                     a = articles_list[0]
#                     data['id'] = a.id
#                     comment_count = a.comment_set.count()

                    if comment_count == 0:
                        a.delete()
                        data['result'] = 'This article\'s comments cannot be ingested by Wikum because of API limitations'
                        data['state'] = 'FAILURE'
                else:
                    a = Article.objects.filter(url=request.session['url'], owner=owner)
                    if a.exists():
                        data['id'] = a[0].id
                        comment_count = a[0].comment_set.count()
                        if comment_count == 0:
                            a.delete()
                            data['result'] = 'This article\'s comments cannot be ingested by Wikum because of API limitations'
                            data['state'] = 'FAILURE'
        request.session['url'] = None

    json_data = json.dumps(data)
    return HttpResponse(json_data, content_type='application/json')

def print_pointers(c, article):
    print("=========PRINT POINTERS=========")
    if c.is_replacement:
        print("This node's text:", c.summary)
    else:
        print("This node's text:", c.text)
    first_child = Comment.objects.filter(disqus_id=c.first_child, article=article)
    if first_child.count() > 0:
        first_child = first_child[0]
    else:
        first_child = None
    last_child = Comment.objects.filter(disqus_id=c.last_child, article=article)
    if last_child.count() > 0:
        last_child = last_child[0]
    else:
        last_child = None
    sibling_prev = Comment.objects.filter(disqus_id=c.sibling_prev, article=article)
    if sibling_prev.count() > 0:
        sibling_prev = sibling_prev[0]
    else:
        sibling_prev = None
    sibling_next = Comment.objects.filter(disqus_id=c.sibling_next, article=article)
    if sibling_next.count() > 0:
        sibling_next = sibling_next[0]
    else:
        sibling_next = None
    if first_child:
        text = first_child.summary if first_child.is_replacement else first_child.text
        print("This node's first child:", text)
    if last_child:
        text = last_child.summary if last_child.is_replacement else last_child.text
        print("This node's last child:", text)
    if sibling_prev:
        text = sibling_prev.summary if sibling_prev.is_replacement else sibling_prev.text
        print("This node's previous sibling:", text)
    if sibling_next:
        text = sibling_next.summary if sibling_next.is_replacement else sibling_next.text
        print("This node's next sibling:", text)

    parent = Comment.objects.filter(disqus_id=c.reply_to_disqus, article=article)
    if parent.count() > 0:
        parent = parent[0]
    else:
        parent = article
    print("Parent:", parent)
    first_child = Comment.objects.filter(disqus_id=parent.first_child, article=article)
    if first_child.count() > 0:
        first_child = first_child[0]
    else:
        first_child = None
    last_child = Comment.objects.filter(disqus_id=parent.last_child, article=article)
    if last_child.count() > 0:
        last_child = last_child[0]
    else:
        last_child = None
    if first_child:
        text = first_child.summary if first_child.is_replacement else first_child.text
        print("This node's parent's first child:", text)
    if last_child:
        text = last_child.summary if last_child.is_replacement else last_child.text
        print("This node's parent's last child:", text)

    print("=========END PRINT POINTERS=========")

def author_info(request):
    username = request.GET.get('username', None)
    url = request.GET.get('article', None)
    url = re.sub('%26', '&', url)
    url = re.sub('%23', '#', url)
    owner = request.GET.get('owner', None)
    
    if not owner or owner == "None":
        owner = None
    else:
        owner = User.objects.get(username=owner)
    
    num = int(request.GET.get('num', 0))
    
    
    author_info = {}
    if username and url:
        a = Article.objects.filter(url=url, owner=owner)[num]
        if 'en.wikipedia' in a.url:
            author = CommentAuthor.objects.filter(username=username, is_wikipedia=True)
            if author.exists():
                author = author[0]
                if author.joined_at:
                    author_info['registration'] = author.joined_at.strftime('%Y-%m-%d %H:%M')
                author_info['edit_count'] = author.edit_count
                author_info['groups'] = author.groups
                author_info['comment_count'] = a.comment_set.filter(author=author).count()
        else:
            author = CommentAuthor.objects.filter(username=username, is_wikipedia=False)
            if author.exists():
                author = author[0]
                if author.joined_at:
                    author_info['registration'] = author.joined_at.strftime('%Y-%m-%d %H:%M')
                author_info['comment_count'] = a.comment_set.filter(author=author).count()
                
    json_data = json.dumps(author_info)
    return HttpResponse(json_data, content_type='application/json')

def import_article(request):       
    data = 'Fail'
    if request.is_ajax():
        from .tasks import import_article
        owner = request.GET.get('owner', 'None')
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

def create_wikum(request):
    data = 'Fail'
    if request.is_ajax():
        owner = request.GET.get('owner', 'None')
        if owner == "None":
            owner = None
        else:
            owner = User.objects.get(username=owner)
        title = request.GET['article']
        new_id = random_with_N_digits(10)
        source,_ = Source.objects.get_or_create(source_name="new_wikum")
        article, created = Article.objects.get_or_create(disqus_id=new_id, title=title, source=source, url=title, owner=owner)
        article.last_updated = datetime.datetime.now()
        article.save()

        request.session['task_id'] = new_id
        request.session['url'] = str(title)
        request.session['owner'] = str(owner)
        data = article.id
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
    article_id = int(request.GET['id'])
    article = Article.objects.get(id=article_id)
    next_page = request.GET.get('next')
    num = int(request.GET.get('num', 0))
    
    if not next_page:
        next_page = 0
    else:
        next_page = int(next_page)
        
    source = article.source
    
    posts = get_posts(article)
    article.url = re.sub('&', '%26', article.url)
    article.url = re.sub('#', '%23', article.url)

    return {'article': article,
            'source': article.source}
    
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
    owner = request.GET.get('owner', None)
    if not owner or owner == "None" or owner == "null":
        owner = None
    else:
        owner = User.objects.get(username=owner)

    sort = request.GET.get('sort', 'default')
    article_id = int(request.GET['id'])
    a = Article.objects.get(id=article_id)
    
    next_page = request.GET.get('next')
    if not next_page:
        next_page = 0
    else:
        next_page = int(next_page)
        
    start = 30 * next_page
    end = (30 * next_page) + 30
    
    if sort == 'id':
        posts = a.comment_set.filter(reply_to_disqus=None, hidden=False).order_by("import_order")[start:end]
    elif sort == 'default':
        top_comments = a.comment_set.filter(reply_to_disqus=None, hidden=False)
        posts = []
        current_node = next((c for c in top_comments if c.disqus_id == a.first_child), None)
        if current_node:
            posts.append(current_node)
            while current_node and current_node.sibling_next:
                current_node = next((c for c in top_comments if c.disqus_id == current_node.sibling_next), None)
                if current_node:
                    posts.append(current_node)
        posts = posts[start:end]
    else:
        posts = a.comment_set.filter(reply_to_disqus=None, hidden=False).order_by("-points")[start:end]
    
    
    val2 = {}
    val2['children'], val2['hid'], val2['replace'], num_subchildren = recurse_viz(None, posts, False, a, False)
    
    return JsonResponse({'posts': val2})
    

@render_to('website/subtree.html')
def subtree(request):
    owner = request.GET.get('owner', None)
    if not owner or owner == "None":
        owner = None
    else:
        owner = User.objects.get(username=owner)
    article_id = int(request.GET['id'])
    article = Article.objects.get(id=article_id)
    return {'article': article,
            'source': article.source}


@render_to('website/history.html')
def history(request):
    owner = request.GET.get('owner', None)
    if not owner or owner == "None":
        owner = None
    else:
        owner = User.objects.get(username=owner)
    
    article_id = int(request.GET['id'])
    article = Article.objects.get(id=article_id)
    
    hist = History.objects.filter(article_id=article.id).order_by('-datetime').select_related()
    
    return {'history': hist,
            'article': article,
            'source': article.source}

@render_to('website/cluster.html')
def cluster(request):
    owner = request.GET.get('owner', None)
    if not owner or owner == "None":
        owner = None
    else:
        owner = User.objects.get(username=owner)
    
    article_id = int(request.GET['id'])
    article = Article.objects.get(id=article_id)
    
    return {'article': article,
            'source': article.source}

def recurse_up_post(post):
    post.json_flatten = ""
    post.save()
    
    parent = Comment.objects.filter(disqus_id=post.reply_to_disqus, article=post.article)
    if parent.count() > 0:
        recurse_up_post(parent[0])
        
def recurse_down_num_subtree(post):
    children = Comment.objects.filter(reply_to_disqus=post.disqus_id, article=post.article)
    for child in children:
        child.num_subchildren = 0
        child.json_flatten = ''
        child.save()
        recurse_down_num_subtree(child)

def mark_children_summarized(post):
    post.summarized = True
    children = Comment.objects.filter(reply_to_disqus=post.disqus_id, article=post.article)
    for child in children:
        child.summarized = True
        child.save()
        mark_children_summarized(child)
    
def clean_parse(text):
    text = parser.parse(text).strip()

    text = re.sub('<dl>', '', text)
    text = re.sub('</dl>', '', text)
    text = re.sub('<dd>', '', text)
    text = re.sub('</dd>', '', text)
    text = re.sub('<ul>', '', text)
    text = re.sub('</ul>', '', text)
    text = re.sub('<li>', '', text)
    text = re.sub('</li>', '', text)

    sp = text.split('\n\n')

    if len(sp) > 1:
        v = ''
        for i in sp:
            v += '<p>' + i + '</p>'
        text = v

    text = text.strip()
    if text.startswith('<p>') and text.endswith('</p>'):
        return text
    else:
        return '<p>' + text + '</p>'

def recurse_viz(parent, posts, replaced, article, is_collapsed):
    children = []
    hid_children = []
    replace_children = []
    
    pids = [post.disqus_id for post in posts]
    
    if replaced:
        num_subtree_children = 0
    else:
        num_subtree_children = len(pids)
    
    # Filters for comments in the article that are children of posts
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
                  'last_updated': json.dumps(post.created_at, indent=4, sort_keys=True, default=str) if post.created_at else '',
                  'parent': parent.id if parent else None,
                  'author': author,
                  'replace_node': post.is_replacement,
                  'collapsed': is_collapsed,
                  'summarized': post.summarized,
                  'tags': [(tag.text, tag.color) for tag in post.tags.all()],
                  }
            v1['is_locked'] = post.is_locked
            v1['rating'] = []
            for rating in post.commentrating_set.all():
                v = []
                if rating.neutral_rating:
                    v.append(rating.neutral_rating)
                if rating.coverage_rating:
                    v.append(rating.coverage_rating)
                if rating.quality_rating:
                    v.append(rating.quality_rating)
            
            ratings = post.commentrating_set.all()
            if len(ratings) > 0:
                v1['rating_flag'] = {
                             'neutral': ratings[len(ratings)-1].neutral_rating,
                             'coverage':  ratings[len(ratings)-1].coverage_rating,
                             'quality': ratings[len(ratings)-1].quality_rating,
                             }

            if 'https://en.wikipedia.org/wiki/' in article.url:
                
                v1['name'] = clean_parse(post.text)
                v1['wikitext'] = post.text
                if post.summary.strip() == '':
                    v1['summary'] = ''
                else:
                    v1['summary'] = clean_parse(post.summary)
                v1['sumwiki'] = post.summary
                if post.extra_summary.strip() == '':
                    v1['extra_summary'] = ''
                else:
                    v1['summary'] = clean_parse(post.extra_summary)
                
                v1['extrasumwiki'] = post.extra_summary
                
            else:
                v1['name'] = post.text
                v1['summary'] = post.summary
                v1['extra_summary'] = post.extra_summary
            if post.summary.strip() != '':
                hist = post.history_set.filter(action__contains='sum')
                editors = set()
                for h in hist:
                    if h.user:
                        editors.add(h.user.username)
                    else:
                        editors.add('Anonymous')
                v1['editors'] = list(editors)
            
            # Filters for comments that are replies/children to post
            c1 = reps.filter(reply_to_disqus=post.disqus_id)
            sorted_posts = []
            current_node = next((c for c in c1 if c.disqus_id == post.first_child), None)
            if current_node:
                sorted_posts.append(current_node)
                while current_node and current_node.sibling_next:
                    current_node = next((c for c in c1 if c.disqus_id == current_node.sibling_next), None)
                    if current_node:
                        sorted_posts.append(current_node)
            if len(sorted_posts) == 0:
                vals = []
                hid = []
                rep = []
                num_subchildren = 0
            else:
                # recurse_viz on the replies/children to the post
                replace_future = replaced or post.is_replacement
                vals, hid, rep, num_subchildren = recurse_viz(post, sorted_posts, replace_future, article, is_collapsed or post.is_replacement)
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


def get_summary(summary):
    
    summary_split = re.compile("([-=]){5,}").split(summary)
    top_summary = summary_split[0].strip()
    bottom_summary = ''
    
    if len(summary_split) > 1:
        bottom_summary = ' '.join(summary_split[2:]).strip()
    return top_summary, bottom_summary


def suggested_tags(request):
    try:
        article_id = request.POST['article']
        a = Article.objects.get(id=article_id)
        req_user = request.user if request.user.is_authenticated else None
        
        id = request.POST.get('id', None)
        if not id:
            ids = request.POST.getlist('ids[]')
            comments = Comment.objects.filter(id__in=ids, hidden=False)
            comment = comments[0]
        else:
            comment = Comment.objects.get(id=id)
        
        suggested_tags = comment.suggested_tags.all()
            
        resp = {"suggested_tags": []}
        for tag in suggested_tags:
            resp['suggested_tags'].append({
                                         'color': tag.color,
                                         'tag': tag.text}) 
        
    
        return JsonResponse(resp)
    except Exception as e:
        print(e)
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
            if 'https://en.wikipedia.org/wiki/' in comment.article.url:
                text = parser.parse(sent._text)
                sent = ''
                in_tag = False
                for c in text:
                    if c == '<':
                        if len(sent.strip()) > 0:
                            if sent.strip() != 'Comment':
                                sent_list.append(sent.strip())
                        sent = ''
                        in_tag = True
                    elif c == '>':
                        in_tag = False
                    else:
                        if not in_tag:
                            sent += c
            else:
                sent_list.append(sent._text)
     
    return JsonResponse({"sents": sent_list})
     
def log_data(request):
    return JsonResponse({})
    

def rate_summary(request):
    try:
        req_user = request.user if request.user.is_authenticated else None
        id = request.POST['id']
        neutral_rating = request.POST['neu']
        coverage_rating = request.POST['cov']
        quality_rating = request.POST['qual']
        to_summarize_dids = request.POST.getlist('to_summarize_dids[]')
        to_unsummarize_dids = request.POST.getlist('to_unsummarize_dids[]')
        summarize_dids = Comment.objects.filter(id__in=to_summarize_dids)
        for c in summarize_dids:
            c.summarized = True
            c.save()
            recurse_up_post(c)
        unsummarize_dids = Comment.objects.filter(id__in=to_unsummarize_dids)
        for c in unsummarize_dids:
            c.summarized = False
            c.save()
            recurse_up_post(c)
    
        comment = Comment.objects.get(id=id)
    
        if comment.summary != '':
    
            r,_ = CommentRating.objects.get_or_create(comment=comment)
            r.user = req_user
            r.neutral_rating = neutral_rating
            r.coverage_rating = coverage_rating
            r.quality_rating = quality_rating
            r.save()

            article = comment.article
            words_shown = count_words_shown(article)
            percent_complete = count_article(article)
            h = History.objects.create(user=req_user, 
                                       article=article,
                                       action='rate_comment',
                                       words_shown=words_shown,
                                       current_percent_complete=percent_complete,
                                       explanation="Add Rating %s (neutral), %s (coverage), %s (quality) to a comment" % (neutral_rating,
                                                                                                                          coverage_rating,
                                                                                                                          quality_rating)
                                       )
            
            h.comments.add(comment)
            
            
            article.percent_complete = percent_complete
            article.words_shown = words_shown
            article.last_updated = datetime.datetime.now()
            article.save()
            
            recurse_up_post(comment)
       
            return JsonResponse({'success': True});
        return JsonResponse({'success': False});
    except Exception as e:
        print(e)
        return HttpResponseBadRequest()


def upvote_summary(request):
    try:
        req_user = request.user if request.user.is_authenticated else None
        if req_user:
            
            id = request.POST['id']
            comment = Comment.objects.get(id=id)
            
            change_vote = False
            rate, created = CommentRating.objects.get_or_create(user=req_user, comment=comment)
            if not created and rate.neutral_rating == 1:
                change_vote = True
                
            rate.neutral_rating = 5
            rate.coverage_rating = 5
            rate.quality_rating = 5
            rate.save()
            
            
            avg_rating = {'neutral': comment.commentrating_set.filter(neutral_rating__isnull=False).aggregate(Avg('neutral_rating')),
                          'coverage':  comment.commentrating_set.filter(coverage_rating__isnull=False).aggregate(Avg('coverage_rating')),
                          'quality': comment.commentrating_set.filter(quality_rating__isnull=False).aggregate(Avg('quality_rating'))
                          }
            
            list_rating = []
            for rating in comment.commentrating_set.all():
                v = []
                if rating.neutral_rating:
                    v.append(rating.neutral_rating)
                if rating.coverage_rating:
                    v.append(rating.coverage_rating)
                if rating.quality_rating:
                    v.append(rating.quality_rating)
                    
                list_rating.append(sum(v)/3.0)
        
            if created:
                h = History.objects.create(user=req_user, 
                                           article=comment.article,
                                           action='upvote_comment')
                h.comments.add(comment)
            
            if created or change_vote:
                recurse_up_post(comment)
            
            return JsonResponse({'success': True,
                                 'created': created,
                                 'change_vote': change_vote,
                                 'avg_rating': avg_rating,
                                 'rating': list_rating
                                 })
        else:
            return JsonResponse({'success': False})
    except Exception as e:
        print(e)
        return HttpResponseBadRequest()
    
def downvote_summary(request):
    try:
        req_user = request.user if request.user.is_authenticated else None
        if req_user:
            
            id = request.POST['id']
            comment = Comment.objects.get(id=id)
            
            change_vote = False
            rate, created = CommentRating.objects.get_or_create(user=req_user, comment=comment)
            if not created and rate.neutral_rating == 5:
                change_vote = True
                
            rate.neutral_rating = 1
            rate.coverage_rating = 1
            rate.quality_rating = 1
            rate.save()
            
            avg_rating = {'neutral': comment.commentrating_set.filter(neutral_rating__isnull=False).aggregate(Avg('neutral_rating')),
                          'coverage':  comment.commentrating_set.filter(coverage_rating__isnull=False).aggregate(Avg('coverage_rating')),
                          'quality': comment.commentrating_set.filter(quality_rating__isnull=False).aggregate(Avg('quality_rating'))
                          }
            
            list_rating = []
            for rating in comment.commentrating_set.all():
                v = []
                if rating.neutral_rating:
                    v.append(rating.neutral_rating)
                if rating.coverage_rating:
                    v.append(rating.coverage_rating)
                if rating.quality_rating:
                    v.append(rating.quality_rating)
                    
                list_rating.append(sum(v)/3.0)
        
            if created:
                h = History.objects.create(user=req_user, 
                                           article=comment.article,
                                           action='downvote_comment')
                h.comments.add(comment)
            
            if created or change_vote:
                recurse_up_post(comment)
                
            return JsonResponse({'success': True,
                                 'created': created,
                                 'change_vote': change_vote,
                                 'avg_rating': avg_rating,
                                 'rating': list_rating
                                 })
        else:
            return JsonResponse({'success': False})
    except Exception as e:
        print(e)
        return HttpResponseBadRequest()


def tags(request):
    owner = request.GET.get('owner', None)
    if not owner or owner == "None":
        owner = None
    else:
        owner = User.objects.get(username=owner)
    
    article_id = int(request.GET['id'])
    a = Article.objects.get(id=article_id)
    
    tags = list(a.tag_set.all().values_list('text', flat=True))
    
    json_data = json.dumps(tags)
    
    return HttpResponse(json_data, content_type='application/json')
    
def get_stats(request):
    owner = request.GET.get('owner', None)
    if not owner or owner == "None":
        owner = None
    else:
        owner = User.objects.get(username=owner)
    
    article_id = int(request.GET['id'])
    a = Article.objects.get(id=article_id)
    
    authors = {}
    tags = {}
    
    for c in Comment.objects.filter(article=a).select_related('author'):
        if c.author and c.author.username:
            if c.author.username not in authors:
                authors[c.author.username] = 0
            authors[c.author.username] += 1
        for t in c.tags.all():
            if t.text not in tags:
                tags[t.text] = 0
            tags[t.text] += 1
            
    author_list = sorted(list(authors.items()), key=lambda x: x[1], reverse=True)
    if len(author_list) > 5:
        author_list = author_list[:5]
        
    tag_list = sorted(list(tags.items()), key=lambda x: x[1], reverse=True)
    if len(tag_list) > 5:
        tag_list = tag_list[:5]
    
    data = {'authors': author_list,
            'tags': tag_list}
    
    json_data = json.dumps(data)
    
    return HttpResponse(json_data, content_type='application/json')
 
    
def tags_and_authors(request):
    owner = request.GET.get('owner', None)
    if not owner or owner == "None":
        owner = None
    else:
        owner = User.objects.get(username=owner)
    
    article_id = int(request.GET['id'])
    a = Article.objects.get(id=article_id)
    
    tags = list(a.tag_set.all().values_list('text', flat=True))
    for i in range(len(tags)):
        tags[i] = "Tag: " + tags[i]
    
    authors = set()
    
    for c in Comment.objects.filter(article=a).select_related('author'):
        if c.author and c.author.username:
            authors.add('User: ' + c.author.username)
    authors = list(authors)
    
    tags = authors + tags
    
    json_data = json.dumps(tags)
    
    return HttpResponse(json_data, content_type='application/json')

def add_global_perm(request):
    try:
        user = request.user
        article_id = request.POST['article']
        a = Article.objects.get(id=article_id)
        
        owner = request.POST.get('owner', None)
        if not owner or owner == "None":
            owner = None
        else:
            owner = User.objects.get(username=owner)

        if user == owner:
            access = request.POST.get('access', None).strip()
            if access == "Publicly Editable and Commentable":
                a.access_mode = 0
            elif access == "Publicly Commentable":
                a.access_mode = 1
            elif access == "Publicly Editable":
                a.access_mode = 2
            elif access == "Publicly Viewable":
                a.access_mode = 3
            elif access == "Private Access":
                a.access_mode = 4
            a.save()
        
        return JsonResponse({})
    except Exception as e:
        print(e)
        return HttpResponseBadRequest()

def add_user_perm(request):
    try:
        data = {'created': None}
        user = request.user
        
        article_id = request.POST['article']
        a = Article.objects.get(id=article_id)
        
        owner = request.POST.get('owner', None)
        if not owner or owner == "None":
            owner = None
        else:
            owner = User.objects.get(username=owner)
        
        if user == owner:
            access = request.POST.get('access', None).strip()
            access_user = request.POST.get('username', None)
            delete_perm = request.POST.get('delete_perm', False)
           
            a_user = User.objects.get(username=access_user)
            
            if delete_perm == 'true':
                Permissions.objects.filter(article=a, user=a_user).delete()
            elif access:
                if access == "Full Edit and Comment Access":
                    p, created = Permissions.objects.get_or_create(article=a, user=a_user)
                    p.access_level = 0
                    p.save()
                    data['created'] = created
                elif access == "Comment Access":
                    p, created = Permissions.objects.get_or_create(article=a, user=a_user)
                    p.access_level = 1
                    p.save()
                    data['created'] = created
                elif access == "Edit Access":
                    p, created = Permissions.objects.get_or_create(article=a, user=a_user)
                    p.access_level = 2
                    p.save()
                    data['created'] = created
                elif access == "View Access":
                    p, created = Permissions.objects.get_or_create(article=a, user=a_user)
                    p.access_level = 3
                    p.save()
                    data['created'] = created
        
        return JsonResponse(data)
    except Exception as e:
        print(e)
        return HttpResponseBadRequest()

def users(request):
    users = list(User.objects.all().values_list('username', flat=True))
    json_data = json.dumps(users)
    
    return HttpResponse(json_data, content_type='application/json')

def determine_is_collapsed(post, article):
    parent = Comment.objects.filter(hidden=False, disqus_id=post.reply_to_disqus, article=article)
    if parent.count() > 0:
        if parent[0] == post:
            return False
        if parent[0].is_replacement and post.summarized:
            return True
        else:
            return determine_is_collapsed(parent[0], article)
    return False

def remove_self_loops(comments, article):
    no_loops = []
    for c in comments:
        parent = Comment.objects.filter(disqus_id=c.reply_to_disqus, article=article)
        if parent.count() > 0:
            p = parent[0]
            hasLoop = False
            if p == c:
                print("Has self-loop at comment:", c)
                hasLoop = True
            else:
                # remove comments that are children of self loops
                current = p
                while current != None:
                    parent = Comment.objects.filter(disqus_id=current.reply_to_disqus, article=article)
                    if parent.count() > 0:
                        if parent[0] == current:
                            print("Has self-loop at comment:", current)
                            hasLoop = True
                            break
                        current = parent[0]
                    else:
                        current = None
                        break
            if hasLoop == False:
                no_loops.append(c)
        else:
            no_loops.append(c)
    return no_loops

def mark_comments_read(request):
    try:
        if request.user.is_anonymous:
            return JsonResponse({})
        else:
            current_user = request.user.wikumuser
            comments_read = request.POST.getlist('ids[]')
            read_list = current_user.comments_read.split(',')
            current_user.comments_read = ','.join(list(set(read_list + comments_read)))
            current_user.save()
            resp = {"comments_read": comments_read}
            return JsonResponse(resp)
    except Exception as e:
        print(e)
        return HttpResponseBadRequest()

def subscribe_comment_replies(request):
    try:
        if request.user.is_anonymous:
            return JsonResponse({})
        else:
            current_user = request.user.wikumuser
            comment_id = request.POST.get('id', None)
            subscribe_list = []
            if current_user.subscribe_replies != '':
                subscribe_list = current_user.subscribe_replies.split(',')
            # add separator at beginning and end to help search: User.objects.filter(wikumuser__subscribe_replies__contains=',' + did + ',')
            subscribe_list.append(comment_id)
            list_string = ',' + ','.join(list(set(subscribe_list))) + ','
            current_user.subscribe_replies = list_string
            current_user.save()
            resp = {"comment_sub_replies": comment_id}
            return JsonResponse(resp)
    except Exception as e:
        print(e)
        return HttpResponseBadRequest()

def unsubscribe_comment_replies(request):
    try:
        if request.user.is_anonymous:
            return JsonResponse({})
        else:
            current_user = request.user.wikumuser
            comment_id = request.POST.get('id', None)
            subscribe_list = []
            if current_user.subscribe_replies != '':
                subscribe_list = current_user.subscribe_replies.split(',')
            # add separator at beginning and end to help search: User.objects.filter(wikumuser__subscribe_replies__contains=',' + did + ',')
            if comment_id in subscribe_list:
                subscribe_list.remove(comment_id)
            list_string = ',' + ','.join(list(set(subscribe_list))) + ','
            current_user.subscribe_replies = list_string
            current_user.save()
            resp = {"comment_unsub_replies": comment_id}
            return JsonResponse(resp)
    except Exception as e:
        print(e)
        return HttpResponseBadRequest()

def subscribe_comment_edit(request):
    try:
        if request.user.is_anonymous:
            return JsonResponse({})
        else:
            current_user = request.user.wikumuser
            comment_id = request.POST.get('id', None)
            subscribe_list = []
            if current_user.subscribe_edit != '':
                subscribe_list = current_user.subscribe_edit.split(',')
            # add separator at beginning and end to help search: User.objects.filter(wikumuser__subscribe_edit__contains=',' + did + ',')
            subscribe_list.append(comment_id)
            list_string = ',' + ','.join(list(set(subscribe_list))) + ','
            current_user.subscribe_edit = list_string
            current_user.save()
            resp = {"comment_sub_edit": comment_id}
            return JsonResponse(resp)
    except Exception as e:
        print(e)
        return HttpResponseBadRequest()

def unsubscribe_comment_edit(request):
    try:
        if request.user.is_anonymous:
            return JsonResponse({})
        else:
            current_user = request.user.wikumuser
            comment_id = request.POST.get('id', None)
            subscribe_list = []
            if current_user.subscribe_edit != '':
                subscribe_list = current_user.subscribe_edit.split(',')
            # add separator at beginning and end to help search: User.objects.filter(wikumuser__subscribe_edit__contains=',' + did + ',')
            if comment_id in subscribe_list:
                subscribe_list.remove(comment_id)
            list_string = ',' + ','.join(list(set(subscribe_list))) + ','
            current_user.subscribe_edit = list_string
            current_user.save()
            resp = {"comment_unsub_edit": comment_id}
            return JsonResponse(resp)
    except Exception as e:
        print(e)
        return HttpResponseBadRequest()

def viz_data(request):
    owner = request.GET.get('owner', None)
    if not owner or owner == "None":
        owner = None
    else:
        owner = User.objects.get(username=owner)
    sort = request.GET.get('sort')
    next_page = request.GET.get('next')
    filter = request.GET.get('filter', '')

    if not sort:
        sort = 'default'
    
    if not next_page:
        next_page = 0
    else:
        next_page = int(next_page)
        
    start = 30 * next_page
    end = (30 * next_page) + 30
    
    article_id = int(request.GET['id'])
    a = Article.objects.get(id=article_id)

    all_ids = a.comment_set.values_list('id', flat=True).all()
    if request.user.is_anonymous:
        comments_read = 'all'
        sub_edits = []
        sub_replies = []
    else:
        current_user = request.user.wikumuser
        read_list_string = current_user.comments_read
        comments_read = [c for c in read_list_string.split(',') if c != '' and int(c) in all_ids]
        if len(comments_read) == 0:
            # first time coming to the page, mark everything as read
            comments_read = [str(c) for c in all_ids]
            current_user.comments_read = read_list_string + ',' + ','.join(comments_read)
            current_user.save()
        if current_user.subscribe_replies == '':
            sub_replies = []
        else:
            sub_replies = [c for c in current_user.subscribe_replies.split(',') if c != '' and int(c) in all_ids]
        if current_user.subscribe_edit == '':
            sub_edits = []
        else:
            sub_edits = [c for c in current_user.subscribe_edit.split(',') if c != '' and int(c) in all_ids]

    
    val = {'name': '<P><a href="%s">Read the article in the %s</a></p>' % (a.url, a.source.source_name),
           'size': 400,
           'article': True,
           'drag_locked': a.drag_locked,
           'comments_read': comments_read,
           'sub_edits': sub_edits,
           'sub_replies': sub_replies}


    if filter != '':
        if filter.startswith("Tag: "):
            filter = filter[5:]
            if sort == 'default' or sort == 'id':
                posts = a.comment_set.filter(hidden=False, tags__text=filter).order_by('import_order')
            elif sort == 'likes':
                posts = a.comment_set.filter(hidden=False, tags__text=filter).order_by('-points')
            elif sort == "replies":
                posts = a.comment_set.filter(hidden=False, tags__text=filter).order_by('-num_replies')
            elif sort == "long":
                posts = a.comment_set.filter(hidden=False, tags__text=filter).order_by('-text_len')
            elif sort == "short":
                posts = a.comment_set.filter(hidden=False, tags__text=filter).order_by('text_len')
            elif sort == 'newest':
                posts = a.comment_set.filter(hidden=False, tags__text=filter).order_by('-created_at')
            elif sort == 'oldest':
                posts = a.comment_set.filter(hidden=False, tags__text=filter).order_by('created_at') 
        elif filter.startswith("User: "):
            filter = filter[6:]
            if sort == 'default' or sort == 'id':
                posts = a.comment_set.filter(hidden=False, author__username=filter).order_by('import_order')
            elif sort == 'likes':
                posts = a.comment_set.filter(hidden=False, author__username=filter).order_by('-points')
            elif sort == "replies":
                posts = a.comment_set.filter(hidden=False, author__username=filter).order_by('-num_replies')
            elif sort == "long":
                posts = a.comment_set.filter(hidden=False, author__username=filter).order_by('-text_len')
            elif sort == "short":
                posts = a.comment_set.filter(hidden=False, author__username=filter).order_by('text_len')
            elif sort == 'newest':
                posts = a.comment_set.filter(hidden=False, author__username=filter).order_by('-created_at')
            elif sort == 'oldest':
                posts = a.comment_set.filter(hidden=False, author__username=filter).order_by('created_at') 
        else:
            if sort == 'default' or sort == 'id':
                posts = a.comment_set.filter(hidden=False, text__icontains=filter).order_by('import_order')
            elif sort == 'likes':
                posts = a.comment_set.filter(hidden=False, text__icontains=filter).order_by('-points')
            elif sort == "replies":
                posts = a.comment_set.filter(hidden=False, text__icontains=filter).order_by('-num_replies')
            elif sort == "long":
                posts = a.comment_set.filter(hidden=False, text__icontains=filter).order_by('-text_len')
            elif sort == "short":
                posts = a.comment_set.filter(hidden=False, text__icontains=filter).order_by('text_len')
            elif sort == 'newest':
                posts = a.comment_set.filter(hidden=False, text__icontains=filter).order_by('-created_at')
            elif sort == 'oldest':
                posts = a.comment_set.filter(hidden=False, text__icontains=filter).order_by('created_at') 

            
        val['children'] = []
        val['hid'] = []
        val['replace'] = []

        if posts != None:
            posts = remove_self_loops(posts, a)
        posts = posts[start:end]
        for post in posts:
            val2 = {}
            
            is_collapsed = determine_is_collapsed(post, a)

            val2['children'], val2['hid'], val2['replace'], num_subchildren = recurse_viz(None, [post], False, a, is_collapsed)
            
            val_child = recurse_get_parents(val2, post, a)
            val['children'].append(val_child['children'][0])
        
    else:
        if sort == 'default':
            top_comments = a.comment_set.filter(reply_to_disqus=None)
            posts = []
            current_node = next((c for c in top_comments if c.disqus_id == a.first_child), None)
            if current_node:
                posts.append(current_node)
                while current_node and current_node.sibling_next:
                    current_node = next((c for c in top_comments if c.disqus_id == current_node.sibling_next), None)
                    if current_node:
                        posts.append(current_node)
        elif sort == 'id':
            posts = a.comment_set.filter(reply_to_disqus=None).order_by('import_order')
        elif sort == 'likes':
            posts = a.comment_set.filter(reply_to_disqus=None).order_by('-points')
        elif sort == "replies":
            posts = a.comment_set.filter(reply_to_disqus=None).order_by('-num_replies')
        elif sort == "long":
            posts = a.comment_set.filter(reply_to_disqus=None).order_by('-text_len')
        elif sort == "short":
            posts = a.comment_set.filter(reply_to_disqus=None).order_by('text_len')
        elif sort == 'newest':
            posts = a.comment_set.filter(reply_to_disqus=None).order_by('-created_at')
        elif sort == 'oldest':
            posts = a.comment_set.filter(reply_to_disqus=None).order_by('created_at')

        if posts != None:
            posts = remove_self_loops(posts, a)
        posts = posts[start:end]
        val['children'], val['hid'], val['replace'], num_subchildren = recurse_viz(None, posts, False, a, False)
    return JsonResponse(val)

def sort_to_order_by(sort):
    if sort == 'id':
        return 'import_order'
    elif sort == 'likes':
        return '-points'
    elif sort == "replies":
        return '-num_replies'
    elif sort == "long":
        return '-text_len'
    elif sort == "short":
        return 'text_len'
    elif sort == 'newest':
        return '-created_at'
    elif sort == 'oldest':
        return 'created_at'
    
def cluster_data(request):
    
    #from sklearn.cluster import KMeans
    from sklearn.cluster.k_means_ import MiniBatchKMeans
    from sklearn.metrics.pairwise import euclidean_distances
    import numpy as np
    
    owner = request.GET.get('owner', None)
    if not owner or owner == "None":
        owner = None
    else:
        owner = User.objects.get(username=owner)
    
    cluster_size = int(request.GET.get('size'))
    article_id = int(request.GET['id'])
    a = Article.objects.get(id=article_id)
    
    val = {'name': '<P><a href="%s">Read the article in the %s</a></p>' % (a.url, a.source.source_name),
           'size': 400,
           'article': True}
    
    posts = a.comment_set.filter(hidden=False, reply_to_disqus=None)
    
    num_posts = posts.count()
    
    min_num_clusters = 2.0
    max_num_clusters = float(num_posts)/2.0
    if max_num_clusters > 100:
        max_num_clusters = 100
    
    ratio = 1.0 - (float(cluster_size)/100.0)
    
    num_clusters = int(int(round(float(max_num_clusters - min_num_clusters) * ratio)) + min_num_clusters)
    
    posts_vectors = []
    for post in posts:
        try:
            posts_vectors.append(pickle.loads(post.vector).toarray()[0])
        except Exception as e:
            make_vector(post, a)
            posts_vectors.append(pickle.loads(post.vector).toarray()[0])
    
    
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
    
    for cluster, num in list(cluster_dict.items()):
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
    
    for cluster, vectors in list(vector_dict.items()):
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
    sort = request.GET.get('sort', None)
    next_page = request.GET.get('next', None)
    owner = request.GET.get('owner', None)
     
    if not owner or owner == "None":
        owner = None
    else:
        owner = User.objects.get(username=owner)
    comment_id = request.GET.get('comment_id', None)
    article_id = int(request.GET['id'])
    a = Article.objects.get(id=article_id)

    least = 1
    most = 6
    
    if not next_page:
        next_page = 0
    else:
        next_page = int(next_page)
    
    
    if comment_id and comment_id != 'null':
        posts = Comment.objects.filter(id=comment_id)
    else:
        if sort == 'default':
            top_comments = a.comment_set.filter(hidden=False, num_subchildren__gt=least, num_subchildren__lt=most)
            posts = []
            current_node = next((c for c in top_comments if c.disqus_id == a.first_child), None)
            if current_node:
                posts.append(current_node)
                while current_node and current_node.sibling_next:
                    current_node = next((c for c in top_comments if c.disqus_id == current_node.sibling_next), None)
                    if current_node:
                        posts.append(current_node)
        elif sort == 'id':
            posts = a.comment_set.filter(hidden=False, num_subchildren__gt=least, num_subchildren__lt=most).order_by('import_order')
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
            if count > 1:
                next_page = random.randint(0,count-1)

        if posts != None:
            posts = remove_self_loops(posts, a)
        if len(posts) > next_page:
            posts = [posts[next_page]]
        else:
            posts = None

    if posts != None and len(posts) > 0:
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
        parent_dict['last_updated'] = json.dumps(parent.created_at, indent=4, sort_keys=True, default=str) if parent.created_at else ''
        parent_dict['author'] = author
        parent_dict['replace_node'] = parent.is_replacement
        parent_dict['summarized'] = parent.summarized
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
        parent_dict['last_updated'] = json.dumps(parent.created_at, indent=4, sort_keys=True, default=str) if parent.created_at else ''
        parent_dict['author'] = author
        parent_dict['replace_node'] = parent.is_replacement
        parent_dict['summarized'] = parent.summarized
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

