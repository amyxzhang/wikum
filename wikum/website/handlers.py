from django.conf import settings
from django.utils.translation import ugettext_noop as _

def create_notice_types(sender, **kwargs): 
    if "pinax.notifications" in settings.INSTALLED_APPS:
        from pinax.notifications.models import NoticeType
        print("Creating notices for wikum")
        NoticeType.create("reply_in_thread", _("Reply"), _("someone replied to your comment"))
        NoticeType.create("summary_edit", _("Summary Edited"), _("someone has edited a summary you contributed to"))
        NoticeType.create("summarize_your_comment",  _("Summarized Comment"), _("someone summarized your comment"))
    else:
        print("Skipping creation of NoticeTypes as notification app not found")