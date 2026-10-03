"""
email_service.py — Centralized email dispatch and logging for SplitMate.

Rules:
- NEVER called directly from views; always call dispatcher or these service functions.
- NEVER logs OTP secrets or password contents.
- Catches SMTP errors, logs them safely without exposing credentials, and records to EmailLog.
- Enforces notification preferences and idempotency/deduplication cooldowns.
"""
from datetime import timedelta
import logging

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from apps.email_service import email_templates as tmpl

logger = logging.getLogger('splitmate.email')


class EmailDeliveryError(Exception):
    """Raised when critical SMTP delivery fails. Never expose the original exception to the client."""


# Category mapping for preference checks
# Security emails are MANDATORY and CANNOT be suppressed by user preference.
EVENT_CATEGORY_MAP = {
    # Mandatory Security Events
    'account_created': 'security',
    'email_verification': 'security',
    'account_verified': 'security',
    'password_reset': 'security',
    'password_changed': 'security',
    'email_changed': 'security',
    'change_email_verification': 'security',
    'security_alert': 'security',

    # Optional Events
    'member_added': 'group',
    'member_removed': 'group',
    'group_created': 'group',
    'group_deleted': 'group',
    'role_changed': 'group',

    'expense_added': 'expense',
    'expense_edited': 'expense',
    'expense_deleted': 'expense',

    'you_owe': 'balance',
    'someone_owes_you': 'balance',
    'balance_settled': 'balance',
    'settlement_recorded': 'settlement',
    'payment_received': 'settlement',
    'payment_recorded': 'settlement',
    'settlement_reminder': 'reminder',
}


def _is_preference_enabled(user, event_type: str) -> bool:
    """Check if the user has opted-in to this notification category."""
    if not user:
        return True

    category = EVENT_CATEGORY_MAP.get(event_type, 'other')
    if category == 'security':
        # Security emails can NEVER be disabled
        return True

    try:
        from apps.notifications.models import NotificationPreference
        prefs = NotificationPreference.get_for_user(user)

        if category == 'expense':
            return prefs.email_expense_updates
        elif category == 'group':
            return prefs.email_group_activity
        elif category == 'settlement':
            return prefs.email_settlement_updates
        elif category == 'balance' or category == 'reminder':
            return prefs.email_balance_reminders
        elif category == 'product':
            return prefs.email_product_news
    except Exception as e:
        logger.warning("Failed to evaluate notification preference: %s", e)
        return True

    return True


def _is_dedup_suppressed(dedup_key: str, cooldown_seconds: int = 3600) -> bool:
    """Check if an email with the same dedup_key was sent within the cooldown window."""
    if not dedup_key:
        return False

    from apps.notifications.models import EmailLog, EmailStatus
    cutoff = timezone.now() - timedelta(seconds=cooldown_seconds)
    return EmailLog.objects.filter(
        dedup_key=dedup_key,
        status=EmailStatus.SENT,
        sent_at__gte=cutoff,
    ).exists()


