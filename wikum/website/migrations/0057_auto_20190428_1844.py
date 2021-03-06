# -*- coding: utf-8 -*-
# Generated by Django 1.9.1 on 2019-04-28 18:44
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('website', '0056_auto_20190421_0522'),
    ]

    operations = [
        migrations.AlterField(
            model_name='article',
            name='access_mode',
            field=models.IntegerField(choices=[(0, 'Full'), (1, 'Comment'), (2, 'Summarize'), (3, 'View'), (4, 'Private')], default=0),
        ),
        migrations.AlterField(
            model_name='permissions',
            name='access_level',
            field=models.IntegerField(choices=[(0, 'Full'), (1, 'Comment'), (2, 'Summarize'), (3, 'View'), (4, 'Private')], default=0),
        ),
    ]
