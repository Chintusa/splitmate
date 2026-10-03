from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.notifications.models import Notification, NotificationPreference
from apps.notifications.serializers import (
    NotificationSerializer,
    NotificationPreferenceSerializer,
)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notification_list(request):
    """
    GET /api/notifications
    Query params:
      - page (int, default 1)
      - page_size (int, default 20)
      - unread_only (bool, default false)
    """
    page = int(request.query_params.get('page', 1))
    page_size = int(request.query_params.get('page_size', 20))
    unread_only = request.query_params.get('unread_only', '').lower() in ('true', '1')

    qs = Notification.objects.filter(user=request.user).select_related('group')
    if unread_only:
        qs = qs.filter(is_read=False)

    total = qs.count()
    start = (page - 1) * page_size
    end = start + page_size
    items = qs[start:end]

    serializer = NotificationSerializer(items, many=True)
    return Response({
        'items': serializer.data,
        'page': page,
        'page_size': page_size,
        'total': total,
        'unread_count': Notification.objects.filter(user=request.user, is_read=False).count(),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notification_unread_count(request):
    """
    GET /api/notifications/unread-count
    Returns count of unread notifications for the header bell badge.
    """
    count = Notification.objects.filter(user=request.user, is_read=False).count()
    return Response({'unread_count': count})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    """
    POST /api/notifications/<id>/read
    Marks a single notification as read.
    """
    try:
        notif = Notification.objects.get(id=notification_id, user=request.user)
    except Notification.DoesNotExist:
        return Response({'detail': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)

    if not notif.is_read:
        notif.is_read = True
        notif.read_at = timezone.now()
        notif.save(update_fields=['is_read', 'read_at'])

    return Response(NotificationSerializer(notif).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read(request):
    """
    POST /api/notifications/read-all
    Marks all notifications for current user as read.
    """
    now = timezone.now()
    updated_count = Notification.objects.filter(
        user=request.user,
        is_read=False,
    ).update(is_read=True, read_at=now)

    return Response({
        'detail': f'Marked {updated_count} notifications as read.',
        'updated_count': updated_count,
    })


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def notification_preferences_view(request):
    """
    GET /api/notifications/preferences
    PUT/PATCH /api/notifications/preferences
    """
    prefs = NotificationPreference.get_for_user(request.user)

    if request.method == 'GET':
        return Response(NotificationPreferenceSerializer(prefs).data)

    serializer = NotificationPreferenceSerializer(
        prefs,
        data=request.data,
        partial=(request.method == 'PATCH'),
    )
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    serializer.save()
    return Response(serializer.data)
