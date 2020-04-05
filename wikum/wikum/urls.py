"""wikum URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/1.9/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  url(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  url(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.conf.urls import url, include
    2. Add a URL to urlpatterns:  url(r'^blog/', include('blog.urls'))
"""
from django.conf.urls import include, url
from django.contrib import admin
from website import views as website_views


# js_info_dict = {
#     'domain' : 'djangojs',
#     'package': ''
# }


urlpatterns = [
    url(r'^$', website_views.index),
    
#    url(r'^visualization_upvote', website_views.visualization_upvote),
    url(r'^visualization_flag', website_views.visualization_flag),
    
    url(r'^visualization', website_views.visualization),
    
    url(r'^author_info', website_views.author_info),

    url(r'^explore_public', website_views.explore_public),
    url(r'^about', website_views.about),
    
    url(r'^add_user_perm', website_views.add_user_perm),
    url(r'^add_global_perm', website_views.add_global_perm),
    url(r'^users', website_views.users),
    
    url(r'^get_stats', website_views.get_stats),
    
    url(r'^unauthorized', website_views.unauthorized),
    
    url(r'^subtree_data', website_views.subtree_data),
    url(r'^subtree', website_views.subtree),
    url(r'^viz_data', website_views.viz_data),
    url(r'^tags_and_authors', website_views.tags_and_authors),
    url(r'^tags', website_views.tags),
    url(r'^cluster_data', website_views.cluster_data),
    url(r'^cluster', website_views.cluster),
    url(r'^summary_data', website_views.summary_data),
    
    url(r'^import_article', website_views.import_article),
    url(r'^create_wikum', website_views.create_wikum),
    url(r'^poll_status$', website_views.poll_status),
    
    url(r'^summary1', website_views.summary1),
    url(r'^summary2', website_views.summary2),
    url(r'^summary3', website_views.summary3),
    url(r'^summary4', website_views.summary4),
    
    url(r'^summary', website_views.summary),
    
    url(r'^history', website_views.history),
    url(r'^notifications_page', website_views.notifications_page),
    
    url(r'^auto_summarize_comment', website_views.auto_summarize_comment),
    url(r'^mark_comments_read', website_views.mark_comments_read),
    url(r'^subscribe_comment_replies', website_views.subscribe_comment_replies),
    url(r'^unsubscribe_comment_replies', website_views.unsubscribe_comment_replies),
    url(r'^subscribe_comment_edit', website_views.subscribe_comment_edit),
    url(r'^unsubscribe_comment_edit', website_views.unsubscribe_comment_edit),
    
    url(r'^rate_summary', website_views.rate_summary),
    url(r'^log_data', website_views.log_data),
     
    url(r'^upvote_summary', website_views.upvote_summary),
    url(r'^downvote_summary', website_views.downvote_summary),

    url(r'^suggested_tags', website_views.suggested_tags),
    
    url(r"^account/", include("account.urls")),
    url(r'^admin/', admin.site.urls),
    
    url(r"^i18n/", include("django.conf.urls.i18n")),
    
    url(r'^tracking/', include('tracking.urls')),

    url(r"^notifications/", include("pinax.notifications.urls", namespace="pinax_notifications")),
]


