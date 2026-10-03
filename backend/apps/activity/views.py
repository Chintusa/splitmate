from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.groups.permissions import get_group_and_check_membership
from apps.activity.models import Activity
from apps.activity.serializers import ActivitySerializer

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_activities(request, group_id):
    group = get_group_and_check_membership(group_id, request.user)
    activities = Activity.objects.filter(group=group).select_related('actor').order_by('-created_at')[:50]
    return Response(ActivitySerializer(activities, many=True).data)
