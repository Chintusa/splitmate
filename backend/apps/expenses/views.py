from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.models import User
from apps.groups.models import Membership
from apps.groups.permissions import get_group_and_check_membership
from apps.expenses.models import Expense, ExpenseSplit
from apps.expenses.serializers import ExpenseSerializer, ExpenseCreateUpdateSerializer
from apps.activity.models import Activity
from apps.realtime.events import broadcast_group_updated, broadcast_balance_updated
from core.money import equal_split, validate_exact, validate_members
from apps.notifications.dispatcher import (
    dispatch_expense_created,
    dispatch_expense_edited,
    dispatch_expense_deleted,
)


def validate_and_compute_splits(group, amount_minor, payer_id, split_type, split_member_ids, shares):
    group_member_ids = set(Membership.objects.filter(group=group).values_list('user_id', flat=True))
    group_member_ids_str = {str(uid) for uid in group_member_ids}

    if payer_id not in group_member_ids:
        raise ValueError("Payer is not a member of this group")

    if split_type == 'equal':
        if not split_member_ids:
            raise ValueError("Select at least one member for equal split")
        split_member_ids_str = [str(uid) for uid in split_member_ids]
        validate_members(group_member_ids_str, str(payer_id), split_member_ids_str)
        computed_shares = equal_split(amount_minor, split_member_ids_str)
    elif split_type == 'exact':
        if not shares:
            raise ValueError("Shares dictionary is required for exact split")
        shares_str = {str(k): int(v) for k, v in shares.items()}
        validate_members(group_member_ids_str, str(payer_id), shares_str.keys())
        computed_shares = validate_exact(amount_minor, shares_str)
    else:
        raise ValueError("Unsupported split type")

    return computed_shares


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def list_create_expenses(request, group_id):
    group = get_group_and_check_membership(group_id, request.user)

    if request.method == 'GET':
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 10))
        sort_field = request.query_params.get('sort', 'date')
        order = request.query_params.get('order', 'desc')

        db_sort = 'amount_minor' if sort_field == 'amount' else 'date'
        if order == 'desc':
            db_sort = f"-{db_sort}"

        qs = Expense.objects.filter(group=group).select_related('created_by', 'payer').prefetch_related('splits', 'splits__user').order_by(db_sort, '-created_at')
        total = qs.count()

        start = (page - 1) * page_size
        end = start + page_size
        items = qs[start:end]

        return Response({
            'items': ExpenseSerializer(items, many=True).data,
            'page': page,
            'page_size': page_size,
            'total': total
        })

    elif request.method == 'POST':
        serializer = ExpenseCreateUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        try:
            computed_shares = validate_and_compute_splits(
                group=group,
                amount_minor=data['amount_minor'],
                payer_id=data['payer_id'],
                split_type=data['split_type'],
                split_member_ids=data.get('split_member_ids'),
                shares=data.get('shares')
            )
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        payer = User.objects.get(id=data['payer_id'])

        with transaction.atomic():
            expense = Expense.objects.create(
                group=group,
                created_by=request.user,
                payer=payer,
                description=data['description'],
                amount_minor=data['amount_minor'],
                date=data['date']
            )

            splits_to_create = [
                ExpenseSplit(expense=expense, user_id=int(uid_str), share_minor=share)
                for uid_str, share in computed_shares.items()
            ]
            ExpenseSplit.objects.bulk_create(splits_to_create)

            Activity.objects.create(
                group=group,
                actor=request.user,
                type='expense_added',
                payload={
                    'expense_id': expense.id,
                    'description': expense.description,
                    'amount_minor': expense.amount_minor,
                    'payer_name': payer.name
                }
            )

        broadcast_group_updated(group.id, reason='expense_added')
        broadcast_balance_updated(group.id)

        dispatch_expense_created(expense, payer, splits_to_create, request.user)

        return Response(ExpenseSerializer(expense).data, status=status.HTTP_201_CREATED)


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def expense_detail_update_delete(request, group_id, expense_id):
    group = get_group_and_check_membership(group_id, request.user)

    try:
        expense = Expense.objects.get(id=expense_id, group=group)
    except Expense.DoesNotExist:
        return Response({'detail': 'Expense not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check permission: expense creator OR group owner
    if expense.created_by_id != request.user.id and group.owner_id != request.user.id:
        return Response({'detail': 'Only expense creator or group owner can edit/delete'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'PUT':
        serializer = ExpenseCreateUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        try:
            computed_shares = validate_and_compute_splits(
                group=group,
                amount_minor=data['amount_minor'],
                payer_id=data['payer_id'],
                split_type=data['split_type'],
                split_member_ids=data.get('split_member_ids'),
                shares=data.get('shares')
            )
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        payer = User.objects.get(id=data['payer_id'])
        prev_amount_minor = expense.amount_minor
        prev_splits = {s.user_id: s.share_minor for s in expense.splits.all()}

        with transaction.atomic():
            expense.description = data['description']
            expense.amount_minor = data['amount_minor']
            expense.payer = payer
            expense.date = data['date']
            expense.save()

            expense.splits.all().delete()
            splits_to_create = [
                ExpenseSplit(expense=expense, user_id=int(uid_str), share_minor=share)
                for uid_str, share in computed_shares.items()
            ]
            ExpenseSplit.objects.bulk_create(splits_to_create)

            Activity.objects.create(
                group=group,
                actor=request.user,
                type='expense_edited',
                payload={
                    'expense_id': expense.id,
                    'description': expense.description,
                    'amount_minor': expense.amount_minor
                }
            )

        broadcast_group_updated(group.id, reason='expense_edited')
        broadcast_balance_updated(group.id)

        dispatch_expense_edited(expense, prev_amount_minor, prev_splits, request.user)

        return Response(ExpenseSerializer(expense).data)

    elif request.method == 'DELETE':
        affected_user_ids = list(expense.splits.values_list('user_id', flat=True))
        desc = expense.description
        amt = expense.amount_minor

        with transaction.atomic():
            expense.delete()

            Activity.objects.create(
                group=group,
                actor=request.user,
                type='expense_deleted',
                payload={
                    'description': desc,
                    'amount_minor': amt
                }
            )

        broadcast_group_updated(group.id, reason='expense_deleted')
        broadcast_balance_updated(group.id)

        dispatch_expense_deleted(group, desc, amt, affected_user_ids, request.user)

        return Response({'detail': 'Expense deleted successfully'}, status=status.HTTP_200_OK)
