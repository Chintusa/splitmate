from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.groups.models import Group
from apps.groups.services import calculate_group_balances
from apps.activity.models import Activity
from apps.activity.serializers import ActivitySerializer
from apps.expenses.models import Expense
from apps.expenses.serializers import ExpenseSerializer
from apps.settlements.models import Settlement
from apps.settlements.serializers import SettlementSerializer

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):
    user = request.user
    user_groups = Group.objects.filter(memberships__user=user)

    total_owed_by_me = 0
    total_owed_to_me = 0
    most_owed_group = None
    max_owe_amount = 0

    for group in user_groups:
        balances = calculate_group_balances(group.id)
        user_net = 0
        for item in balances['net_balances']:
            if item['user_id'] == user.id:
                user_net = item['net_minor']
                break

        if user_net < 0:
            owe = abs(user_net)
            total_owed_by_me += owe
            if owe > max_owe_amount:
                max_owe_amount = owe
                most_owed_group = {
                    'id': group.id,
                    'name': group.name,
                    'amount_minor': owe
                }
        elif user_net > 0:
            total_owed_to_me += user_net

    net_balance = total_owed_to_me - total_owed_by_me

    recent_acts = Activity.objects.filter(group__in=user_groups).select_related('actor', 'group').order_by('-created_at')[:10]

    return Response({
        'total_owed_by_me': total_owed_by_me,
        'total_owed_to_me': total_owed_to_me,
        'net_balance': net_balance,
        'group_count': user_groups.count(),
        'group_where_i_owe_most': most_owed_group,
        'recent_activities': ActivitySerializer(recent_acts, many=True).data
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_history(request):
    user = request.user
    user_groups = Group.objects.filter(memberships__user=user)

    page = int(request.query_params.get('page', 1))
    page_size = int(request.query_params.get('page_size', 20))

    expenses = Expense.objects.filter(
        Q(payer=user) | Q(splits__user=user),
        group__in=user_groups
    ).distinct().select_related('created_by', 'payer', 'group').prefetch_related('splits', 'splits__user')

    settlements = Settlement.objects.filter(
        Q(from_user=user) | Q(to_user=user),
        group__in=user_groups
    ).select_related('from_user', 'to_user', 'group')

    combined = []
    for e in expenses:
        combined.append({
            'type': 'expense',
            'created_at': e.created_at.isoformat(),
            'data': ExpenseSerializer(e).data,
            'group_name': e.group.name
        })
    for s in settlements:
        combined.append({
            'type': 'settlement',
            'created_at': s.created_at.isoformat(),
            'data': SettlementSerializer(s).data,
            'group_name': s.group.name
        })

    combined.sort(key=lambda x: x['created_at'], reverse=True)
    total = len(combined)

    start = (page - 1) * page_size
    end = start + page_size
    items = combined[start:end]

    return Response({
        'items': items,
        'page': page,
        'page_size': page_size,
        'total': total
    })
