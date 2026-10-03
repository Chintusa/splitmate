from django.urls import re_path
from apps.activity import views

urlpatterns = [
    re_path(r'^/?$', views.list_activities),
]
