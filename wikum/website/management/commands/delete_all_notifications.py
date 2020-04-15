from website.models import Notification

from django.core.management.base import BaseCommand

class Command(BaseCommand):
    
    def handle(self, *args, **options):
        notifs = Notification.objects.all()
        
        for notif in notifs:
            notif.delete()