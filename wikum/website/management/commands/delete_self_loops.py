import email
import re
from dateutil import parser

from website.models import Article, Source, Comment, CommentAuthor

from website.engine import count_article

from django.core.management.base import BaseCommand, CommandError

class Command(BaseCommand):
    
    def handle(self, *args, **options):        

        all_articles = Article.objects.all()
        
        for a in all_articles:
            print(a)
            comments = a.comment_set.all()
            for c in comments:
                parent = Comment.objects.filter(disqus_id=c.reply_to_disqus, article=a)
                if parent.count() > 0:
                    p = parent[0]
                    hasLoop = False
                    if p == c:
                        print("Has self-loop at comment:", c)
                        hasLoop = True
                        c.reply_to_disqus = None
                        c.save()
                    else:
                        count = 0
                        current = p
                        while current != None and count < 50:
                            count = count + 1
                            parent = Comment.objects.filter(disqus_id=current.reply_to_disqus, article=a)
                            if parent.count() > 0:
                                if parent[0] == current:
                                    print("Has self-loop at comment:", c)
                                    hasLoop = True
                                    current.reply_to_disqus = None
                                    current.save()
                                    break
                                current = parent[0]
                            else:
                                current = None
                                break
            a.save()
                    
            