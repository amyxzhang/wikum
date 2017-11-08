from __future__ import unicode_literals

from django.db import models
from django.contrib.auth.models import User

# Create your models here.

class Source(models.Model):
    id = models.AutoField(primary_key=True)
    source_name = models.TextField()
    disqus_name = models.TextField(null=True)
    
    def __unicode__(self):
        return self.source_name

class Article(models.Model):
    EDIT_ACCESS = 1
    COMMENT_ACCESS = 2
    VIEW_ACCESS = 3
    PRIVATE_ACCESS = 4
    ACCESS_MODES = (
        (EDIT_ACCESS, 'Edit'),
        (COMMENT_ACCESS, 'Comment'),
        (VIEW_ACCESS, 'View'),
        (PRIVATE_ACCESS, 'Private'),
    )
    
    id = models.AutoField(primary_key=True)
    disqus_id = models.CharField(max_length=15, null=True, blank=True)
    created_at = models.DateTimeField(null=True)
    title = models.TextField()
    url = models.URLField()
    source = models.ForeignKey('Source')
    
    num = models.IntegerField(default=0)
    highlight_authors = models.TextField()
    vectorizer = models.BinaryField()
    
    access_mode = models.IntegerField(choices=ACCESS_MODES, default=EDIT_ACCESS) 
    
    percent_complete = models.IntegerField(default=0)
    comment_num = models.IntegerField(default=0)
    summary_num = models.IntegerField(default=0)

    # "section_index" is a column for storing the index number of the section within the page.
    # There are some cases when wikicode does not parse a section as a section when given a whole page.
    # To prevent this, we first grab only the section(not the entire page) using "section_index" and parse it.
    section_index = models.IntegerField(default=0)

    def __unicode__(self):
        return self.title
    
class History(models.Model):
    id = models.AutoField(primary_key=True)
    article = models.ForeignKey('Article')
    action = models.CharField(max_length=15)
    user = models.ForeignKey(User, null=True)
    datetime = models.DateTimeField(auto_now=True)
    comments = models.ManyToManyField('Comment')
    from_str = models.TextField()
    to_str = models.TextField()
    explanation = models.TextField()
    
    def __unicode__(self):
        return self.action
    
class Tag(models.Model):
    id = models.AutoField(primary_key=True)
    article = models.ForeignKey('Article')
    text = models.TextField()
    color = models.CharField(max_length=6)
    
    def __unicode__(self):
        return 'Tag of %s on article %s' % (self.text, self.article.title)
    
class Comment(models.Model):
    id = models.AutoField(primary_key=True)
    article = models.ForeignKey('Article')
    author = models.ForeignKey('CommentAuthor', null=True)
    
    cosigners = models.ManyToManyField('CommentAuthor', related_name="cosigned_on")
    
    text = models.TextField()
    disqus_id = models.CharField(max_length=70)
    reply_to_disqus = models.CharField(max_length=70, null=True, blank=True)
    num_replies = models.IntegerField(default=0)
    text_len = models.IntegerField(default=0)
    
    likes = models.IntegerField(default=0)
    dislikes = models.IntegerField(default=0)
    
    reports = models.IntegerField(default=0)
    points = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(null=True, blank=True)
    edited = models.BooleanField(default=False)
    spam = models.BooleanField(default=False)
    highlighted = models.BooleanField(default=False)
    flagged = models.BooleanField(default=False)
    deleted = models.BooleanField(default=False)
    approved = models.BooleanField(default=True)
    
    controversial_score = models.IntegerField(default=0)
    
    json_flatten = models.TextField()
    num_subchildren = models.IntegerField(default=0)
    hidden = models.BooleanField(default=False)
    
    summary = models.TextField()
    extra_summary = models.TextField()
    is_replacement = models.BooleanField(default=False)
    
    vector = models.BinaryField()
    
    tags = models.ManyToManyField(Tag)
    suggested_tags = models.ManyToManyField(Tag)

    def __unicode__(self):
        return 'Comment by %s on %s' % (self.author, self.article.title)
    
    
class CommentAuthor(models.Model):
    username = models.TextField(null=True)
    
    real_name = models.TextField()
    power_contrib = models.BooleanField(default=False)
    anonymous = models.BooleanField(default=False)
    reputation = models.FloatField(default=0.0)
    
    joined_at = models.DateTimeField(null=True)
    disqus_id = models.CharField(max_length=15, null=True)
    
    is_reddit = models.BooleanField(default=False)
    is_mod = models.BooleanField(default=False)
    is_gold = models.BooleanField(default=False)
    comment_karma = models.IntegerField(default=0)
    link_karma = models.IntegerField(default=0)
    
    avatar = models.URLField()
    primary = models.BooleanField(default=False)
    
    is_wikipedia = models.BooleanField(default=False)
    edit_count = models.IntegerField(default=0)
    gender = models.CharField(max_length=15, null=True)
    groups = models.TextField(null=True)
    
    def __unicode__(self):
        if self.anonymous:
            return self.real_name
        else:
            return self.username
    
