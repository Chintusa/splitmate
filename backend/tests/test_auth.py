"""
test_auth.py — Core authentication flow tests (login, refresh, logout, JWT).
OTP-specific tests are in test_otp.py.
"""
import pytest
from rest_framework.test import APIClient
from apps.accounts.models import User, RefreshToken
from apps.accounts.utils import hash_token, issue_refresh_token, create_access_token


def make_verified_user(email='user1@test.com', name='User One', password='Password1'):
    u = User.objects.create_user(email=email, name=name, password=password)
    u.is_email_verified = True
    u.save()
    return u


@pytest.mark.django_db
def test_login_refresh_logout_flow():
    client = APIClient()
    make_verified_user()

    # 1. Login
    res = client.post('/api/auth/login', {
        'email': 'user1@test.com',
        'password': 'Password1',
    }, format='json')
    assert res.status_code == 200
    assert 'access_token' in res.data
    assert 'user' in res.data
    assert res.data['user']['email'] == 'user1@test.com'
    assert 'refresh_token' in res.cookies

    access_token = res.data['access_token']
    refresh_cookie = res.cookies['refresh_token'].value

    # 2. Get me
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
    res_me = client.get('/api/auth/me')
    assert res_me.status_code == 200
    assert res_me.data['user']['email'] == 'user1@test.com'

    # 3. Refresh token rotation
    client.credentials()
    client.cookies['refresh_token'] = refresh_cookie
    res_refresh = client.post('/api/auth/refresh')
    assert res_refresh.status_code == 200
    assert 'access_token' in res_refresh.data
    new_access = res_refresh.data['access_token']
    new_refresh_cookie = res_refresh.cookies['refresh_token'].value
    assert new_access != access_token
    assert new_refresh_cookie != refresh_cookie

    # Old refresh token should be revoked
    client.cookies['refresh_token'] = refresh_cookie
    res_old = client.post('/api/auth/refresh')
    assert res_old.status_code == 401

    # 4. Logout
    client.cookies['refresh_token'] = new_refresh_cookie
    res_logout = client.post('/api/auth/logout')
    assert res_logout.status_code == 200

    # Token revoked after logout
    res_revoked = client.post('/api/auth/refresh')
    assert res_revoked.status_code == 401


@pytest.mark.django_db
def test_invalid_login():
    client = APIClient()
    make_verified_user(email='test@test.com')

    res = client.post('/api/auth/login', {
        'email': 'test@test.com',
        'password': 'wrongpassword',
    }, format='json')
    assert res.status_code == 401


@pytest.mark.django_db
def test_unauthorized_access():
    client = APIClient()
    res = client.get('/api/groups')
    assert res.status_code == 401


@pytest.mark.django_db
def test_me_requires_authentication():
    client = APIClient()
    res = client.get('/api/auth/me')
    assert res.status_code == 401


@pytest.mark.django_db
def test_access_token_attached_correctly():
    client = APIClient()
    user = make_verified_user(email='token@test.com')
    token = create_access_token(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    res = client.get('/api/auth/me')
    assert res.status_code == 200
    assert res.data['user']['email'] == 'token@test.com'
