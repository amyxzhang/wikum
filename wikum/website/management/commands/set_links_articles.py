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
            self.set_link_article(art, art)

    def set_link_article(self, node, article):
        if node == article:
            disqus_id = None
        else:
            disqus_id = node.disqus_id
        children = Comment.objects.filter(reply_to_disqus=disqus_id, article=article, hidden=False).order_by('import_order')
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
                self.set_link_article(children[0], article)
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
                    self.set_link_article(child, article)
