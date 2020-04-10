from django.conf import settings
from django.utils.translation import ugettext_noop as _

def create_notice_types(sender, **kwargs): 
    if "pinax.notifications" in settings.INSTALLED_APPS:
        from pinax.notifications.models import NoticeType
        print("Creating notices for wikum")
        NoticeType.create("reply_in_thread", _("Reply"), _("Someone replied to a comment in your comment thread"))
        NoticeType.create("subscribed_reply", _("Reply to Subscribed"), _("Someone replied to a comment you are subscribed to"))
        NoticeType.create("summary_edit", _("Summary Edited"), _("Someone has edited a summary you contributed to"))
        NoticeType.create("subscribed_edit", _("Edit to Subscribed"), _("Someone edited a summary you are subscribed to"))
        NoticeType.create("summarize_your_comment",  _("Summarized Comment"), _("Someone summarized your comment"))
        NoticeType.create("at_user",  _("Mention User"), _("Someone mentioned you in a comment"))
    else:
        print("Skipping creation of NoticeTypes as notification app not found")