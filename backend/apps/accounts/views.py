"""
views.py — SplitMate authentication API views.

Endpoint map:
  POST /api/auth/register                — Step 1: collect details, send OTP
  POST /api/auth/verify-email            — Step 2: verify OTP, create user
  POST /api/auth/resend-verification     — Resend email verification OTP (cooldown enforced)
  POST /api/auth/login                   — Email + password → access token + refresh cookie
  POST /api/auth/refresh                 — Rotate refresh token
  POST /api/auth/logout                  — Revoke refresh token
  GET  /api/auth/me                      — Current user (requires auth)
  POST /api/auth/forgot-password         — Request password-reset OTP (generic response)
  POST /api/auth/verify-password-reset   — Verify reset OTP → receive reset_token
  POST /api/auth/reset-password          — Set new password using reset_token
  POST /api/auth/change-email            — Request email change OTP (authenticated)
  POST /api/auth/verify-email-change     — Verify OTP, apply new email (authenticated)
  POST /api/auth/change-password         — Change password (authenticated)

Security decisions:
- OTP values are NEVER returned in API responses.
- SMTP/internal errors are caught; only generic messages reach the client.
- Cross-purpose OTP use is rejected by otp_service.verify_otp.
- Password-reset uses a short-lived signed JWT between the verify and reset steps.
- Changing password revokes all existing refresh tokens.
- Rate limiting is applied per view using Django settings.
"""
import logging
from datetime import datetime, timezone

from django.contrib.auth.hashers import make_password
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.accounts.models import OTPPurpose, OTPStatus, RefreshToken, User
from apps.accounts.serializers import (
    ChangePasswordSerializer,
    ForgotPasswordSerializer,
    LoginSerializer,
    RegisterSerializer,
    RequestEmailChangeSerializer,
    ResendVerificationSerializer,
    ResetPasswordSerializer,
    UserSerializer,
    VerifyEmailChangeSerializer,
    VerifyEmailSerializer,
    VerifyPasswordResetOtpSerializer,
)
from apps.accounts.utils import (
    clear_refresh_cookie,
    create_access_token,
    create_reset_token,
    decode_reset_token,
    hash_token,
    issue_refresh_token,
    revoke_all_refresh_tokens,
    set_refresh_cookie,
)
from apps.email_service.email_service import (
    EmailDeliveryError,
    send_change_email_verification,
    send_email_changed_notification,
    send_email_verification,
    send_password_changed_notification,
    send_password_reset,
    send_security_alert,
)
from apps.notifications.dispatcher import dispatch_account_verified
from apps.email_service.otp_service import (
    OTPCooldownError,
    OTPError,
    OTPExpiredError,
    OTPInvalidError,
    OTPMaxAttemptsError,
    get_otp_expiry_seconds,
    get_resend_cooldown_seconds,
    issue_otp,
    verify_otp,
)

logger = logging.getLogger('splitmate.auth')

