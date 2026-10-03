from django.urls import re_path
from apps.expenses import views

urlpatterns = [
    re_path(r'^/?$', views.list_create_expenses),
    re_path(r'^/(?P<expense_id>\d+)/?$', views.expense_detail_update_delete),
]
