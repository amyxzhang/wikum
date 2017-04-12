import json
import urllib2

import datetime
from django.core.paginator import Paginator
from random import randint

import re

import pickle
import praw
from website.import_data import get_disqus_posts, get_reddit_posts,\
    count_replies
from website.models import Article, Comment, History, Tag

def random_with_N_digits(n):
    range_start = 10**(n-1)
    range_end = (10**n)-1
    return randint(range_start, range_end)

def get_posts(article):
    
    posts = article.comment_set
    if posts.count() == 0:
        
        if article.source.source_name == "The Atlantic":
            get_disqus_posts(article, None, None)
        elif article.source.source_name == "Reddit":
            get_reddit_posts(article, None, None)
                
        count_replies(article)
        
        posts = article.comment_set.filter(reply_to_disqus=None).order_by('-points')
    else:
        posts = posts.filter(reply_to_disqus=None).order_by('-points')
    
    if article.vectorizer == None:
        create_vectors(article)
        
        posts = article.comment_set.filter(reply_to_disqus=None)
        from website.views import recurse_viz
        recurse_viz(None, posts, False, article, False)
    
    return posts[0:10]


def tokenize_and_stem(text):
    import nltk
    from nltk.stem.snowball import SnowballStemmer
    stemmer = SnowballStemmer("english")
    
    # first tokenize by sentence, then by word to ensure that punctuation is caught as it's own token
    tokens = [word for sent in nltk.sent_tokenize(text) for word in nltk.word_tokenize(sent)]
    filtered_tokens = []
    # filter out any tokens not containing letters (e.g., numeric tokens, raw punctuation)
    for token in tokens:
        if re.search('[a-zA-Z]', token):
            filtered_tokens.append(token)
    stems = [stemmer.stem(t) for t in filtered_tokens]
    return stems

def tokenize_only(text):
    import nltk
    # first tokenize by sentence, then by word to ensure that punctuation is caught as it's own token
    tokens = [word.lower() for sent in nltk.sent_tokenize(text) for word in nltk.word_tokenize(sent)]
    filtered_tokens = []
    # filter out any tokens not containing letters (e.g., numeric tokens, raw punctuation)
    for token in tokens:
        if re.search('[a-zA-Z]', token):
            filtered_tokens.append(token)
    return filtered_tokens
        
        
def copy_article_and_comments(a):
    num_arts = Article.objects.filter(url=a.url).count()
    
    old_id = a.id
    old_art = Article.objects.filter(id=old_id)
    
    a.pk = None
    a.save()
    a.num = num_arts
    a.save()
    
    comments = old_art.comment_set.all()
    for p in comments:
        p.pk = None
        p.save()
        p.article = a
        p.json_flatten = ''
        p.save()
        


def create_vectors(article):
    from sklearn.feature_extraction.text import TfidfVectorizer
    
    comments = Comment.objects.filter(article=article, num_subchildren=0, reply_to_disqus=None)
    ids = []
    comment_list = []
    for comment in comments:
        ids.append(comment.id)
        
        text = re.sub(r'<.*?>', ' ', comment.text)
        comment_list.append(text)
    
    tfidf_vectorizer = TfidfVectorizer(max_df=0.8, max_features=200000,
                                     min_df=0.2, stop_words='english',
                                     use_idf=True, tokenizer=tokenize_and_stem, ngram_range=(1,3))
      
    vectorizer = tfidf_vectorizer.fit(comment_list)  
    
    article.vectorizer = pickle.dumps(vectorizer)
    article.save()
    
    tfidf_matrix = tfidf_vectorizer.transform(comment_list)
    
    for id, row in zip(ids, tfidf_matrix):
        c = Comment.objects.get(id=id)
        c.vector = pickle.dumps(row)
        c.save()
    
    
def make_vector(comment, article):
    
    if not article.vectorizer:
        create_vectors(article)
    
    vectorizer = pickle.loads(article.vectorizer)
    
    summary = comment.summary
    
    if summary != '':
    
        summary = re.sub(r'\[\[.*?\]\]', ' ', summary)
        summary = re.sub(r'\[quote\]', ' ', summary)
        summary = re.sub(r'\[endquote\]', ' ', summary)
        
        vector = vectorizer.transform([summary])[0]
        
    else:
        vector = vectorizer.transform([comment.text])[0]
    
    comment.vector = pickle.dumps(vector)
    comment.save()
    
    
def word_count(s):
    if not s:
        return 0
    return len(s.strip().split())


def count_article(art):
    posts = Comment.objects.filter(article=art, reply_to_disqus=None, hidden=False)
        
    val2 = {}
    from website.views import recurse_viz
    val2['children'], val2['hid'], val2['replace'], num_subchildren = recurse_viz(None, posts, False, art, False)
    
    num_words_all = count_all_words(0, val2)
    num_words_still = count_unsummarized_words(0, val2)
    
    print num_words_all
    print num_words_still

    if num_words_all >= 250:
        num_words_all = num_words_all - 250;
        num_words_still = num_words_still - 250;
    else:
        half = num_words_all/2;
        num_words_all = num_words_all - half;
        num_words_still = num_words_still - half;

    if num_words_all != 0:
        value = round(((1.0 - float(float(num_words_still)/float(num_words_all))) * 100.0))
    else:
        value = 0
        
    if value > 100:
        value = 100
    return value
    

def count_all_words(count, info):
    if info.get('replace_node'):
        if info.get('replace'):
            for item in info['replace']:
                count = count_all_words(count, item)

        if info.get('children'):
            for item in info['children']:
                count = count_all_words(count, item)
    else:
        if info.get('children'):
            for item in info['children']:
                count = count_all_words(count, item)

        if info.get('name'):
            count += word_count(info['name'])
        
    return count
    
def count_unsummarized_words(count, info):
        
    if info.get('replace_node'):
        count += word_count(info['summary'])
        count += word_count(info['extra_summary'])
    elif info.get('children'):
            for item in info['children']:
                count = count_unsummarized_words(count, item)


    if info.get('summary'):
        count += word_count(info['summary'])
        count += word_count(info['extra_summary'])
    elif info.get('name'):
            count += word_count(info['name'])

    return count
    
    
