from website.models import Article, Comment, CommentAuthor, History
import csv
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
            self.find_comments_after_sum(a)

    def find_nearest_summary(self, comment, article):
        if comment == article:
            return None
        if comment.is_replacement:
            return comment
        current = comment
        nearest_sum = None
        while current.reply_to_disqus:
            c = Comment.objects.get(disqus_id=current.reply_to_disqus)
            if c.is_replacement:
                nearest_sum = c
                break
            current = c
        return nearest_sum

    def find_comments_after_sum(self, article):
        comments = Comment.objects.filter(article=article, is_replacement=False, hidden=False)
        history_sum_objs = History.objects.filter(article=article.id, action__in=['sum_nodes', 'sum_selected'])
        history_drag_objs = History.objects.filter(article=article.id, action__in=['move_comment'])
        filename = 'wikum_comments_after_summaries_' + str(article.id) + '.csv'
        with open(filename, mode='w') as comment_data:
            data_writer = csv.writer(comment_data, delimiter=',')
            data_writer.writerow(['Comment Text', 'Summary Text', 'Comment Was Dragged (Direct)', 'Comment Created', 'Summary Created'])
            for comment in comments:
                comment_created_at = comment.created_at
                nearest_sum = self.find_nearest_summary(comment, article)
                if nearest_sum == None:
                    continue
                else:
                    hist_sum = history_sum_objs.filter(comments__exact=nearest_sum)
                    if hist_sum.count() > 0:
                        summary_created_at = hist_sum[0].datetime
                    else:
                        print("couldn't find history object for summary")
                        summary_created_at = nearest_sum.created_at
                    if comment_created_at != None and summary_created_at != None and summary_created_at < comment_created_at:
                        dragged = history_drag_objs.filter(comments__exact=comment)
                        data_writer.writerow([comment.text, nearest_sum.summary, dragged.count() > 0, comment_created_at, summary_created_at])
        comment_data.close()

