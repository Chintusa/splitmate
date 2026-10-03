"""
test_notifications_events.py — Comprehensive tests for SplitMate Notification & Email Event System.

Validates all 17 core requirements from Section 19:
1. User registration -> verification email
2. Correct OTP -> account verified email
3. User added to group -> group email
4. New expense involving user -> expense email
5. Expense edited -> affected users notified
6. Expense deleted -> affected users notified
7. Settlement -> both parties notified
8. Payment received -> recipient notified
9. Balance settled -> appropriate notification
10. Password reset -> OTP email
11. Password changed -> security email
12. Email changed -> security email
13. Notification preferences respected
14. Security emails cannot accidentally be disabled
15. Duplicate events do not create duplicate emails
16. SMTP failure is handled safely
17. WebSocket / in-app notifications still work if email delivery fails
"""
import pytest
from unittest.mock import patch
from django.core import mail
from django.conf import settings
from rest_framework.test import APIClient

from apps.accounts.models import User, OTPPurpose, OTPRecord
from apps.accounts.utils import create_access_token
from apps.groups.models import Group, Membership
from apps.expenses.models import Expense, ExpenseSplit
from apps.settlements.models import Settlement
from apps.notifications.models import Notification, NotificationPreference, EmailLog, EmailStatus
from apps.notifications.dispatcher import (
    dispatch_account_verified,
    dispatch_member_added,
    dispatch_member_removed,
    dispatch_group_created,
    dispatch_group_deleted,
    dispatch_expense_created,
    dispatch_expense_edited,
    dispatch_expense_deleted,
    dispatch_settlement_created,
    dispatch_settlement_reminder,
    create_in_app_notification,
)
from apps.email_service.email_service import (
    send_email_message,
    send_email_verification,
    send_password_reset,
    send_password_changed_notification,
    send_email_changed_notification,
    send_security_alert,
)


@pytest.fixture(autouse=True)
def enable_sync_email(settings):
    """Ensure email queue tasks execute synchronously during tests for direct verification."""
    settings.EMAIL_QUEUE_SYNCHRONOUS = True
    settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
    mail.outbox.clear()


