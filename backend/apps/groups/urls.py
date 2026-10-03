from django.urls import re_path, include
from apps.groups import views

urlpatterns = [
    re_path(r'^/?$', views.list_create_groups),
    re_path(r'^/(?P<group_id>\d+)/?$', views.group_detail_delete),
    re_path(r'^/(?P<group_id>\d+)/members/?$', views.add_member),
    re_path(r'^/(?P<group_id>\d+)/members/(?P<user_id>\d+)/?$', views.remove_member),
    re_path(r'^/(?P<group_id>\d+)/balances/?$', views.group_balances),
    re_path(r'^/(?P<group_id>\d+)/remind-settlement/?$', views.remind_settlement),

    re_path(r'^/(?P<group_id>\d+)/expenses', include('apps.expenses.urls')),
    re_path(r'^/(?P<group_id>\d+)/settlements', include('apps.settlements.urls')),
    re_path(r'^/(?P<group_id>\d+)/activity', include('apps.activity.urls')),
]
