from rest_framework.exceptions import PermissionDenied, NotFound
from apps.groups.models import Group, Membership

def get_group_and_check_membership(group_id, user):
    try:
        group = Group.objects.get(id=group_id)
    except Group.DoesNotExist:
        raise NotFound("Group not found")

    if not Membership.objects.filter(group=group, user=user).exists():
        raise PermissionDenied("You are not a member of this group")

    return group

def check_group_owner(group, user):
    if group.owner_id != user.id:
        raise PermissionDenied("Only the group owner can perform this action")
