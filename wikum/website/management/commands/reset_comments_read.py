from website.models import WikumUser

from django.core.management.base import BaseCommand

class Command(BaseCommand):
    
    def handle(self, *args, **options):
        users = WikumUser.objects.all()
        
        for user in users:
            user.comments_read = ''
            user.save()