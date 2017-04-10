import email
import re
from dateutil import parser

from website.models import Article, Source, Comment, CommentAuthor

from website.engine import count_article

from django.core.management.base import BaseCommand, CommandError

class Command(BaseCommand):
    
    def handle(self, *args, **options):

        a = Article.objects.all()
        
        for art in a:
            art.comment_num = Comment.objects.filter(article=art, is_replacement=False, hidden=False).count()
            art.summary_num = Comment.objects.filter(article=art, is_replacement=True, hidden=False).count()
            art.save()
            
            count_article(art)
            
                    
            