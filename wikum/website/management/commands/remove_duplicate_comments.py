import email
import re
from dateutil import parser

from website.models import Article, Source, Comment, CommentAuthor

from website.engine import count_article

from django.core.management.base import BaseCommand, CommandError

class Command(BaseCommand):

    def add_arguments(self, parser):
        # Positional arguments
        parser.add_argument('article_ids', nargs='+', type=int)
    
    def handle(self, *args, **options):
        if len(options['article_ids']) == 0:
            a = Article.objects.all()
        else:
            article_ids = options['article_ids']
            a = Article.objects.filter(id__in=article_ids)
        
        for art in a:
            print(art)
            self.remove_dup_comments(art)

    # remove any comment that has the same children as another comment in article
    def remove_dup_comments(self, article):
        children = Comment.objects.filter(article=article).order_by('import_order')
        tracker = {}
        for c in children:
            children_of_c = Comment.objects.filter(reply_to_disqus=c.disqus_id, article=article)
            child_ids = sorted([child.disqus_id for child in children_of_c])
            if any(vlist==child_ids and len(vlist)>0 for vlist in tracker.values()):
                print("MATCH:", child_ids)
                c.delete()
            else:
                tracker[c.id] = child_ids
