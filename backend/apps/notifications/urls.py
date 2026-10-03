from django.urls import path
from apps.notifications import views

urlpatterns = [
    path('', views.notification_list, name='notification-list'),
    path('/unread-count', views.notification_unread_count, name='notification-unread-count'),
    path('/<int:notification_id>/read', views.mark_notification_read, name='notification-mark-read'),
    path('/read-all', views.mark_all_notifications_read, name='notification-mark-all-read'),
    path('/preferences', views.notification_preferences_view, name='notification-preferences'),
]