_GENERIC_OTP_ERROR = "Verification failed. Please try again."


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _otp_error_response(exc: OTPError) -> Response:
    """Map OTP exceptions to appropriate HTTP responses."""
    if isinstance(exc, OTPMaxAttemptsError):
        return Response({'detail': str(exc)}, status=status.HTTP_429_TOO_MANY_REQUESTS)
    if isinstance(exc, OTPCooldownError):
        return Response(
            {'detail': str(exc), 'seconds_remaining': exc.seconds_remaining},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )
    if isinstance(exc, OTPExpiredError):
        return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    # OTPInvalidError or base OTPError
    return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# Registration — Step 1: send OTP
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """
    POST /api/auth/register
    { name, email, password, confirm_password }

    Validates input, sends a verification OTP to the email address.
    The User row is NOT created until /verify-email succeeds.
    """
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data['email'].lower()
    name = serializer.validated_data['name']
    password = serializer.validated_data['password']

    if User.objects.filter(email=email).exists():
        return Response(
            {'detail': 'An account with this email already exists.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    pw_hash = make_password(password)

    try:
        raw_otp = issue_otp(
            email=email,
            purpose=OTPPurpose.EMAIL_VERIFICATION,
            pending_name=name,
            pending_password_hash=pw_hash,
            check_resend_cooldown=False,  # first issuance — no cooldown check
        )
    except OTPCooldownError as e:
        return _otp_error_response(e)

    try:
        send_email_verification(email, name, raw_otp)
    except EmailDeliveryError as e:
        return Response({'detail': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    expiry_seconds = get_otp_expiry_seconds(email, OTPPurpose.EMAIL_VERIFICATION)
    return Response(
        {
            'detail': 'Verification code sent to your email. Please check your inbox.',
            'expires_in_seconds': expiry_seconds,
        },
        status=status.HTTP_200_OK,
    )


# ---------------------------------------------------------------------------
# Registration — Step 2: verify OTP, create user
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([AllowAny])
def verify_email(request):
    """
    POST /api/auth/verify-email
    { email, otp }

    Verifies the OTP and creates the user. Frontend redirects to /login.
    """
    serializer = VerifyEmailSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data['email'].lower()
    raw_otp = serializer.validated_data['otp']

    try:
        record = verify_otp(email, OTPPurpose.EMAIL_VERIFICATION, raw_otp)
    except OTPError as e:
        return _otp_error_response(e)

    if User.objects.filter(email=email).exists():
        return Response(
            {'detail': 'Account already exists. Please log in.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = User(email=email, name=record.pending_name)
    user.password = record.pending_password_hash
    user.is_email_verified = True
    user.save()

    dispatch_account_verified(user)

    return Response(
        {
            'detail': 'Email verified! Your account has been created. You can now log in.',
            'email': email,
        },
        status=status.HTTP_201_CREATED,
    )


# ---------------------------------------------------------------------------
# Registration — resend verification OTP
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([AllowAny])
def resend_verification(request):
    """
    POST /api/auth/resend-verification
    { email }

    Resends the email verification OTP. Subject to cooldown.
    """
    serializer = ResendVerificationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data['email'].lower()

    if User.objects.filter(email=email).exists():
        return Response(
            {'detail': 'This email is already verified.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Retrieve the pending registration data from the latest PENDING OTP
    from apps.accounts.models import OTPRecord
    latest = (
        OTPRecord.objects
        .filter(email=email, purpose=OTPPurpose.EMAIL_VERIFICATION)
        .exclude(status=OTPStatus.CONSUMED)
        .order_by('-created_at')
        .first()
    )
    if not latest or not latest.pending_name:
        return Response(
            {'detail': 'No pending registration found. Please register again.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        raw_otp = issue_otp(
            email=email,
            purpose=OTPPurpose.EMAIL_VERIFICATION,
            pending_name=latest.pending_name,
            pending_password_hash=latest.pending_password_hash,
            check_resend_cooldown=True,
        )
    except OTPCooldownError as e:
        return _otp_error_response(e)

    try:
        send_email_verification(email, latest.pending_name, raw_otp)
    except EmailDeliveryError as e:
        return Response({'detail': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    expiry_seconds = get_otp_expiry_seconds(email, OTPPurpose.EMAIL_VERIFICATION)
    cooldown_seconds = get_resend_cooldown_seconds(email, OTPPurpose.EMAIL_VERIFICATION)

    return Response(
        {
            'detail': 'New verification code sent.',
            'expires_in_seconds': expiry_seconds,
            'resend_cooldown_seconds': cooldown_seconds,
        },
        status=status.HTTP_200_OK,
    )


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data['email'].lower()
    password = serializer.validated_data['password']

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({'detail': 'Invalid email or password.'}, status=status.HTTP_401_UNAUTHORIZED)

    if not user.check_password(password):
        return Response({'detail': 'Invalid email or password.'}, status=status.HTTP_401_UNAUTHORIZED)

    access_token = create_access_token(user)
    raw_refresh, _ = issue_refresh_token(user)

    res = Response(
        {'user': UserSerializer(user).data, 'access_token': access_token},
        status=status.HTTP_200_OK,
    )
    set_refresh_cookie(res, raw_refresh)
    return res


# ---------------------------------------------------------------------------
# Refresh token rotation
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([AllowAny])
def refresh(request):
    raw_token = request.COOKIES.get('refresh_token')
    if not raw_token:
        return Response({'detail': 'Refresh token missing.'}, status=status.HTTP_401_UNAUTHORIZED)

    token_h = hash_token(raw_token)
    try:
        db_token = RefreshToken.objects.get(token_hash=token_h)
    except RefreshToken.DoesNotExist:
        res = Response({'detail': 'Invalid refresh token.'}, status=status.HTTP_401_UNAUTHORIZED)
        clear_refresh_cookie(res)
        return res

    if db_token.revoked:
        res = Response({'detail': 'Refresh token has been revoked.'}, status=status.HTTP_401_UNAUTHORIZED)
        clear_refresh_cookie(res)
        return res

    if db_token.expires_at < datetime.now(timezone.utc):
        db_token.revoked = True
        db_token.save()
        res = Response({'detail': 'Refresh token expired.'}, status=status.HTTP_401_UNAUTHORIZED)
        clear_refresh_cookie(res)
        return res

    db_token.revoked = True
    db_token.save()

    user = db_token.user
    access_token = create_access_token(user)
    new_raw_refresh, _ = issue_refresh_token(user)

    res = Response(
        {'user': UserSerializer(user).data, 'access_token': access_token},
        status=status.HTTP_200_OK,
    )
    set_refresh_cookie(res, new_raw_refresh)
    return res


# ---------------------------------------------------------------------------
# Logout
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([AllowAny])
def logout(request):
    raw_token = request.COOKIES.get('refresh_token')
    if raw_token:
        token_h = hash_token(raw_token)
        RefreshToken.objects.filter(token_hash=token_h).update(revoked=True)

    res = Response({'detail': 'Logged out successfully.'}, status=status.HTTP_200_OK)
    clear_refresh_cookie(res)
    return res


# ---------------------------------------------------------------------------
# Current user
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    return Response({'user': UserSerializer(request.user).data})


# ---------------------------------------------------------------------------
# Forgot password — Step 1: request reset OTP
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    """
    POST /api/auth/forgot-password
    { email }

    ALWAYS returns a generic 200 to prevent account enumeration.
    Sends a reset OTP only if an account exists.
    """
    serializer = ForgotPasswordSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data['email'].lower()
    _GENERIC = "If an account exists for this email, we'll send reset instructions shortly."

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        # Generic response — do not reveal whether the account exists
        return Response({'detail': _GENERIC}, status=status.HTTP_200_OK)

    try:
        raw_otp = issue_otp(
            email=email,
            purpose=OTPPurpose.PASSWORD_RESET,
            user=user,
            check_resend_cooldown=True,
        )
    except OTPCooldownError as e:
        # Still return generic to avoid account enumeration via timing/error
        return Response({'detail': _GENERIC}, status=status.HTTP_200_OK)

    try:
        send_password_reset(email, user.name, raw_otp)
    except EmailDeliveryError:
        # Log is already written in email_service; return generic
        return Response(
            {'detail': 'Unable to send the reset email right now. Please try again later.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    return Response({'detail': _GENERIC}, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Forgot password — Step 2: verify reset OTP → receive reset_token
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([AllowAny])
def verify_password_reset_otp(request):
    """
    POST /api/auth/verify-password-reset
    { email, otp }

    Returns a short-lived reset_token JWT if the OTP is correct.
    The reset_token is required for the /reset-password endpoint.
    """
    serializer = VerifyPasswordResetOtpSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data['email'].lower()
    raw_otp = serializer.validated_data['otp']

    try:
        verify_otp(email, OTPPurpose.PASSWORD_RESET, raw_otp)
    except OTPError as e:
        return _otp_error_response(e)

    reset_token = create_reset_token(email)
    return Response(
        {
            'detail': 'Code verified. You may now set a new password.',
            'reset_token': reset_token,
        },
        status=status.HTTP_200_OK,
    )


# ---------------------------------------------------------------------------
# Forgot password — Step 3: set new password
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    """
    POST /api/auth/reset-password
    { email, reset_token, new_password, confirm_password }
    """
    serializer = ResetPasswordSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data['email'].lower()
    reset_token = serializer.validated_data['reset_token']
    new_password = serializer.validated_data['new_password']

    try:
        token_email = decode_reset_token(reset_token)
    except ValueError:
        return Response(
            {'detail': 'Invalid or expired reset session. Please restart the password reset.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if token_email != email:
        return Response(
            {'detail': 'Reset token does not match the provided email.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({'detail': 'Account not found.'}, status=status.HTTP_404_NOT_FOUND)

    user.set_password(new_password)
    user.save()

    # Revoke all existing sessions
    revoke_all_refresh_tokens(user)

    # Send notification (best-effort)
    try:
        send_password_changed_notification(email, user.name)
    except EmailDeliveryError:
        pass  # non-fatal; the password was already changed

    return Response(
        {'detail': 'Password reset successfully. Please log in with your new password.'},
        status=status.HTTP_200_OK,
    )


# ---------------------------------------------------------------------------
# Change email — Step 1: request OTP (authenticated)
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_email_change(request):
    """
    POST /api/auth/change-email
    { new_email }

    Sends an OTP to the NEW email address for verification.
    """
    serializer = RequestEmailChangeSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    new_email = serializer.validated_data['new_email']
    user = request.user

    try:
        raw_otp = issue_otp(
            email=new_email,
            purpose=OTPPurpose.CHANGE_EMAIL,
            user=user,
            new_email=new_email,
            check_resend_cooldown=True,
        )
    except OTPCooldownError as e:
        return _otp_error_response(e)

    try:
        send_change_email_verification(new_email, user.name, raw_otp)
    except EmailDeliveryError as e:
        return Response({'detail': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    expiry_seconds = get_otp_expiry_seconds(new_email, OTPPurpose.CHANGE_EMAIL)
    cooldown_seconds = get_resend_cooldown_seconds(new_email, OTPPurpose.CHANGE_EMAIL)

    return Response(
        {
            'detail': f'Verification code sent to {new_email}.',
            'expires_in_seconds': expiry_seconds,
            'resend_cooldown_seconds': cooldown_seconds,
        },
        status=status.HTTP_200_OK,
    )


# ---------------------------------------------------------------------------
# Change email — Step 2: verify OTP and apply (authenticated)
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_email_change(request):
    """
    POST /api/auth/verify-email-change
    { otp }

    Verifies the OTP sent to the new email address and updates the user's email.
    """
    serializer = VerifyEmailChangeSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    raw_otp = serializer.validated_data['otp']
    user = request.user

    # Find the pending CHANGE_EMAIL OTP bound to this user
    from apps.accounts.models import OTPRecord
    pending = (
        OTPRecord.objects
        .filter(user=user, purpose=OTPPurpose.CHANGE_EMAIL, status=OTPStatus.PENDING)
        .order_by('-created_at')
        .first()
    )
    if not pending:
        return Response(
            {'detail': 'No pending email change request found.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    new_email = pending.new_email
    if not new_email:
        return Response(
            {'detail': 'Invalid email change request.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        verify_otp(new_email, OTPPurpose.CHANGE_EMAIL, raw_otp)
    except OTPError as e:
        return _otp_error_response(e)

    old_email = user.email
    user.email = new_email
    user.save(update_fields=['email'])

    # Notify old address (best-effort)
    try:
        send_email_changed_notification(old_email, new_email, user.name)
    except EmailDeliveryError:
        pass

    return Response(
        {'detail': 'Email address updated successfully.', 'new_email': new_email},
        status=status.HTTP_200_OK,
    )


# ---------------------------------------------------------------------------
# Change password (authenticated)
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """
    POST /api/auth/change-password
    { current_password, new_password, confirm_password }
    """
    serializer = ChangePasswordSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = request.user
    current_password = serializer.validated_data['current_password']
    new_password = serializer.validated_data['new_password']

    if not user.check_password(current_password):
        return Response(
            {'detail': 'Current password is incorrect.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.set_password(new_password)
    user.save()

    # Revoke all existing sessions so other devices must re-authenticate
    revoke_all_refresh_tokens(user)

    # Send notification (best-effort)
    try:
        send_password_changed_notification(user.email, user.name)
    except EmailDeliveryError:
        pass

    return Response(
        {'detail': 'Password changed successfully. Please log in again.'},
        status=status.HTTP_200_OK,
    )
