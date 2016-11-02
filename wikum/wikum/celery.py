from __future__ import absolute_import
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'wikum.settings')

from django.conf import settings
from celery import Celery

app = Celery('website',
             backend=settings.CELERY_RESULT_BACKEND,
             broker=settings.BROKER_URL)

# This reads, e.g., CELERY_ACCEPT_CONTENT = ['json'] from settings.py:
app.config_from_object('django.conf:settings')

# For autodiscover_tasks to work, you must define your tasks in a file called 'tasks.py'.
app.autodiscover_tasks(lambda: settings.INSTALLED_APPS)