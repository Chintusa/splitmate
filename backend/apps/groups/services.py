from apps.expenses.models import Expense
from apps.settlements.models import Settlement
from apps.groups.models import Membership
from apps.accounts.models import User
from core.balances import net_balances, simplify

def calculate_group_balances(group_id: int):
    # Fetch expenses with splits
    expenses_qs = Expense.objects.filter(group_id=group_id).prefetch_related('splits')
    exp_list = []
    for e in expenses_qs:
        shares_dict = {str(s.user_id): s.share_minor for s in e.splits.all()}
        exp_list.append({
            'payer': str(e.payer_id),
            'amount': e.amount_minor,
            'shares': shares_dict
        })

    # Fetch settlements
    settlements_qs = Settlement.objects.filter(group_id=group_id)
    sett_list = []
    for s in settlements_qs:
        sett_list.append({
            'from_user': str(s.from_user_id),
            'to_user': str(s.to_user_id),
            'amount': s.amount_minor
        })

    raw_net = net_balances(exp_list, sett_list)

    # Get all members of the group to ensure everyone has an entry
    memberships = Membership.objects.filter(group_id=group_id).select_related('user')
    user_map = {str(m.user.id): m.user for m in memberships}

    net_list = []
    for uid_str, user_obj in user_map.items():
        net_val = raw_net.get(uid_str, 0)
        net_list.append({
            'user_id': user_obj.id,
            'user_name': user_obj.name,
            'user_email': user_obj.email,
            'net_minor': net_val
        })

    debts_tuples = simplify(raw_net)
    debts_list = []
    for debtor_str, creditor_str, amt in debts_tuples:
        debtor_obj = user_map.get(debtor_str) or User.objects.filter(id=int(debtor_str)).first()
        creditor_obj = user_map.get(creditor_str) or User.objects.filter(id=int(creditor_str)).first()
        debts_list.append({
            'from_user_id': int(debtor_str),
            'from_user_name': debtor_obj.name if debtor_obj else f"User #{debtor_str}",
            'to_user_id': int(creditor_str),
            'to_user_name': creditor_obj.name if creditor_obj else f"User #{creditor_str}",
            'amount_minor': amt
        })

    return {
        'net_balances': net_list,
        'simplified_debts': debts_list
    }
