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
from django.conf.urls import url, include
from django.contrib import admin


js_info_dict = {
    'packages': ('recurrence', ),
}


urlpatterns = [
    url(r'^$','website.views.index'),
    
    url(r'^visualization_upvote','website.views.visualization_upvote'),
    url(r'^visualization_flag','website.views.visualization_flag'),
    
    url(r'^visualization','website.views.visualization'),
    url(r'^subtree_data','website.views.subtree_data'),
    url(r'^subtree','website.views.subtree'),
    url(r'^viz_data','website.views.viz_data'),
    url(r'^tags','website.views.tags'),
    url(r'^cluster_data','website.views.cluster_data'),
    url(r'^cluster','website.views.cluster'),
    url(r'^summary_data','website.views.summary_data'),
    
    url(r'^import_article', 'website.views.import_article'),
    url(r'^poll_status$', 'website.views.poll_status'),
    
    url(r'^summary1','website.views.summary1'),
    url(r'^summary2','website.views.summary2'),
    url(r'^summary3','website.views.summary3'),
    url(r'^summary4','website.views.summary4'),
    
    url(r'^summary','website.views.summary'),
    
    url(r'^history','website.views.history'),
    
    url(r'^move_comments','website.views.move_comments'),
    
    url(r'^auto_summarize_comment','website.views.auto_summarize_comment'),
    
    url(r'^rate_summary','website.views.rate_summary'),
     
    url(r'^upvote_summary','website.views.upvote_summary'),
    url(r'^downvote_summary','website.views.downvote_summary'),
    
    url(r'^hide_comments','website.views.hide_comments'),
    url(r'^hide_comment','website.views.hide_comment'),
    
    url(r'^delete_comment_summary','website.views.delete_comment_summary'),

    url(r'^suggested_tags','website.views.suggested_tags'),
    url(r'^tag_comments','website.views.tag_comments'),
    url(r'^tag_comment','website.views.tag_comment'),
    
    url(r'^hide_replies','website.views.hide_replies'),
    url(r'^summarize_selected','website.views.summarize_selected'),
    url(r'^summarize_comments','website.views.summarize_comments'),
    url(r'^summarize_comment','website.views.summarize_comment'),
    
    url(r"^account/", include("account.urls")),
    url(r'^admin/', admin.site.urls),

    url(r"^i18n/", include("django.conf.urls.i18n")),
    url(r'^jsi18n/$', 'django.views.i18n.javascript_catalog', js_info_dict),

]

