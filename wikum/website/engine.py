import json
import urllib2
from website.models import Article, Source, CommentAuthor, Comment, History, Tag
from wikum.settings import DISQUS_API_KEY
import datetime
from django.core.paginator import Paginator
from random import randint

from nltk.corpus import stopwords
from nltk.stem.snowball import SnowballStemmer
import re
import nltk
from sklearn.feature_extraction.text import TfidfVectorizer
import pickle
import praw

stemmer = SnowballStemmer("english")
stop = stopwords.words('english')

USER_AGENT = "website:Wikum:v1.0.0 (by /u/smileyamers)"

THREAD_CALL = 'http://disqus.com/api/3.0/threads/list.json?api_key=%s&forum=%s&thread=link:%s'
COMMENTS_CALL = 'https://disqus.com/api/3.0/threads/listPosts.json?api_key=%s&thread=%s'


def random_with_N_digits(n):
    range_start = 10**(n-1)
    range_end = (10**n)-1
    return randint(range_start, range_end)

def get_source(url):
    if 'theatlantic' in url:
        return Source.objects.get(source_name="The Atlantic")
    elif 'reddit.com' in url:
        return Source.objects.get(source_name="Reddit")
    return None

def get_article(url, source):
    article = Article.objects.filter(url=url)
    if article.count() == 0:
        if source.source_name == "The Atlantic":
            thread_call = THREAD_CALL % (DISQUS_API_KEY, source.disqus_name, url)
            result = urllib2.urlopen(thread_call)
            result = json.load(result)
            
            title = result['response'][0]['clean_title']
            link = result['response'][0]['link']
            id = result['response'][0]['id']
            
        elif source.source_name == "Reddit":
            r = praw.Reddit(user_agent=USER_AGENT)
            submission = r.get_submission(url)
            title = submission.title
            link = url
            id = submission.id
            
        article,_ = Article.objects.get_or_create(disqus_id=id, title=title, url=link, source=source)
    else:
        article = article[0]
        
    return article

def count_replies(article):
    comments = Comment.objects.filter(article=article)
    for c in comments:
        if c.disqus_id != '':
            replies = Comment.objects.filter(reply_to_disqus=c.disqus_id).count()
            c.num_replies = replies
            c.save()


def import_disqus_posts(result, article):
    for response in result['response']:
        comment_id = response['id']
        comment = Comment.objects.filter(disqus_id=comment_id, article=article)
        
        if comment.count() == 0:
            
            anonymous = response['author']['isAnonymous']
            if anonymous:
                comment_author = CommentAuthor.objects.get(disqus_id='anonymous')
            else:
                author_id = response['author']['id']
                
                comment_author = CommentAuthor.objects.filter(disqus_id=author_id)
                if comment_author.count() > 0:
                    comment_author = comment_author[0]
                else:
                    
                    comment_author,_ = CommentAuthor.objects.get_or_create(username = response['author']['username'],
                                                          real_name = response['author']['name'],
                                                          power_contrib = response['author']['isPowerContributor'],
                                                          anonymous = anonymous,
                                                          reputation = response['author']['reputation'],
                                                          joined_at = datetime.datetime.strptime(response['author']['joinedAt'], '%Y-%m-%dT%H:%M:%S'),
                                                          disqus_id = author_id,
                                                          avatar = response['author']['avatar']['small']['permalink'],
                                                          primary = response['author']['isPrimary']
                                                          )
            
            comment = Comment.objects.create(article = article,
                                             author = comment_author,
                                             text = response['message'],
                                             disqus_id = response['id'],
                                             reply_to_disqus = response['parent'],
                                             text_len = len(response['message']),
                                             likes = response['likes'],
                                             dislikes = response['dislikes'],
                                             reports = response['numReports'],
                                             points = response['points'],
                                             created_at = datetime.datetime.strptime(response['createdAt'], '%Y-%m-%dT%H:%M:%S'),
                                             edited = response['isEdited'],
                                             spam = response['isSpam'],
                                             highlighted = response['isHighlighted'],
                                             flagged = response['isFlagged'],
                                             deleted = response['isDeleted'],
                                             approved = response['isApproved']
                                             )
        
        