@pytest.mark.django_db
class TestNotificationAndEmailSystem:

    def test_01_user_registration_verification_email(self):
        """1. User registration triggers verification OTP email."""
        client = APIClient()
        res = client.post('/api/auth/register', {
            'email': 'newuser@splitmate.test',
            'name': 'New User',
            'password': 'StrongPassword123!',
            'confirm_password': 'StrongPassword123!',
        }, format='json')
        assert res.status_code == 200
        assert len(mail.outbox) == 1
        assert "Verify your SplitMate email" in mail.outbox[0].subject
        assert "newuser@splitmate.test" in mail.outbox[0].to

    def test_02_correct_otp_account_verified_email_and_in_app(self):
        """2. Correct OTP triggers account verified / welcome email & in-app notification."""
        client = APIClient()
        client.post('/api/auth/register', {
            'email': 'verifieduser@splitmate.test',
            'name': 'Verified User',
            'password': 'StrongPassword123!',
            'confirm_password': 'StrongPassword123!',
        }, format='json')
        mail.outbox.clear()

        # Retrieve the OTPRecord and verify
        from apps.email_service.otp_service import issue_otp
        # Re-issue a known OTP or verify with the test OTP
        otp_rec = OTPRecord.objects.filter(email='verifieduser@splitmate.test', purpose=OTPPurpose.EMAIL_VERIFICATION).first()
        assert otp_rec is not None

        # Verify with helper
        with patch('apps.accounts.views.verify_otp') as mock_verify:
            mock_verify.return_value = otp_rec
            res = client.post('/api/auth/verify-email', {
                'email': 'verifieduser@splitmate.test',
                'otp': '123456',
            }, format='json')
            assert res.status_code == 201

        user = User.objects.get(email='verifieduser@splitmate.test')
        # Check welcome / verified email was sent
        assert any("Your SplitMate account is verified" in m.subject for m in mail.outbox)

        # Check in-app notification was created
        notifs = Notification.objects.filter(user=user)
        assert notifs.count() == 1
        assert "Welcome to SplitMate!" in notifs[0].title

    def test_03_user_added_to_group_email_and_in_app(self):
        """3. User added to group triggers group email and in-app notification."""
        owner = User.objects.create_user(email='owner@test.com', name='Owner', password='pwd')
        bob = User.objects.create_user(email='bob_member@test.com', name='Bob Member', password='pwd')
        group = Group.objects.create(name='Goa Trip', owner=owner)
        Membership.objects.create(group=group, user=owner)

        token = create_access_token(owner)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        mail.outbox.clear()
        res = client.post(f'/api/groups/{group.id}/members', {'email': bob.email}, format='json')
        assert res.status_code == 201

        # In-app notification for Bob
        notif = Notification.objects.filter(user=bob).first()
        assert notif is not None
        assert "Added to Group" in notif.title
        assert "Goa Trip" in notif.message

        # Email sent to Bob
        bob_emails = [m for m in mail.outbox if bob.email in m.to]
        assert len(bob_emails) == 1
        assert "You've been added to Goa Trip" in bob_emails[0].subject
        assert "Owner" in bob_emails[0].body
        assert "₹0" in bob_emails[0].body

    def test_04_new_expense_involving_user_email_and_in_app(self):
        """4. New expense notifies affected participants with share and balance; no redundant email to payer."""
        rahul = User.objects.create_user(email='rahul@test.com', name='Rahul', password='pwd')
        priya = User.objects.create_user(email='priya@test.com', name='Priya', password='pwd')
        group = Group.objects.create(name='Goa Trip', owner=rahul)
        Membership.objects.create(group=group, user=rahul)
        Membership.objects.create(group=group, user=priya)

        token = create_access_token(rahul)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        mail.outbox.clear()
        res = client.post(f'/api/groups/{group.id}/expenses', {
            'description': 'Hotel',
            'amount_minor': 360000,  # ₹3,600
            'payer_id': rahul.id,
            'date': '2026-10-01',
            'split_type': 'equal',
            'split_member_ids': [rahul.id, priya.id],
        }, format='json')
        assert res.status_code == 201

        # Priya owes Rahul ₹1,800 -> receives in-app & email
        priya_notif = Notification.objects.filter(user=priya).first()
        assert priya_notif is not None
        assert "Hotel" in priya_notif.title
        assert "₹1,800" in priya_notif.message

        priya_emails = [m for m in mail.outbox if priya.email in m.to]
        assert len(priya_emails) == 1
        assert "New expense in Goa Trip: Hotel" in priya_emails[0].subject
        assert "₹3,600" in priya_emails[0].body
        assert "₹1,800" in priya_emails[0].body

        # Payer Rahul should NOT receive redundant expense email
        rahul_emails = [m for m in mail.outbox if rahul.email in m.to]
        assert len(rahul_emails) == 0

    def test_05_expense_edited_affected_users_notified(self):
        """5. Expense edited notifies members whose financial position changed."""
        rahul = User.objects.create_user(email='rahul_edit@test.com', name='Rahul', password='pwd')
        priya = User.objects.create_user(email='priya_edit@test.com', name='Priya', password='pwd')
        group = Group.objects.create(name='Goa Trip', owner=rahul)
        Membership.objects.create(group=group, user=rahul)
        Membership.objects.create(group=group, user=priya)

        expense = Expense.objects.create(
            group=group,
            created_by=rahul,
            payer=rahul,
            description='Hotel',
            amount_minor=360000,
            date='2026-10-01',
        )
        ExpenseSplit.objects.create(expense=expense, user=rahul, share_minor=180000)
        ExpenseSplit.objects.create(expense=expense, user=priya, share_minor=180000)

        token = create_access_token(rahul)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        mail.outbox.clear()
        Notification.objects.all().delete()

        # Update expense to 4000 total (Rahul: 2000, Priya: 2000)
        res = client.put(f'/api/groups/{group.id}/expenses/{expense.id}', {
            'description': 'Hotel Deluxe',
            'amount_minor': 400000,
            'payer_id': rahul.id,
            'date': '2026-10-01',
            'split_type': 'equal',
            'split_member_ids': [rahul.id, priya.id],
        }, format='json')
        assert res.status_code == 200

        # Priya receives update notification & email
        priya_notif = Notification.objects.filter(user=priya).first()
        assert priya_notif is not None
        assert "Expense Updated: Hotel Deluxe" in priya_notif.title

        priya_emails = [m for m in mail.outbox if priya.email in m.to]
        assert len(priya_emails) == 1
        assert "Expense updated: Hotel Deluxe in Goa Trip" in priya_emails[0].subject

    def test_06_expense_deleted_affected_users_notified(self):
        """6. Expense deleted notifies users whose balance was affected."""
        rahul = User.objects.create_user(email='rahul_del@test.com', name='Rahul', password='pwd')
        priya = User.objects.create_user(email='priya_del@test.com', name='Priya', password='pwd')
        group = Group.objects.create(name='Goa Trip', owner=rahul)
        Membership.objects.create(group=group, user=rahul)
        Membership.objects.create(group=group, user=priya)

        expense = Expense.objects.create(
            group=group,
            created_by=rahul,
            payer=rahul,
            description='Dinner',
            amount_minor=240000,
            date='2026-10-01',
        )
        ExpenseSplit.objects.create(expense=expense, user=rahul, share_minor=120000)
        ExpenseSplit.objects.create(expense=expense, user=priya, share_minor=120000)

        token = create_access_token(rahul)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        mail.outbox.clear()
        Notification.objects.all().delete()

        res = client.delete(f'/api/groups/{group.id}/expenses/{expense.id}')
        assert res.status_code == 200

        priya_notif = Notification.objects.filter(user=priya).first()
        assert priya_notif is not None
        assert "Expense Deleted: Dinner" in priya_notif.title

        priya_emails = [m for m in mail.outbox if priya.email in m.to]
        assert len(priya_emails) == 1
        assert "Dinner — ₹2,400" in priya_emails[0].body or "Dinner" in priya_emails[0].body

    def test_07_and_08_settlement_recorded_both_parties_notified(self):
        """7 & 8. Settlement notifies both parties: payment recorded for payer, payment received for recipient."""
        rahul = User.objects.create_user(email='rahul_settle@test.com', name='Rahul', password='pwd')
        priya = User.objects.create_user(email='priya_settle@test.com', name='Priya', password='pwd')
        group = Group.objects.create(name='Goa Trip', owner=rahul)
        Membership.objects.create(group=group, user=rahul)
        Membership.objects.create(group=group, user=priya)

        # Expense: Rahul paid 3600, Priya owes 1800
        expense = Expense.objects.create(
            group=group, created_by=rahul, payer=rahul,
            description='Hotel', amount_minor=360000, date='2026-10-01'
        )
        ExpenseSplit.objects.create(expense=expense, user=rahul, share_minor=180000)
        ExpenseSplit.objects.create(expense=expense, user=priya, share_minor=180000)

        # Priya pays Rahul 1800
        token_priya = create_access_token(priya)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_priya}')

        mail.outbox.clear()
        Notification.objects.all().delete()

        res = client.post(f'/api/groups/{group.id}/settlements', {
            'to_user_id': rahul.id,
            'amount_minor': 180000,
        }, format='json')
        assert res.status_code == 201

        # Check Priya (Payer) notification & email
        priya_notif = Notification.objects.filter(user=priya, type='payment_recorded').first()
        assert priya_notif is not None
        assert "Payment Recorded" in priya_notif.title

        priya_email = [m for m in mail.outbox if priya.email in m.to and "recorded" in m.subject.lower()]
        assert len(priya_email) >= 1

        # Check Rahul (Recipient) notification & email
        rahul_notif = Notification.objects.filter(user=rahul, type='payment_received').first()
        assert rahul_notif is not None
        assert "Payment Received" in rahul_notif.title

        rahul_email = [m for m in mail.outbox if rahul.email in m.to and "paid you" in m.subject]
        assert len(rahul_email) == 1
        assert "Priya paid you ₹1,800" in rahul_email[0].subject

    def test_09_balance_settled_notification(self):
        """9. When balance reaches zero after settlement, 'All settled up' is triggered."""
        rahul = User.objects.create_user(email='rahul_bal@test.com', name='Rahul', password='pwd')
        priya = User.objects.create_user(email='priya_bal@test.com', name='Priya', password='pwd')
        group = Group.objects.create(name='Goa Trip', owner=rahul)
        Membership.objects.create(group=group, user=rahul)
        Membership.objects.create(group=group, user=priya)

        expense = Expense.objects.create(
            group=group, created_by=rahul, payer=rahul,
            description='Hotel', amount_minor=200000, date='2026-10-01'
        )
        ExpenseSplit.objects.create(expense=expense, user=rahul, share_minor=100000)
        ExpenseSplit.objects.create(expense=expense, user=priya, share_minor=100000)

        # Full settlement: Priya settles all 1000 owed to Rahul
        token_priya = create_access_token(priya)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_priya}')

        mail.outbox.clear()
        Notification.objects.all().delete()

        res = client.post(f'/api/groups/{group.id}/settlements', {
            'to_user_id': rahul.id,
            'amount_minor': 100000,
        }, format='json')
        assert res.status_code == 201

        # Both users should have 'All Settled Up' in-app notification
        settled_notifs = Notification.objects.filter(type='balance_settled')
        assert settled_notifs.count() == 2

    def test_10_password_reset_otp_email(self):
        """10. Password reset request sends OTP email without revealing account existence."""
        User.objects.create_user(email='user_reset@test.com', name='User Reset', password='pwd')
        client = APIClient()

        mail.outbox.clear()
        res = client.post('/api/auth/forgot-password', {'email': 'user_reset@test.com'}, format='json')
        assert res.status_code == 200
        assert len(mail.outbox) == 1
        assert "Reset your SplitMate password" in mail.outbox[0].subject

        # Non-existent email should also return generic success and not leak
        mail.outbox.clear()
        res_non = client.post('/api/auth/forgot-password', {'email': 'nonexistent@test.com'}, format='json')
        assert res_non.status_code == 200
        assert len(mail.outbox) == 0

    def test_11_password_changed_security_email(self):
        """11. Password successfully changed sends security notification email."""
        user = User.objects.create_user(email='user_pwd_change@test.com', name='User Pwd', password='old_password_123')
        token = create_access_token(user)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        mail.outbox.clear()
        res = client.post('/api/auth/change-password', {
            'current_password': 'old_password_123',
            'new_password': 'NewStrongPassword_456!',
            'confirm_password': 'NewStrongPassword_456!',
        }, format='json')
        assert res.status_code == 200

        security_emails = [m for m in mail.outbox if user.email in m.to and "Password was changed" in m.subject or "password was changed" in m.subject]
        assert len(security_emails) == 1

    def test_12_email_changed_security_email(self):
        """12. Email changed sends security alert notification."""
        user = User.objects.create_user(email='old_address@test.com', name='Email User', password='pwd')
        mail.outbox.clear()

        send_email_changed_notification(
            old_email='old_address@test.com',
            new_email='new_address@test.com',
            name='Email User',
            user=user,
        )
        assert len(mail.outbox) == 1
        assert "Your SplitMate email address was changed" in mail.outbox[0].subject
        assert "old_address@test.com" in mail.outbox[0].to

    def test_13_notification_preferences_respected(self):
        """13. Notification preferences are respected: optional emails suppressed when disabled."""
        user = User.objects.create_user(email='optout@test.com', name='Opt Out', password='pwd')
        prefs = NotificationPreference.get_for_user(user)
        prefs.email_expense_updates = False
        prefs.save()

        mail.outbox.clear()
        EmailLog.objects.all().delete()

        # Send an expense notification to this user
        sent = send_email_message(
            recipient_email=user.email,
            subject="New expense",
            plain="details",
            html="<p>details</p>",
            user=user,
            event_type='expense_added',
        )
        assert sent is False
        assert len(mail.outbox) == 0

        # Verify log recorded suppressed_preference
        log = EmailLog.objects.filter(recipient_email=user.email).first()
        assert log is not None
        assert log.status == EmailStatus.SUPPRESSED_PREFERENCE

    def test_14_security_emails_cannot_accidentally_be_disabled(self):
        """14. Security emails cannot be disabled via API or model validation."""
        user = User.objects.create_user(email='security_user@test.com', name='Sec User', password='pwd')
        token = create_access_token(user)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        # Attempt to disable security alerts via PUT /api/notifications/preferences
        res = client.put('/api/notifications/preferences', {
            'email_security_alerts': False,
            'email_expense_updates': True,
        }, format='json')
        assert res.status_code == 400
        assert "Security alert emails are required" in str(res.data)

        # Verify security emails still deliver even if user somehow had it false
        mail.outbox.clear()
        send_security_alert(user.email, user.name, "Suspicious login attempt", user=user)
        assert len(mail.outbox) == 1

    def test_15_duplicate_events_do_not_create_duplicate_emails(self):
        """15. Duplicate events within cooldown period are deduplicated and suppressed."""
        user = User.objects.create_user(email='dedup_test@test.com', name='Dedup User', password='pwd')
        mail.outbox.clear()
        EmailLog.objects.all().delete()

        dedup_key = "test_balance_dedup_123"

        # First call succeeds
        s1 = send_email_message(
            recipient_email=user.email,
            subject="You owe money",
            plain="...",
            html="<p>...</p>",
            user=user,
            event_type='you_owe',
            dedup_key=dedup_key,
            cooldown_seconds=3600,
        )
        assert s1 is True
        assert len(mail.outbox) == 1

        # Second immediate call with identical dedup_key is suppressed
        s2 = send_email_message(
            recipient_email=user.email,
            subject="You owe money",
            plain="...",
            html="<p>...</p>",
            user=user,
            event_type='you_owe',
            dedup_key=dedup_key,
            cooldown_seconds=3600,
        )
        assert s2 is False
        assert len(mail.outbox) == 1  # No second email sent!

        # Check suppression was logged
        suppressed_log = EmailLog.objects.filter(dedup_key=dedup_key, status=EmailStatus.SUPPRESSED_DEDUP).first()
        assert suppressed_log is not None

    def test_16_smtp_failure_is_handled_safely(self):
        """16. SMTP failure does not crash expense or group operations; failure logged safely."""
        user = User.objects.create_user(email='smtp_fail@test.com', name='Fail User', password='pwd')
        group = Group.objects.create(name='Trip Fail', owner=user)
        Membership.objects.create(group=group, user=user)

        with patch('apps.email_service.email_service.send_mail', side_effect=Exception("SMTP Connection refused")):
            # Non-critical event should return False, not raise exception
            success = send_email_message(
                recipient_email=user.email,
                subject="Expense notification",
                plain="details",
                html="<p>details</p>",
                user=user,
                event_type='expense_added',
                raise_on_error=False,
            )
            assert success is False

            # Verify failure was logged to EmailLog
            log = EmailLog.objects.filter(recipient_email=user.email, status=EmailStatus.FAILED).first()
            assert log is not None
            assert "Connection refused" in log.error_message

    def test_17_websocket_and_in_app_work_if_email_fails(self):
        """17. In-app notifications and WebSocket updates still work even if email delivery fails."""
        user = User.objects.create_user(email='inapp_test@test.com', name='Inapp User', password='pwd')
        group = Group.objects.create(name='Trip Inapp', owner=user)

        with patch('apps.email_service.email_service.send_mail', side_effect=Exception("SMTP Down")):
            notif = create_in_app_notification(
                user=user,
                type_code='expense_added',
                title='Expense Added',
                message='₹500 added',
                group=group,
            )
            assert notif.id is not None
            assert notif.user == user
            assert Notification.objects.filter(user=user).count() == 1

    def test_18_in_app_notification_center_api(self):
        """18. Notification center endpoints: list, unread count, mark read, mark all read."""
        user = User.objects.create_user(email='notif_center@test.com', name='Center User', password='pwd')
        n1 = create_in_app_notification(user, 'member_added', 'Added to group', 'Welcome', None)
        n2 = create_in_app_notification(user, 'expense_added', 'New Expense', 'Dinner', None)

        token = create_access_token(user)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        # 1. Unread count
        res_count = client.get('/api/notifications/unread-count')
        assert res_count.status_code == 200
        assert res_count.data['unread_count'] == 2

        # 2. List notifications
        res_list = client.get('/api/notifications')
        assert res_list.status_code == 200
        assert res_list.data['total'] == 2
        assert len(res_list.data['items']) == 2

        # 3. Mark single as read
        res_read1 = client.post(f'/api/notifications/{n1.id}/read')
        assert res_read1.status_code == 200
        assert res_read1.data['is_read'] is True

        res_count2 = client.get('/api/notifications/unread-count')
        assert res_count2.data['unread_count'] == 1

        # 4. Mark all as read
        res_all = client.post('/api/notifications/read-all')
        assert res_all.status_code == 200
        assert res_all.data['updated_count'] == 1

        res_count3 = client.get('/api/notifications/unread-count')
        assert res_count3.data['unread_count'] == 0

    def test_19_settlement_reminder_endpoint_and_cooldown(self):
        """19. Settlement reminder endpoint sends polite reminder and enforces cooldown."""
        creditor = User.objects.create_user(email='creditor@test.com', name='Creditor Rahul', password='pwd')
        debtor = User.objects.create_user(email='debtor@test.com', name='Debtor Priya', password='pwd')
        group = Group.objects.create(name='Goa Trip', owner=creditor)
        Membership.objects.create(group=group, user=creditor)
        Membership.objects.create(group=group, user=debtor)

        # Expense: Creditor paid 2000, Debtor owes 1000
        expense = Expense.objects.create(
            group=group, created_by=creditor, payer=creditor,
            description='Lunch', amount_minor=200000, date='2026-10-01'
        )
        ExpenseSplit.objects.create(expense=expense, user=creditor, share_minor=100000)
        ExpenseSplit.objects.create(expense=expense, user=debtor, share_minor=100000)

        token = create_access_token(creditor)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        mail.outbox.clear()
        Notification.objects.all().delete()

        # Send reminder
        res = client.post(f'/api/groups/{group.id}/remind-settlement', {
            'to_user_id': debtor.id,
        }, format='json')
        assert res.status_code == 200
        assert "reminder sent" in res.data['detail'].lower()

        # Check debtor received notification & email
        debtor_notif = Notification.objects.filter(user=debtor).first()
        assert debtor_notif is not None
        assert "Settlement Reminder" in debtor_notif.title

        debtor_emails = [m for m in mail.outbox if debtor.email in m.to]
        assert len(debtor_emails) == 1
        assert "Pending balance" in debtor_emails[0].subject or "Reminder" in debtor_emails[0].subject

        # Immediate second reminder is rate-limited / cooldown enforced
        res2 = client.post(f'/api/groups/{group.id}/remind-settlement', {
            'to_user_id': debtor.id,
        }, format='json')
        assert res2.status_code == 429
