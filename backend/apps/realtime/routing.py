from django.urls import re_path
from apps.realtime.consumers import GroupConsumer, NotificationConsumer

websocket_urlpatterns = [
    re_path(r'^ws/groups/(?P<group_id>\d+)/?$', GroupConsumer.as_asgi()),
    re_path(r'^ws/notifications/?$', NotificationConsumer.as_asgi()),
    re_path(r'^ws/user/?$', NotificationConsumer.as_asgi()),
]
