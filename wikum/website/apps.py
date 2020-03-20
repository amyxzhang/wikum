from __future__ import unicode_literals

from django.apps import AppConfig
from django.db.models.signals import post_migrate

from website import handlers

class WebsiteConfig(AppConfig):
    name = 'website'
    verbose_name = 'Wikum'

    def ready(self):
        post_migrate.connect(handlers.create_notice_types, sender=self)