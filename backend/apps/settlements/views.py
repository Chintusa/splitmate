from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.models import User
from apps.groups.models import Membership
from apps.groups.permissions import get_group_and_check_membership
from apps.settlements.models import Settlement
from apps.settlements.serializers import SettlementSerializer, SettlementCreateSerializer
from apps.expenses.models import Expense
from apps.activity.models import Activity
from apps.realtime.events import broadcast_group_updated, broadcast_balance_updated
from core.balances import net_balances, validate_settlement
from apps.notifications.dispatcher import dispatch_settlement_created


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_settlement(request, group_id):
    group = get_group_and_check_membership(group_id, request.user)

    serializer = SettlementCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    to_user_id = serializer.validated_data['to_user_id']
    amount_minor = serializer.validated_data['amount_minor']
    from_user = request.user

    if not Membership.objects.filter(group=group, user_id=to_user_id).exists():
        return Response({'detail': 'Recipient is not a member of this group'}, status=status.HTTP_400_BAD_REQUEST)

    to_user = User.objects.get(id=to_user_id)

    # Compute raw net balances to validate settlement
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

    try:
        validate_settlement(raw_net, str(from_user.id), str(to_user_id), amount_minor)
    except ValueError as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    from_net_before = raw_net.get(str(from_user.id), 0)
    is_settled_zero = (from_net_before + amount_minor == 0)

    with transaction.atomic():
        settlement = Settlement.objects.create(
            group=group,
            from_user=from_user,
            to_user=to_user,
            amount_minor=amount_minor
        )

        Activity.objects.create(
            group=group,
            actor=from_user,
            type='settlement_created',
            payload={
                'from_user_name': from_user.name,
                'to_user_name': to_user.name,
                'amount_minor': amount_minor
            }
        )

    broadcast_group_updated(group.id, reason='settlement_created')
    broadcast_balance_updated(group.id)

    dispatch_settlement_created(settlement, from_user, to_user, group, is_settled_zero=is_settled_zero)

    return Response(SettlementSerializer(settlement).data, status=status.HTTP_201_CREATED)
