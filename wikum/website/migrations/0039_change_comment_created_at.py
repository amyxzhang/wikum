# -*- coding: utf-8 -*-
# Generated by Django 1.9.1 on 2017-06-28 18:28
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('website', '0038_add_section_index'),
    ]

    operations = [
        migrations.AlterField(
            model_name='comment',
            name='created_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
