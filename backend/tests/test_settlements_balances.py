import pytest
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.accounts.utils import create_access_token
from apps.groups.models import Group, Membership
from apps.expenses.models import Expense, ExpenseSplit

@pytest.mark.django_db
def test_settlements_and_balances_flow():
    alice = User.objects.create_user(email='alice@test.com', name='Alice', password='pass')
    bob = User.objects.create_user(email='bob@test.com', name='Bob', password='pass')

    group = Group.objects.create(name='Dinner Group', owner=alice)
    Membership.objects.create(group=group, user=alice)
    Membership.objects.create(group=group, user=bob)

    # Alice pays 10000, split 5000 / 5000
    exp = Expense.objects.create(group=group, created_by=alice, payer=alice, description='Food', amount_minor=10000, date='2026-09-30')
    ExpenseSplit.objects.create(expense=exp, user=alice, share_minor=5000)
    ExpenseSplit.objects.create(expense=exp, user=bob, share_minor=5000)

    token_bob = create_access_token(bob)
    client_b = APIClient()
    client_b.credentials(HTTP_AUTHORIZATION=f'Bearer {token_bob}')

    # Check balances
    res_bal = client_b.get(f'/api/groups/{group.id}/balances')
    assert res_bal.status_code == 200
    assert len(res_bal.data['simplified_debts']) == 1
    assert res_bal.data['simplified_debts'][0]['from_user_id'] == bob.id
    assert res_bal.data['simplified_debts'][0]['amount_minor'] == 5000

    # Bob settles 5000 with Alice
    res_settle = client_b.post(f'/api/groups/{group.id}/settlements', {
        'to_user_id': alice.id,
        'amount_minor': 5000
    }, format='json')
    assert res_settle.status_code == 201

    # After settlement, balances should be zero
    res_bal_after = client_b.get(f'/api/groups/{group.id}/balances')
    assert res_bal_after.status_code == 200
    assert len(res_bal_after.data['simplified_debts']) == 0

    # Now Bob can be removed
    token_alice = create_access_token(alice)
    client_a = APIClient()
    client_a.credentials(HTTP_AUTHORIZATION=f'Bearer {token_alice}')
    res_rem = client_a.delete(f'/api/groups/{group.id}/members/{bob.id}')
    assert res_rem.status_code == 200
