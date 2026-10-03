from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.models import User
from apps.groups.models import Group, Membership
from apps.groups.serializers import GroupSerializer, GroupCreateSerializer, AddMemberSerializer
from apps.groups.permissions import get_group_and_check_membership, check_group_owner
from apps.groups.services import calculate_group_balances
from apps.activity.models import Activity
from apps.realtime.events import broadcast_group_updated, broadcast_balance_updated
from core.balances import net_balances, can_remove_member
from apps.expenses.models import Expense
from apps.settlements.models import Settlement
from apps.notifications.dispatcher import (
    dispatch_group_created,
    dispatch_member_added,
    dispatch_member_removed,
    dispatch_group_deleted,
    dispatch_settlement_reminder,
)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def list_create_groups(request):
    if request.method == 'GET':
        memberships = Membership.objects.filter(user=request.user).select_related('group', 'group__owner')
        groups = [m.group for m in memberships]
        serializer = GroupSerializer(groups, many=True, context={'request': request})
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = GroupCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            group = Group.objects.create(
                name=serializer.validated_data['name'],
                owner=request.user
            )
            Membership.objects.create(group=group, user=request.user)
            Activity.objects.create(
                group=group,
                actor=request.user,
                type='member_added',
                payload={'user_name': request.user.name, 'user_id': request.user.id}
            )

        dispatch_group_created(group, request.user)
        return Response(GroupSerializer(group, context={'request': request}).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def group_detail_delete(request, group_id):
    group = get_group_and_check_membership(group_id, request.user)

    if request.method == 'GET':
        return Response(GroupSerializer(group, context={'request': request}).data)

    elif request.method == 'DELETE':
        check_group_owner(group, request.user)
        members = [m.user for m in group.memberships.select_related('user').all()]
        group_name = group.name
        gid = group.id

        group.delete()
        dispatch_group_deleted(group_name, gid, members, request.user)

        return Response({'detail': 'Group deleted successfully'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_member(request, group_id):
    group = get_group_and_check_membership(group_id, request.user)
    check_group_owner(group, request.user)

    serializer = AddMemberSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data.get('email')
    user_id = serializer.validated_data.get('user_id')

    target_user = None
    if email:
        target_user = User.objects.filter(email__iexact=email).first()
    elif user_id:
        target_user = User.objects.filter(id=user_id).first()

    if not target_user:
        return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    if Membership.objects.filter(group=group, user=target_user).exists():
        return Response({'detail': 'User is already a member of this group'}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        Membership.objects.create(group=group, user=target_user)
        Activity.objects.create(
            group=group,
            actor=request.user,
            type='member_added',
            payload={'user_id': target_user.id, 'user_name': target_user.name}
        )

    broadcast_group_updated(group.id, reason='member_added')
    broadcast_balance_updated(group.id)

    dispatch_member_added(group, target_user, request.user)

    return Response({'detail': f'{target_user.name} added to group'}, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_member(request, group_id, user_id):
    group = get_group_and_check_membership(group_id, request.user)
    check_group_owner(group, request.user)

    if user_id == group.owner_id:
        return Response({'detail': 'Group owner cannot be removed'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        membership = Membership.objects.get(group=group, user_id=user_id)
    except Membership.DoesNotExist:
        return Response({'detail': 'Member not found in this group'}, status=status.HTTP_404_NOT_FOUND)

    # Check non-zero balance
    exp_qs = Expense.objects.filter(group=group).prefetch_related('splits')
    exp_list = [{
        'payer': str(e.payer_id),
        'amount': e.amount_minor,
        'shares': {str(s.user_id): s.share_minor for s in e.splits.all()}
    } for e in exp_qs]

    sett_qs = Settlement.objects.filter(group=group)
    sett_list = [{
        'from_user': str(s.from_user_id),
        'to_user': str(s.to_user_id),
        'amount': s.amount_minor
    } for s in sett_qs]

    raw_net = net_balances(exp_list, sett_list)
    if not can_remove_member(raw_net, str(user_id)):
        return Response({
            'detail': 'Cannot remove member with non-zero balance. Outstanding debts must be settled first.'
        }, status=status.HTTP_409_CONFLICT)

    target_user = membership.user
    with transaction.atomic():
        membership.delete()
        Activity.objects.create(
            group=group,
            actor=request.user,
            type='member_removed',
            payload={'user_id': target_user.id, 'user_name': target_user.name}
        )

    broadcast_group_updated(group.id, reason='member_removed')
    broadcast_balance_updated(group.id)

    dispatch_member_removed(group, target_user, request.user)

    return Response({'detail': 'Member removed successfully'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def group_balances(request, group_id):
    get_group_and_check_membership(group_id, request.user)
    balances_data = calculate_group_balances(group_id)
    return Response(balances_data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def remind_settlement(request, group_id):
    group = get_group_and_check_membership(group_id, request.user)
    to_user_id = request.data.get('to_user_id')

    if not to_user_id:
        return Response({'detail': 'to_user_id is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        target_user = User.objects.get(id=int(to_user_id))
    except (User.DoesNotExist, ValueError):
        return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    if not Membership.objects.filter(group=group, user=target_user).exists():
        return Response({'detail': 'Target user is not a member of this group'}, status=status.HTTP_400_BAD_REQUEST)

    balances = calculate_group_balances(group_id)
    debt_amount = 0
    for debt in balances.get('simplified_debts', []):
        if debt['from_user_id'] == target_user.id and debt['to_user_id'] == request.user.id:
            debt_amount += debt['amount_minor']

    if debt_amount <= 0:
        return Response({'detail': 'No pending balance owed by this member.'}, status=status.HTTP_400_BAD_REQUEST)

    delivered = dispatch_settlement_reminder(group, creditor=request.user, debtor=target_user, amount_minor=debt_amount)
    if delivered is False:
        return Response(
            {'detail': 'A settlement reminder was already sent recently. Please wait before sending another.'},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    return Response({'detail': f'Settlement reminder sent to {target_user.name}.'}, status=status.HTTP_200_OK)
