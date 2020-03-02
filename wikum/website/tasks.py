from __future__ import absolute_import
from __future__ import print_function
from celery import shared_task, current_task
from celery.exceptions import Ignore
from website.import_data import get_source, get_article, get_disqus_posts,\
    get_reddit_posts, count_replies, get_wiki_talk_posts, get_decide_proposal_posts, get_join_taiwan_posts
from django.contrib.auth.models import User
from website.models import Comment

def set_link_article(node, article):
    if node == article:
        disqus_id = None
    else:
        disqus_id = node.disqus_id
    children = Comment.objects.filter(reply_to_disqus=disqus_id, article=article).order_by('import_order')
    if len(children) == 0:
        node.first_child = None
        node.last_child = None
        node.save()
    else:
        node.first_child = children[0].disqus_id
        node.last_child = children[len(children)-1].disqus_id
        node.save()
        if len(children) == 1:
            children[0].sibling_prev = None
            children[0].sibling_next = None
            children[0].save()
            set_link_article(children[0], article)
        else:
            for index, child in enumerate(children):
                if index == 0:
                    child.sibling_prev = None
                    child.sibling_next = children[index + 1].disqus_id
                elif index == len(children)-1:
                    child.sibling_next = None
                    child.sibling_prev = children[index - 1].disqus_id
                else:
                    child.sibling_prev = children[index - 1].disqus_id
                    child.sibling_next = children[index + 1].disqus_id
                child.save()
                set_link_article(child, article)


@shared_task
def import_article(url, owner):
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
                    get_reddit_posts(article, current_task, total_count, url)

                elif article.source.source_name == "Wikipedia Talk Page":
                    get_wiki_talk_posts(article, current_task, total_count)

                elif article.source.source_name == "Decide Proposal":
                    get_decide_proposal_posts(article, current_task, total_count)
                elif article.source.source_name == "JOIN Taiwan":
                    get_join_taiwan_posts(article, current_task, total_count)

                article.comment_num = article.comment_set.count()
                article.save()
                count_replies(article)

            set_link_article(article, article)
            article.save()
        else:
            return 'FAILURE-ARTICLE'
    else:
        return 'FAILURE-SOURCE'


@shared_task(ignore_result=True)
def generate_tags(article_id):
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
        print(df['train_text'])

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

        for comment in comments:
            comment.suggested_tags.clear()

        for row_item, comment in list(zip(sorted_df.iterrows(), comments)):
            index, row = row_item
            if row['suggested_tags']:
                if not comment.tags.filter(id=row['suggested_tags']).exists():
                    comment.suggested_tags.add(row['suggested_tags'])

    except Exception as e:
        print(e)

