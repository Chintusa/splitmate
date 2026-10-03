from django.urls import re_path
from apps.settlements import views

urlpatterns = [
    re_path(r'^/?$', views.create_settlement),
]
