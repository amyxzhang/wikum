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

urlpatterns = [
    url(r'^$','website.views.index'),
    url(r'^visualization','website.views.visualization'),
    url(r'^subtree_data','website.views.subtree_data'),
    url(r'^subtree','website.views.subtree'),
    url(r'^viz_data','website.views.viz_data'),
    url(r'^cluster_data','website.views.cluster_data'),
    url(r'^cluster','website.views.cluster'),
    url(r'^summary_data','website.views.summary_data'),
    url(r'^summary','website.views.summary'),
    url(r'^history','website.views.history'),
    
    url(r'^move_comments','website.views.move_comments'),
    
    url(r'^auto_summarize_comment','website.views.auto_summarize_comment'),
    
    url(r'^hide_comments','website.views.hide_comments'),
    url(r'^hide_comment','website.views.hide_comment'),
    url(r'^hide_replies','website.views.hide_replies'),
    url(r'^summarize_selected','website.views.summarize_selected'),
    url(r'^summarize_comments','website.views.summarize_comments'),
    url(r'^summarize_comment','website.views.summarize_comment'),
    
    url(r"^account/", include("account.urls")),
    url(r'^admin/', admin.site.urls),
]
