from __future__ import unicode_literals

from django.db import models
from django.contrib.auth.models import User
from pinax.notifications.models import NoticeType
from six import python_2_unicode_compatible
from annoying.fields import AutoOneToOneField

# Create your models here.

class Source(models.Model):
    id = models.AutoField(primary_key=True)
    source_name = models.TextField()
    disqus_name = models.TextField(null=True)

    def __unicode__(self):
        return self.source_name

class WikumUser(models.Model):
    user = AutoOneToOneField(User, primary_key=True, on_delete=models.CASCADE)
    comments_read = models.TextField(blank=True, default="")
    subscribe_edit = models.TextField(blank=True, default="")
    subscribe_replies = models.TextField(blank=True, default="")

@python_2_unicode_compatible
class Article(models.Model):
    FULL_ACCESS = 0
    COMMENT_ACCESS = 1
    SUMMARIZE_ACCESS = 2
    VIEW_ACCESS = 3
    PRIVATE_ACCESS = 4
    ACCESS_MODES = (
        (FULL_ACCESS, 'Full'),
        (COMMENT_ACCESS, 'Comment'),
        (SUMMARIZE_ACCESS, 'Summarize'),
        (VIEW_ACCESS, 'View'),
        (PRIVATE_ACCESS, 'Private'),
    )

    id = models.AutoField(primary_key=True)
    disqus_id = models.CharField(max_length=64, null=True, blank=True)
    first_child = models.CharField(max_length=70, null=True, blank=True)
    last_child = models.CharField(max_length=70, null=True, blank=True)
    created_at = models.DateTimeField(null=True)
    title = models.TextField()
    url = models.URLField()
    source = models.ForeignKey('Source', on_delete=models.PROTECT)
    last_updated = models.DateTimeField(null=True)
    drag_locked = models.BooleanField(default=False)

    num = models.IntegerField(default=0)
    highlight_authors = models.TextField()
    vectorizer = models.BinaryField()

    access_mode = models.IntegerField(choices=ACCESS_MODES, default=FULL_ACCESS)

    percent_complete = models.IntegerField(default=0)
    comment_num = models.IntegerField(default=0)
    summary_num = models.IntegerField(default=0)
    words_shown = models.IntegerField(default=0)

    # "section_index" is a column for storing the index number of the section within the page.
    # There are some cases when wikicode does not parse a section as a section when given a whole page.
    # To prevent this, we first grab only the section(not the entire page) using "section_index" and parse it.
    section_index = models.IntegerField(default=0)

    owner = models.ForeignKey(User, null=True, on_delete=models.PROTECT)

    def __str__(self):
        return self.title

class Permissions(models.Model):
    FULL_ACCESS = 0
    COMMENT_ACCESS = 1
    SUMMARIZE_ACCESS = 2
    VIEW_ACCESS = 3
    PRIVATE_ACCESS = 4
    ACCESS_MODES = (
        (FULL_ACCESS, 'Full'),
        (COMMENT_ACCESS, 'Comment'),
        (SUMMARIZE_ACCESS, 'Summarize'),
        (VIEW_ACCESS, 'View'),
        (PRIVATE_ACCESS, 'Private'),
    )
    
    id = models.AutoField(primary_key=True)
    article = models.ForeignKey('Article', on_delete=models.CASCADE,)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    access_level = models.IntegerField(choices=ACCESS_MODES, default=FULL_ACCESS)
    
    class Meta:
        unique_together = ('article', 'user',)

@python_2_unicode_compatible
class History(models.Model):
    id = models.AutoField(primary_key=True)
    article = models.ForeignKey('Article', on_delete=models.CASCADE)
    action = models.CharField(max_length=20)
    user = models.ForeignKey(User, null=True, on_delete=models.CASCADE)
    datetime = models.DateTimeField(auto_now=True)
    comments = models.ManyToManyField('Comment')
    from_str = models.TextField()
    to_str = models.TextField()
    explanation = models.TextField()
    words_shown = models.IntegerField(default=0)
    current_percent_complete = models.IntegerField(default=0)

    def __str__(self):
        return self.action

@python_2_unicode_compatible
class Tag(models.Model):
    id = models.AutoField(primary_key=True)
    article = models.ForeignKey('Article', on_delete=models.CASCADE)
    text = models.TextField()
    color = models.CharField(max_length=6)

    def __str__(self):
        return 'Tag of %s on article %s' % (self.text, self.article.title)

class Comment(models.Model):
    id = models.AutoField(primary_key=True)
    article = models.ForeignKey('Article', on_delete=models.CASCADE)
    author = models.ForeignKey('CommentAuthor', null=True, on_delete=models.CASCADE)

    cosigners = models.ManyToManyField('CommentAuthor', related_name="cosigned_on")

    text = models.TextField()
    disqus_id = models.CharField(max_length=70)
    reply_to_disqus = models.CharField(max_length=70, null=True, blank=True)
    sibling_prev = models.CharField(max_length=70, null=True, blank=True)
    sibling_next = models.CharField(max_length=70, null=True, blank=True)
    first_child = models.CharField(max_length=70, null=True, blank=True)
    last_child = models.CharField(max_length=70, null=True, blank=True)
    num_replies = models.IntegerField(default=0)
    text_len = models.IntegerField(default=0)
    
    import_order = models.IntegerField(default=0)

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
    summarized = models.BooleanField(default=False)

    is_locked = models.BooleanField(default=False)

    vector = models.BinaryField()

    tags = models.ManyToManyField(Tag, related_name="comments")
    suggested_tags = models.ManyToManyField(Tag, related_name="suggested_comments")

    def __unicode__(self):
        return 'Comment by %s on %s' % (self.author, self.article.title)


class CommentAuthor(models.Model):
    username = models.TextField(null=True)
    user = models.ForeignKey(User, blank=True, null=True, on_delete=models.CASCADE)

    real_name = models.TextField()
    power_contrib = models.BooleanField(default=False)
    anonymous = models.BooleanField(default=False)
    reputation = models.FloatField(default=0.0)

    joined_at = models.DateTimeField(null=True)
    disqus_id = models.CharField(max_length=64, null=True)

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

    is_decide = models.BooleanField(default=False)
    is_join = models.BooleanField(default=False)

    is_wikum = models.BooleanField(default=False)

    def __unicode__(self):
        if self.anonymous:
            return self.real_name
        else:
            return self.username


class CommentRating(models.Model):
    id = models.AutoField(primary_key=True)
    comment = models.ForeignKey('Comment', on_delete=models.CASCADE)
    user = models.ForeignKey(User, null=True, on_delete=models.CASCADE)
    neutral_rating = models.IntegerField(null=True)
    coverage_rating = models.IntegerField(null=True)
    quality_rating = models.IntegerField(null=True)


class Notification(models.Model):
    recipient = models.ForeignKey(User, related_name="notification_recipient", on_delete=models.CASCADE)
    sender = models.CharField(max_length=2000, blank=False)
    date_created = models.DateTimeField(auto_now_add=True, blank=True)
    notice_type = models.ForeignKey(NoticeType, on_delete=models.CASCADE)
    seen = models.BooleanField(default=False)
    url = models.URLField(max_length=300, blank=False, null=True)
    message = models.CharField(max_length=2000, blank=False, null=True)
    content = models.CharField(max_length=2000, blank=False, null=True)
