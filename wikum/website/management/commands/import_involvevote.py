import email
import re
from dateutil import parser
import csv

from website.models import Article, Source, Comment, CommentAuthor

from django.core.management.base import BaseCommand, CommandError

class Command(BaseCommand):
    
    def handle(self, *args, **options):

        f = open('orangetown.csv', 'r')
        
        reader = csv.DictReader(f)
        
        s,_ = Source.objects.get_or_create(source_name="Involved.vote")
        
        a,_ = Article.objects.get_or_create(url="https://involved.vote",
                                  title="Would you like to see a fenced off-leash dog park? - Town of Orangetown, NY",
                                  source=s)

        message_id = 0
        
        for row in reader:
            text = row['Comment']
            user = row['Email Address']
            author,_ = CommentAuthor.objects.get_or_create(username=user)
             
            c,_ = Comment.objects.get_or_create(disqus_id=message_id,
                                              text=text,
                                              author=author,
                                              article=a,
                                              text_len = len(text))
            message_id += 1
                     
                    
                    
                    
                    
            