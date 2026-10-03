from django.urls import path, include

urlpatterns = [
    path('api/auth', include('apps.accounts.urls')),
    path('api/groups', include('apps.groups.urls')),
    path('api/me', include('apps.dashboard.urls')),
    path('api/notifications', include('apps.notifications.urls')),
]
