"""
otp_service.py — Centralized OTP lifecycle management for SplitMate.

Security model:
- OTPs are generated using secrets.randbelow (CSPRNG).
- Raw OTPs are NEVER stored; only HMAC-SHA256 hashes are persisted.
- OTPs are bound to (email, purpose) — cross-user/cross-purpose reuse is rejected.
- Brute-force protected: max attempts per record, resend cooldown.
- Previous PENDING OTPs for the same (email, purpose) are invalidated on new issuance.
- Server-side expiry: frontend countdown is informational only.
- All decisions (valid/expired/locked) happen here, never in views.
"""
import hashlib
import hmac
import logging
import secrets
from datetime import datetime, timedelta, timezone

from django.conf import settings

from apps.accounts.models import OTPRecord, OTPPurpose, OTPStatus

logger = logging.getLogger('splitmate.otp')

# ---------------------------------------------------------------------------
# Configuration accessors — always read fresh from settings so the Django
# test `settings` fixture can override them without module-reload.
# ---------------------------------------------------------------------------
def _expiry_minutes() -> int:
    return getattr(settings, 'OTP_EXPIRY_MINUTES', 10)

def _max_attempts() -> int:
    return getattr(settings, 'OTP_MAX_ATTEMPTS', 5)

def _resend_cooldown_seconds() -> int:
    return getattr(settings, 'OTP_RESEND_COOLDOWN_SECONDS', 60)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _hash_otp(raw_otp: str) -> str:
    """
    Compute HMAC-SHA256 of the raw OTP using Django SECRET_KEY as the key.
    Using HMAC prevents length-extension attacks and ties the hash to this installation.
    """
    key = settings.SECRET_KEY.encode()
    return hmac.new(key, raw_otp.encode(), hashlib.sha256).hexdigest()


def _generate_raw_otp() -> str:
    """Return a cryptographically secure 6-digit numeric OTP string."""
    return f"{secrets.randbelow(1_000_000):06d}"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _invalidate_pending(email: str, purpose: str) -> None:
    """Mark all PENDING OTPs for this (email, purpose) as INVALIDATED."""
    OTPRecord.objects.filter(
        email=email,
        purpose=purpose,
        status=OTPStatus.PENDING,
    ).update(status=OTPStatus.INVALIDATED)


# ---------------------------------------------------------------------------
# Custom exceptions
# ---------------------------------------------------------------------------

class OTPError(Exception):
    """Base class for OTP errors. message is safe to surface to the user."""


class OTPExpiredError(OTPError):
    pass


class OTPInvalidError(OTPError):
    pass


class OTPMaxAttemptsError(OTPError):
    pass


class OTPCooldownError(OTPError):
    """Raised when the caller tries to resend within the cooldown window."""
    def __init__(self, seconds_remaining: int):
        self.seconds_remaining = seconds_remaining
        super().__init__(
            f"Please wait {seconds_remaining} seconds before requesting a new code."
        )


class OTPRateLimitError(OTPError):
    pass


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def issue_otp(
    email: str,
    purpose: str,
    *,
    user=None,
    pending_name: str = '',
    pending_password_hash: str = '',
    new_email: str = '',
    check_resend_cooldown: bool = True,
) -> str:
    """
    Generate a new OTP for (email, purpose), store its hash, return the raw OTP.

    The raw OTP is returned to the CALLER so it can be passed to the email service.
    It is NEVER stored or logged here.

    Args:
        email: The email address this OTP is bound to.
        purpose: OTPPurpose value.
        user: Optional User FK (None for pre-registration).
        pending_name / pending_password_hash: Pre-reg payload (EMAIL_VERIFICATION only).
        new_email: New email address (CHANGE_EMAIL only).
        check_resend_cooldown: If True, raise OTPCooldownError if within cooldown.

    Returns:
        raw_otp (str) — pass to email_service.send_*
    """
    purpose = OTPPurpose(purpose)  # validates the value

    cooldown = _resend_cooldown_seconds()
    if check_resend_cooldown and cooldown > 0:
        # Check if there is a PENDING OTP created within the cooldown window
        cooldown_cutoff = _now() - timedelta(seconds=cooldown)
        recent = OTPRecord.objects.filter(
            email=email,
            purpose=purpose,
            status=OTPStatus.PENDING,
            created_at__gt=cooldown_cutoff,
        ).first()
        if recent is not None:
            elapsed = int((_now() - recent.created_at).total_seconds())
            remaining = cooldown - elapsed
            raise OTPCooldownError(max(1, remaining))

    # Invalidate all previous pending OTPs for this (email, purpose)
    _invalidate_pending(email, purpose)

    raw_otp = _generate_raw_otp()
    otp_hash = _hash_otp(raw_otp)
    expires_at = _now() + timedelta(minutes=_expiry_minutes())

    OTPRecord.objects.create(
        email=email,
        purpose=purpose,
        user=user,
        otp_hash=otp_hash,
        status=OTPStatus.PENDING,
        attempt_count=0,
        max_attempts=_max_attempts(),
        expires_at=expires_at,
        pending_name=pending_name,
        pending_password_hash=pending_password_hash,
        new_email=new_email,
    )

    # Log issue at INFO level — NEVER log the raw OTP
    logger.info(
        "OTP issued: email=<redacted> purpose=%s expires_in=%dm",
        purpose,
        _expiry_minutes(),
    )

    return raw_otp


