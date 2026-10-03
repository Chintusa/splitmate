import pytest
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.accounts.utils import create_access_token
from apps.groups.models import Group, Membership
from apps.expenses.models import Expense

@pytest.mark.django_db
def test_groups_and_expenses_flow():
    alice = User.objects.create_user(email='alice@test.com', name='Alice', password='pass')
    bob = User.objects.create_user(email='bob@test.com', name='Bob', password='pass')
    charlie = User.objects.create_user(email='charlie@test.com', name='Charlie', password='pass')

    token_alice = create_access_token(alice)
    token_bob = create_access_token(bob)
    token_charlie = create_access_token(charlie)

    client_a = APIClient()
    client_a.credentials(HTTP_AUTHORIZATION=f'Bearer {token_alice}')

    client_b = APIClient()
    client_b.credentials(HTTP_AUTHORIZATION=f'Bearer {token_bob}')

    client_c = APIClient()
    client_c.credentials(HTTP_AUTHORIZATION=f'Bearer {token_charlie}')

    # 1. Alice creates group
    res = client_a.post('/api/groups', {'name': 'Trip'}, format='json')
    assert res.status_code == 201
    group_id = res.data['id']

    # 2. Add Bob to group
    res_add = client_a.post(f'/api/groups/{group_id}/members', {'email': 'bob@test.com'}, format='json')
    assert res_add.status_code == 201

    # Non-member Charlie gets blocked
    res_blocked = client_c.get(f'/api/groups/{group_id}')
    assert res_blocked.status_code == 403

    # 3. Equal split expense created by Alice (10000 = 100.00 minor)
    res_exp = client_a.post(f'/api/groups/{group_id}/expenses', {
        'description': 'Hotel',
        'amount_minor': 10000,
        'payer_id': alice.id,
        'date': '2026-09-30',
        'split_type': 'equal',
        'split_member_ids': [alice.id, bob.id]
    }, format='json')
    assert res_exp.status_code == 201
    exp_id = res_exp.data['id']
    assert len(res_exp.data['splits']) == 2

    # 4. Non-creator/non-owner Bob tries to delete expense -> 403
    res_del_b = client_b.delete(f'/api/groups/{group_id}/expenses/{exp_id}')
    assert res_del_b.status_code == 403

    # 5. Creator Alice edits expense to exact split
    res_edit = client_a.put(f'/api/groups/{group_id}/expenses/{exp_id}', {
        'description': 'Hotel Lux',
        'amount_minor': 10000,
        'payer_id': alice.id,
        'date': '2026-09-30',
        'split_type': 'exact',
        'shares': {str(alice.id): 6000, str(bob.id): 4000}
    }, format='json')
    assert res_edit.status_code == 200

    # 6. Pagination & sorting
    res_list = client_b.get(f'/api/groups/{group_id}/expenses?page=1&page_size=10&sort=date&order=desc')
    assert res_list.status_code == 200
    assert res_list.data['total'] == 1
    assert len(res_list.data['items']) == 1

    # 7. Non-zero balance member removal blocked (Bob owes Alice 4000)
    res_rem = client_a.delete(f'/api/groups/{group_id}/members/{bob.id}')
    assert res_rem.status_code == 409
