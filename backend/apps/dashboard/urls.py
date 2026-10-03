from django.urls import re_path
from apps.dashboard import views

urlpatterns = [
    re_path(r'^/dashboard/?$', views.dashboard_summary),
    re_path(r'^/history/?$', views.user_history),
]