def verify_otp(email: str, purpose: str, raw_otp: str) -> OTPRecord:
    """
    Verify a raw OTP against the latest PENDING record for (email, purpose).

    On success:  marks the record CONSUMED, sets consumed_at, returns it.
    On failure:  increments attempt_count; raises appropriate OTPError subclass.

    The caller must NOT rely on the returned record's otp_hash value.
    """
    purpose = OTPPurpose(purpose)

    record = (
        OTPRecord.objects
        .filter(email=email, purpose=purpose, status=OTPStatus.PENDING)
        .order_by('-created_at')
        .first()
    )

    if record is None:
        # No PENDING record — could be expired, consumed, or never issued.
        # Return a generic message to prevent enumeration.
        raise OTPInvalidError(
            "Invalid or expired verification code. Please request a new one."
        )

    # Check expiry
    if _now() > record.expires_at:
        record.status = OTPStatus.EXPIRED
        record.save(update_fields=['status'])
        raise OTPExpiredError(
            "Your verification code has expired. Please request a new one."
        )

    # Check attempt limit BEFORE verifying (use record's own max_attempts)
    if record.attempt_count >= record.max_attempts:
        raise OTPMaxAttemptsError(
            "Too many incorrect attempts. Please request a new verification code."
        )

    # Constant-time comparison via hmac.compare_digest
    expected_hash = _hash_otp(raw_otp)
    if not hmac.compare_digest(expected_hash, record.otp_hash):
        record.attempt_count += 1
        update_fields = ['attempt_count']

        if record.attempt_count >= record.max_attempts:
            # Lock the record — do NOT mark as EXPIRED; caller shows "too many attempts"
            update_fields.append('status')
            record.status = OTPStatus.INVALIDATED

        record.save(update_fields=update_fields)

        remaining = record.attempts_remaining
        if remaining == 0:
            raise OTPMaxAttemptsError(
                "Too many incorrect attempts. Please request a new verification code."
            )
        raise OTPInvalidError(
            f"Incorrect verification code. {remaining} attempt(s) remaining."
        )

    # --- OTP is correct ---
    record.status = OTPStatus.CONSUMED
    record.consumed_at = _now()
    record.save(update_fields=['status', 'consumed_at'])

    logger.info(
        "OTP verified: email=<redacted> purpose=%s",
        purpose,
    )

    return record


def get_resend_cooldown_seconds(email: str, purpose: str) -> int:
    """
    Return how many seconds remain in the resend cooldown, or 0 if resend is allowed.
    Frontend can use this to display a countdown.
    """
    cooldown = _resend_cooldown_seconds()
    cooldown_cutoff = _now() - timedelta(seconds=cooldown)
    recent = OTPRecord.objects.filter(
        email=email,
        purpose=purpose,
        status=OTPStatus.PENDING,
        created_at__gt=cooldown_cutoff,
    ).first()

    if recent is None:
        return 0

    elapsed = int((_now() - recent.created_at).total_seconds())
    return max(0, cooldown - elapsed)


def get_otp_expiry_seconds(email: str, purpose: str) -> int:
    """
    Return seconds until the latest PENDING OTP expires, or 0 if none found.
    Used to drive the frontend countdown timer.
    """
    record = (
        OTPRecord.objects
        .filter(email=email, purpose=purpose, status=OTPStatus.PENDING)
        .order_by('-created_at')
        .first()
    )
    if record is None:
        return 0
    remaining = (record.expires_at - _now()).total_seconds()
    return max(0, int(remaining))
