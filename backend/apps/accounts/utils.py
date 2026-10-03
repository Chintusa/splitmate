"""
utils.py — JWT + session utilities for SplitMate accounts.

OTP generation/verification is handled by apps.email_service.otp_service.
Email sending is handled by apps.email_service.email_service.
This module is solely responsible for JWT access tokens and refresh-token rotation.
"""
import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from django.conf import settings

from apps.accounts.models import RefreshToken

logger = logging.getLogger('splitmate.auth')


# ---------------------------------------------------------------------------
# Token hashing
# ---------------------------------------------------------------------------

def hash_token(token: str) -> str:
    """SHA-256 hash of a raw token string (used for refresh tokens)."""
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


# ---------------------------------------------------------------------------
# Access tokens (short-lived JWT)
# ---------------------------------------------------------------------------

def create_access_token(user) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        'user_id': user.id,
        'email': user.email,
        'name': user.name,
        'type': 'access',
        'jti': secrets.token_hex(8),
        'iat': now,
        'exp': now + timedelta(minutes=settings.JWT_ACCESS_MINUTES),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        if payload.get('type') != 'access':
            raise jwt.InvalidTokenError("Token is not an access token")
        return payload
    except jwt.PyJWTError as e:
        raise ValueError(str(e))


# ---------------------------------------------------------------------------
# Refresh tokens (long-lived, stored as hashes)
# ---------------------------------------------------------------------------

def issue_refresh_token(user) -> tuple[str, RefreshToken]:
    raw_token = secrets.token_urlsafe(64)
    token_h = hash_token(raw_token)
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_DAYS)

    db_token = RefreshToken.objects.create(
        user=user,
        token_hash=token_h,
        expires_at=expires_at,
        revoked=False,
    )
    return raw_token, db_token


def revoke_all_refresh_tokens(user) -> int:
    """Revoke all active refresh tokens for a user (e.g. after password change)."""
    count = RefreshToken.objects.filter(user=user, revoked=False).update(revoked=True)
    logger.info("Revoked %d refresh tokens for user_id=%d", count, user.id)
    return count


# ---------------------------------------------------------------------------
# Refresh-token cookie helpers
# ---------------------------------------------------------------------------

def set_refresh_cookie(response, raw_token: str) -> None:
    max_age = settings.JWT_REFRESH_DAYS * 24 * 60 * 60
    response.set_cookie(
        key='refresh_token',
        value=raw_token,
        max_age=max_age,
        httponly=True,
        samesite='Lax',
        secure=not settings.DEBUG,
        path='/api/auth/',
    )


def clear_refresh_cookie(response) -> None:
    response.delete_cookie('refresh_token', path='/api/auth/')


# ---------------------------------------------------------------------------
# Password-reset short-lived token (signed JWT, not stored in DB)
# Used between verify-otp and reset-password steps.
# ---------------------------------------------------------------------------

def create_reset_token(email: str) -> str:
    """
    Issue a short-lived (15-min) signed token that proves the caller
    completed OTP verification for PASSWORD_RESET on the given email.
    This token is passed from the frontend between the verify and reset steps.
    """
    now = datetime.now(timezone.utc)
    payload = {
        'email': email,
        'type': 'password_reset',
        'jti': secrets.token_hex(8),
        'iat': now,
        'exp': now + timedelta(minutes=15),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')


def decode_reset_token(token: str) -> str:
    """Decode and validate a reset token. Returns the email on success."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        if payload.get('type') != 'password_reset':
            raise ValueError("Not a password reset token")
        return payload['email']
    except jwt.PyJWTError as e:
        raise ValueError(str(e))
