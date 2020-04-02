from website.models import Article, Comment

from django.core.management.base import BaseCommand

class Command(BaseCommand):
    
    def handle(self, *args, **options):
        a = Article.objects.all()
        
        for art in a:
            comment_num = Comment.objects.filter(article=art, is_replacement=False, hidden=False).count()
            if comment_num == 0:
                print art.title
                art.delete()