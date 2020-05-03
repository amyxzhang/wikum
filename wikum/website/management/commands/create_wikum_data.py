from website.models import Article, Comment, CommentAuthor, History
import csv
import seaborn as sns
import pandas as pd
import re
from datetime import datetime

from django.core.management.base import BaseCommand

class Command(BaseCommand):

    def add_arguments(self, parser):
        # Positional arguments
        parser.add_argument('article_id', nargs='+', type=int)
    
    def handle(self, *args, **options):
        if len(options['article_id']) == 0:
            print("Please pass an article id")
        else:
            article_id = options['article_id'][0]
            a = Article.objects.get(id=article_id)
            self.create_data(a)

    def create_data(self, article):
        history_objs = History.objects.filter(article=article.id, action__in=['new_node', 'reply_comment', 'edit_sum', 'sum_comment', 'sum_nodes', 'rate_comment', 'sum_selected', 'edit_sum_nodes', 'move_comment', 'hide_replies', 'delete_comment_sum', 'delete_sum', 'hide_comment', 'hide_comments'])
        action_to_type = {'new_node': 1, 'reply_comment': 1, 'edit_sum': 4, 'sum_comment': 2, 'sum_nodes': 2, 'rate_comment': 3, 'sum_selected': 2, 'delete_sum': 5, 'edit_sum_nodes': 5, 'move_comment': 4, 'hide_replies': 4, 'delete_comment_sum': 5, 'hide_comment': 4, 'hide_comments': 4}
        filename = 'wikum_comment_data_' + str(article.id) + '.csv'
        with open(filename, mode='w') as comment_data:
            data_writer = csv.writer(comment_data, delimiter=',')
            data_writer.writerow(['Time', 'User', 'Word Count', 'Words Shown', 'Type (New Comment 1 / New Summary 2 / Evaluate 3 / Move, Edit, or Delete Comment(s) 4 / Edit or Delete Summary 5'])
            for hist in history_objs:
                action = hist.action
                word_count = 0
                if action in ['new_node', 'reply_comment']:
                    word_count = 0
                    for comment in hist.comments.all():
                        word_count += len(comment.text.strip().split())
                elif action in ['sum_comment', 'sum_nodes', 'sum_selected']:
                    word_count = len(hist.to_str.strip().split())
                elif action in ['rate_comment', 'move_comment']:
                    word_count = 0
                elif action in ['edit_sum', 'edit_sum_nodes']:
                    word_count = len(hist.to_str.strip().split()) - len(hist.from_str.strip().split())
                elif action in ['hide_replies', 'hide_comment', 'hide_comments', 'delete_comment_sum']:
                    word_count = 0
                    for comment in hist.comments.all():
                        word_count -= len(comment.text.strip().split())
                elif action == 'delete_sum':
                    word_count = -len(hist.from_str.strip().split())
                data_writer.writerow([hist.datetime, 'Anonymous' if hist.user == None else hist.user.username, word_count, hist.words_shown, action_to_type[action]])
        comment_data.close()