def send_email_message(
    recipient_email: str,
    subject: str,
    plain: str,
    html: str,
    user=None,
    event_type: str = 'general',
    dedup_key: str = '',
    cooldown_seconds: int = 3600,
    raise_on_error: bool = False,
) -> bool:
    """
    Core email sender with logging, preference validation, and deduplication.
    """
    from apps.notifications.models import EmailLog, EmailStatus

    # 1. Deduplication check
    if dedup_key and _is_dedup_suppressed(dedup_key, cooldown_seconds):
        logger.info("Email suppressed by deduplication: key=%s recipient=%s", dedup_key, recipient_email)
        try:
            EmailLog.objects.create(
                recipient_email=recipient_email,
                user=user,
                event_type=event_type,
                subject=subject,
                dedup_key=dedup_key,
                status=EmailStatus.SUPPRESSED_DEDUP,
            )
        except Exception:
            pass
        return False

    # 2. Preference check
    if user and not _is_preference_enabled(user, event_type):
        logger.info("Email suppressed by user preference: event=%s user_id=%s", event_type, user.id)
        try:
            EmailLog.objects.create(
                recipient_email=recipient_email,
                user=user,
                event_type=event_type,
                subject=subject,
                dedup_key=dedup_key,
                status=EmailStatus.SUPPRESSED_PREFERENCE,
            )
        except Exception:
            pass
        return False

    # 3. Deliver via SMTP
    try:
        send_mail(
            subject=subject,
            message=plain,
            from_email=settings.SMTP_FROM_EMAIL,
            recipient_list=[recipient_email],
            html_message=html,
            fail_silently=False,
        )
        logger.info("Email sent successfully: subject=%r to=%r event=%s", subject, recipient_email, event_type)
        try:
            EmailLog.objects.create(
                recipient_email=recipient_email,
                user=user,
                event_type=event_type,
                subject=subject,
                dedup_key=dedup_key,
                status=EmailStatus.SENT,
            )
        except Exception:
            pass
        return True
    except Exception as e:
        logger.error(
            "Email delivery failed: subject=%r to=<redacted> event=%s error=%s",
            subject,
            event_type,
            e,
            exc_info=True,
        )
        try:
            EmailLog.objects.create(
                recipient_email=recipient_email,
                user=user,
                event_type=event_type,
                subject=subject,
                dedup_key=dedup_key,
                status=EmailStatus.FAILED,
                error_message=str(e),
            )
        except Exception:
            pass

        if settings.DEBUG:
            logger.warning("[DEV FALLBACK] Email delivery failed via SMTP (%s). Outputting message to console.", e)
            print(f"\n==================== [DEV EMAIL FALLBACK] ====================\nTo: {recipient_email}\nSubject: {subject}\n{plain}\n==============================================================\n")
            return True

        if raise_on_error:
            raise EmailDeliveryError("Email delivery is currently unavailable. Please try again later.")
        return False


# ---------------------------------------------------------------------------
# Public sending functions
# ---------------------------------------------------------------------------

def send_email_verification(recipient_email: str, name: str, otp: str) -> None:
    subject, plain, html = tmpl.email_verification(name, otp)
    send_email_message(
        recipient_email=recipient_email,
        subject=subject,
        plain=plain,
        html=html,
        event_type='email_verification',
        raise_on_error=True,
    )


def send_account_verified(user, action_url: str = '/') -> None:
    subject, plain, html = tmpl.account_verified(user.name, action_url)
    send_email_message(
        recipient_email=user.email,
        subject=subject,
        plain=plain,
        html=html,
        user=user,
        event_type='account_verified',
        raise_on_error=False,
    )


def send_password_reset(recipient_email: str, name: str, otp: str) -> None:
    subject, plain, html = tmpl.password_reset(name, otp)
    send_email_message(
        recipient_email=recipient_email,
        subject=subject,
        plain=plain,
        html=html,
        event_type='password_reset',
        raise_on_error=True,
    )


def send_password_changed_notification(recipient_email: str, name: str, user=None) -> None:
    subject, plain, html = tmpl.password_changed(name)
    send_email_message(
        recipient_email=recipient_email,
        subject=subject,
        plain=plain,
        html=html,
        user=user,
        event_type='password_changed',
        raise_on_error=False,
    )


def send_email_changed_notification(old_email: str, new_email: str, name: str, user=None) -> None:
    subject, plain, html = tmpl.email_changed(name, old_email, new_email)
    send_email_message(
        recipient_email=old_email,
        subject=subject,
        plain=plain,
        html=html,
        user=user,
        event_type='email_changed',
        raise_on_error=False,
    )


def send_change_email_verification(new_email: str, name: str, otp: str) -> None:
    subject, plain, html = tmpl.change_email_verification(name, new_email, otp)
    send_email_message(
        recipient_email=new_email,
        subject=subject,
        plain=plain,
        html=html,
        event_type='change_email_verification',
        raise_on_error=True,
    )


def send_security_alert(recipient_email: str, name: str, event: str, detail: str = '', user=None) -> None:
    subject, plain, html = tmpl.security_alert(name, event, detail)
    send_email_message(
        recipient_email=recipient_email,
        subject=subject,
        plain=plain,
        html=html,
        user=user,
        event_type='security_alert',
        raise_on_error=False,
    )
