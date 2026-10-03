from django.conf import settings
from django.db import models


class NotificationType(models.TextChoices):
    # Account & Security
    ACCOUNT_CREATED = 'account_created', 'Account Created'
    ACCOUNT_VERIFIED = 'account_verified', 'Account Verified'
    SECURITY_ALERT = 'security_alert', 'Security Alert'
    PASSWORD_RESET = 'password_reset', 'Password Reset'
    PASSWORD_CHANGED = 'password_changed', 'Password Changed'
    EMAIL_CHANGED = 'email_changed', 'Email Changed'

    # Group Activity
    MEMBER_ADDED = 'member_added', 'Added to Group'
    MEMBER_REMOVED = 'member_removed', 'Removed from Group'
    GROUP_CREATED = 'group_created', 'Group Created'
    GROUP_DELETED = 'group_deleted', 'Group Deleted'
    ROLE_CHANGED = 'role_changed', 'Ownership/Admin Change'

    # Expense Events
    EXPENSE_ADDED = 'expense_added', 'Expense Added'
    EXPENSE_EDITED = 'expense_edited', 'Expense Edited'
    EXPENSE_DELETED = 'expense_deleted', 'Expense Deleted'

    # Balance & Settlements
    BALANCE_UPDATED = 'balance_updated', 'Balance Updated'
    BALANCE_SETTLED = 'balance_settled', 'Balance Settled'
    SETTLEMENT_RECORDED = 'settlement_recorded', 'Settlement Recorded'
    PAYMENT_RECEIVED = 'payment_received', 'Payment Received'
    PAYMENT_RECORDED = 'payment_recorded', 'Payment Recorded'
    SETTLEMENT_REMINDER = 'settlement_reminder', 'Settlement Reminder'


class Notification(models.Model):
    """
    In-app notification entity supporting user alerts, read state tracking,
    and deep-linking to related entities (groups, expenses, settlements).
    """
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        db_index=True,
    )
    type = models.CharField(
        max_length=64,
        choices=NotificationType.choices,
        db_index=True,
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    group = models.ForeignKey(
        'groups.Group',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    related_entity_id = models.CharField(max_length=64, null=True, blank=True)
    related_entity_type = models.CharField(max_length=64, null=True, blank=True)  # 'expense', 'settlement', 'group'
    action_url = models.CharField(max_length=255, blank=True, default='')

    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', '-created_at']),
            models.Index(fields=['user', '-created_at']),
        ]

    def __str__(self):
        return f"Notification({self.user_id}, {self.type}, read={self.is_read})"


class NotificationPreference(models.Model):
    """
    User notification preferences separating mandatory security emails
    from optional notifications (expenses, groups, settlements, reminders, product).
    """
    id = models.BigAutoField(primary_key=True)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notification_preferences',
    )

    # Mandatory security emails — cannot be turned off
    email_security_alerts = models.BooleanField(default=True, editable=False)

    # Optional categories
    email_expense_updates = models.BooleanField(default=True)
    email_group_activity = models.BooleanField(default=True)
    email_settlement_updates = models.BooleanField(default=True)
    email_balance_reminders = models.BooleanField(default=True)
    email_product_news = models.BooleanField(default=False)

    # In-app notification toggle
    in_app_notifications = models.BooleanField(default=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"NotificationPreference(user={self.user_id})"

    @classmethod
    def get_for_user(cls, user):
        """Get or create preferences with standard defaults."""
        prefs, _ = cls.objects.get_or_create(user=user)
        return prefs


class EmailStatus(models.TextChoices):
    SENT = 'sent', 'Sent'
    FAILED = 'failed', 'Failed'
    SUPPRESSED_DEDUP = 'suppressed_dedup', 'Suppressed (Deduplication)'
    SUPPRESSED_PREFERENCE = 'suppressed_preference', 'Suppressed (User Preference)'


class EmailLog(models.Model):
    """
    Audit and delivery tracking log for outgoing emails.
    Supports deduplication, cooldowns, and status monitoring.
    Sensitive credentials and raw OTP secrets are NEVER stored here.
    """
    id = models.BigAutoField(primary_key=True)
    recipient_email = models.EmailField(max_length=255, db_index=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='email_logs',
    )
    event_type = models.CharField(max_length=64, db_index=True)
    subject = models.CharField(max_length=255)
    dedup_key = models.CharField(max_length=128, db_index=True, blank=True, default='')
    status = models.CharField(
        max_length=32,
        choices=EmailStatus.choices,
        default=EmailStatus.SENT,
        db_index=True,
    )
    error_message = models.TextField(blank=True, default='')
    sent_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-sent_at']
        indexes = [
            models.Index(fields=['recipient_email', 'event_type', 'sent_at']),
            models.Index(fields=['dedup_key', 'status', 'sent_at']),
        ]

    def __str__(self):
        return f"EmailLog({self.recipient_email}, {self.event_type}, {self.status})"
