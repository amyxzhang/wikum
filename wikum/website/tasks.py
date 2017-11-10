from __future__ import absolute_import
from celery import shared_task, current_task
from celery.exceptions import Ignore
from website.import_data import get_source, get_article, get_disqus_posts,\
    get_reddit_posts, count_replies, get_wiki_talk_posts, get_decide_proposal_posts
from django.db import connection
from django.contrib.auth.models import User


@shared_task()
def import_article(url, owner):
    connection.close()

    source = get_source(url)

    if source:
        
        if owner == "None":
            user = None
        else:
            user = User.objects.get(username=owner)
        
        article = get_article(url, user, source, 0)
        if article:
            posts = article.comment_set
            total_count = 0

            if posts.count() == 0:
                if article.source.source_name == "The Atlantic":
                    get_disqus_posts(article, current_task, total_count)

                elif article.source.source_name == "Reddit":
                    get_reddit_posts(article, current_task, total_count)

                elif article.source.source_name == "Wikipedia Talk Page":
                    get_wiki_talk_posts(article, current_task, total_count)

                elif article.source.source_name == "Decide Proposal":
                    get_decide_proposal_posts(article, current_task, total_count)
               
                article.comment_num = article.comment_set.count()
                article.save()
                count_replies(article)
        else:
            return 'FAILURE-ARTICLE'
    else:
        return 'FAILURE-SOURCE'


@shared_task()
def generate_tags(article_id):
    connection.close()
    try:
        import pandas as pd
        import numpy as np
        import itertools
        
        from sklearn.feature_extraction.text import TfidfTransformer, CountVectorizer
        from sklearn.preprocessing import MultiLabelBinarizer
        from sklearn.multiclass import OneVsRestClassifier
        from sklearn.svm import SVC

        from website.models import Article
        a = Article.objects.get(id=article_id)

        # import article's comments into dataframe
        df = pd.DataFrame(list(a.comment_set.all().values(
            'id', 'article', 'disqus_id',
            'text', 'summary',
            'tags', 'suggested_tags')))
        # merge all text (comments+summaries) into a new column
        df['train_text'] = df[['text', 'summary']].apply(lambda x: ' '.join(x), axis=1)

        # define  classifier
        clf = OneVsRestClassifier(SVC(kernel='linear'))

        # train data: use only comments with tags
        tagged = df.loc[df['tags'].notnull()]
        
        # train data: preproccess and vectorize (TfIdf) text data
        count_vect = CountVectorizer(
            stop_words='english',
            min_df=3, max_df=0.30,
            #lowercase=True,
            ngram_range=(1, 2),
        )
        X_train_counts = count_vect.fit_transform(list(tagged.train_text))
        tfidf_transformer = TfidfTransformer().fit(X_train_counts)
        X_train_tfidf = tfidf_transformer.transform(X_train_counts)
        # train classifier
        clf = clf.fit(X_train_tfidf, tagged.tags)

        # suggest tags for ALL instances in df
        test_df = df.drop_duplicates(subset=['disqus_id'])
        X_test_counts = count_vect.transform(list(test_df.train_text))
        X_test_tfidf = tfidf_transformer.transform(X_test_counts)
        suggested = clf.predict(X_test_tfidf)
        # save suggested tags to the dataframe
        test_df.suggested_tags = suggested
        
        # add suggested tags to the database
        sorted_df = test_df.sort_values('disqus_id')
        comments = a.comment_set.all().order_by('disqus_id')
        
        for row_item, comment in zip(df.iterrows(), comments):
            index, row = row_item
            comment.suggested_tags.add(row['suggested_tags'])
            
    except Exception, e:
        print e
        