def get_disqus_posts(article):
    comment_call = COMMENTS_CALL % (DISQUS_API_KEY, article.disqus_id)
            
    print comment_call
    
    result = urllib2.urlopen(comment_call)
    result = json.load(result)
    
    import_disqus_posts(result, article)
    
    while result['cursor']['hasNext']:
        next = result['cursor']['next']
        comment_call_cursor = '%s&cursor=%s' % (comment_call, next)
        
        print comment_call_cursor
        
        result = urllib2.urlopen(comment_call_cursor)
        result = json.load(result)
        
        import_disqus_posts(result, article)


def import_reddit_posts(comments, article, reply_to):
    
    for comment in comments:
        
        comment_id = comment.id
        comment_wikum = Comment.objects.filter(disqus_id=comment_id)
        
        if comment_wikum.count() == 0:
            
            from praw.errors import NotFound
            
            try:
                author_id = comment.author.id
                comment_author = CommentAuthor.objects.filter(disqus_id=author_id)
                if comment_author.count() > 0:
                    comment_author = comment_author[0]
                else:
                    comment_author = CommentAuthor.objects.create(username=comment.author.name, 
                                                              disqus_id=author_id,
                                                              joined_at=datetime.datetime.fromtimestamp(int(comment.author.created_utc)),
                                                              is_reddit=True,
                                                              is_mod=comment.author.is_mod,
                                                              is_gold=comment.author.is_gold,
                                                              comment_karma=comment.author.comment_karma,
                                                              link_karma=comment.author.link_karma
                                                              )
            except AttributeError:
                comment_author = CommentAuthor.objects.get(disqus_id=None)
            except NotFound:
                comment_author = CommentAuthor.objects.get(disqus_id=None)
            
            html_text = comment.body_html
            html_text = re.sub('<div class="md">', '', html_text)
            html_text = re.sub('</div>', '', html_text)
            
            comment_wikum = Comment.objects.create(article = article,
                                             author = comment_author,
                                             text = html_text,
                                             disqus_id = comment.id,
                                             reply_to_disqus = reply_to,
                                             text_len = len(html_text),
                                             likes = comment.ups,
                                             dislikes = comment.downs,
                                             reports = len(comment.user_reports),
                                             points = comment.score,
                                             controversial_score = comment.controversiality,
                                             created_at=datetime.datetime.fromtimestamp(int(comment.created_utc)),
                                             edited = comment.edited,
                                             flagged = len(comment.user_reports) > 0,
                                             deleted = comment.banned_by != None,
                                             approved = comment.approved_by != None,
                                             )
            replies = comment.replies
            import_reddit_posts(replies, article, comment.id)
    

def get_reddit_posts(article):
    
    r = praw.Reddit(user_agent=USER_AGENT)
    submission = r.get_submission(submission_id=article.disqus_id)

    submission.replace_more_comments(limit=None, threshold=0)
    
    all_forest_comments = submission.comments
    
    import_reddit_posts(all_forest_comments, article, None)
    


def get_posts(article):
    
    posts = article.comment_set
    if posts.count() == 0:
        
        if article.source.source_name == "The Atlantic":
            get_disqus_posts(article)
        elif article.source.source_name == "Reddit":
            get_reddit_posts(article)
                
        count_replies(article)
        create_vectors(article)
        
        posts = article.comment_set.filter(reply_to_disqus=None)
        from website.views import recurse_viz
        
        recurse_viz(None, posts, False)
        
        
        posts = article.comment_set.filter(reply_to_disqus=None).order_by('-points')
    else:
        posts = posts.filter(reply_to_disqus=None).order_by('-points')
    
    return posts[0:10]


def tokenize_and_stem(text):
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
    # first tokenize by sentence, then by word to ensure that punctuation is caught as it's own token
    tokens = [word.lower() for sent in nltk.sent_tokenize(text) for word in nltk.word_tokenize(sent)]
    filtered_tokens = []
    # filter out any tokens not containing letters (e.g., numeric tokens, raw punctuation)
    for token in tokens:
        if re.search('[a-zA-Z]', token):
            filtered_tokens.append(token)
    return filtered_tokens

def create_vectors(article):
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
    
    
    
    
