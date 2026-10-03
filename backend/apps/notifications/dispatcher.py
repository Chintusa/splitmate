"""
dispatcher.py — Central event and notification dispatcher for SplitMate.

Orchestrates the three notification channels according to the EVENT -> CHANNEL MATRIX:
1. In-app notifications (database Notification records)
2. Real-time WebSocket updates (Django Channels group and user rooms)
3. Email notifications (asynchronous SMTP delivery with preferences and deduplication)
"""
import logging
from django.conf import settings
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from apps.accounts.models import User
from apps.email_service import email_templates as tmpl
from apps.email_service.email_service import send_email_message
from apps.notifications.email_queue import queue_email
from apps.notifications.models import Notification, NotificationType

logger = logging.getLogger('splitmate.notifications')


def _format_minor(amount_minor: int) -> str:
    """Format minor currency integer into ₹ rupees display."""
    return f"₹{amount_minor / 100:,.2f}".rstrip('0').rstrip('.') if amount_minor % 100 == 0 else f"₹{amount_minor / 100:,.2f}"


def _send_ws_user(user_id: int, event_name: str, payload: dict):
    """Broadcast an event directly to a user's WebSocket channel room."""
    try:
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"user_{user_id}",
                {
                    "type": "user_event",
                    "data": {"event": event_name, **payload}
                }
            )
    except Exception as e:
        logger.warning("Failed to send WS message to user_%s: %s", user_id, e)


def _send_ws_group(group_id: int, event_name: str, payload: dict):
    """Broadcast an event to an entire group room."""
    try:
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"group_{group_id}",
                {
                    "type": "group_event",
                    "data": {"event": event_name, "group_id": group_id, **payload}
                }
            )
    except Exception as e:
        logger.warning("Failed to send WS message to group_%s: %s", group_id, e)


def create_in_app_notification(
    user,
    type_code: str,
    title: str,
    message: str,
    group=None,
    related_entity_id: str = None,
    related_entity_type: str = None,
    action_url: str = '',
) -> Notification:
    """
    Creates an in-app notification row and emits a real-time 'notification.created'
    WebSocket message so the frontend bell badge updates immediately.
    """
    notif = Notification.objects.create(
        user=user,
        type=type_code,
        title=title,
        message=message,
        group=group,
        related_entity_id=str(related_entity_id) if related_entity_id else None,
        related_entity_type=related_entity_type,
        action_url=action_url,
    )

    # Broadcast notification.created over WebSocket
    _send_ws_user(
        user.id,
        "notification.created",
        {
            "notification": {
                "id": notif.id,
                "type": notif.type,
                "title": notif.title,
                "message": notif.message,
                "group_id": group.id if group else None,
                "related_entity_id": notif.related_entity_id,
                "related_entity_type": notif.related_entity_type,
                "action_url": notif.action_url,
                "is_read": notif.is_read,
                "created_at": notif.created_at.isoformat(),
            }
        }
    )
    return notif


# ---------------------------------------------------------------------------
# Account & Verification Events
# ---------------------------------------------------------------------------

def dispatch_account_verified(user):
    """
    ACCOUNT VERIFIED -> Email + In-app.
    Triggered on successful first-time email verification.
    """
    create_in_app_notification(
        user=user,
        type_code=NotificationType.ACCOUNT_VERIFIED,
        title="Welcome to SplitMate! 🎉",
        message="Your email has been verified. Welcome to SplitMate!",
        action_url="/",
    )

    subject, plain, html = tmpl.account_verified(user.name, action_url="/")
    queue_email(
        send_email_message,
        recipient_email=user.email,
        subject=subject,
        plain=plain,
        html=html,
        user=user,
        event_type='account_verified',
        dedup_key=f"account_verified_{user.id}",
    )


# ---------------------------------------------------------------------------
# Group Events
# ---------------------------------------------------------------------------

def dispatch_member_added(group, new_user, actor):
    """
    ADDED TO GROUP -> Email + In-app + WebSocket.
    """
    action_url = f"/groups/{group.id}"
    create_in_app_notification(
        user=new_user,
        type_code=NotificationType.MEMBER_ADDED,
        title="Added to Group",
        message=f"{actor.name} added you to {group.name}.",
        group=group,
        related_entity_id=str(group.id),
        related_entity_type="group",
        action_url=action_url,
    )

    # Realtime WebSocket update
    _send_ws_group(group.id, "member.added", {
        "user_id": new_user.id,
        "user_name": new_user.name,
        "added_by": actor.name,
    })

    # Branded Email
    subject, plain, html = tmpl.added_to_group(
        name=new_user.name,
        group_name=group.name,
        added_by=actor.name,
        current_balance="₹0",
        action_url=action_url,
    )
    queue_email(
        send_email_message,
        recipient_email=new_user.email,
        subject=subject,
        plain=plain,
        html=html,
        user=new_user,
        event_type='member_added',
        dedup_key=f"member_added_{group.id}_{new_user.id}",
    )


def dispatch_member_removed(group, removed_user, actor):
    """
    REMOVED FROM GROUP -> Email + In-app + WebSocket.
    """
    create_in_app_notification(
        user=removed_user,
        type_code=NotificationType.MEMBER_REMOVED,
        title="Removed from Group",
        message=f"You were removed from {group.name} by {actor.name}.",
        group=group,
        related_entity_id=str(group.id),
        related_entity_type="group",
    )

    _send_ws_group(group.id, "member.removed", {
        "user_id": removed_user.id,
        "user_name": removed_user.name,
        "removed_by": actor.name,
    })

    subject, plain, html = tmpl.removed_from_group(
        name=removed_user.name,
        group_name=group.name,
        removed_by=actor.name,
        final_balance="₹0",
    )
    queue_email(
        send_email_message,
        recipient_email=removed_user.email,
        subject=subject,
        plain=plain,
        html=html,
        user=removed_user,
        event_type='member_removed',
        dedup_key=f"member_removed_{group.id}_{removed_user.id}",
    )


def dispatch_group_created(group, owner):
    """
    GROUP CREATED -> Optional confirmation email + in-app.
    """
    action_url = f"/groups/{group.id}"
    create_in_app_notification(
        user=owner,
        type_code=NotificationType.GROUP_CREATED,
        title="Group Created",
        message=f"You created group '{group.name}'.",
        group=group,
        related_entity_id=str(group.id),
        related_entity_type="group",
        action_url=action_url,
    )

    subject, plain, html = tmpl.group_created(name=owner.name, group_name=group.name, action_url=action_url)
    queue_email(
        send_email_message,
        recipient_email=owner.email,
        subject=subject,
        plain=plain,
        html=html,
        user=owner,
        event_type='group_created',
        dedup_key=f"group_created_{group.id}",
    )


def dispatch_group_deleted(group_name: str, group_id: int, members: list, actor):
    """
    GROUP DELETED -> Email to members + WebSocket.
    """
    _send_ws_group(group_id, "group.deleted", {
        "group_name": group_name,
        "deleted_by": actor.name,
    })

    for member in members:
        if member.id == actor.id:
            continue

        create_in_app_notification(
            user=member,
            type_code=NotificationType.GROUP_DELETED,
            title="Group Deleted",
            message=f"The group '{group_name}' was deleted by {actor.name}.",
            related_entity_id=str(group_id),
            related_entity_type="group",
        )

        subject, plain, html = tmpl.group_deleted(name=member.name, group_name=group_name, deleted_by=actor.name)
        queue_email(
            send_email_message,
            recipient_email=member.email,
            subject=subject,
            plain=plain,
            html=html,
            user=member,
            event_type='group_deleted',
            dedup_key=f"group_deleted_{group_id}_{member.id}",
        )


def dispatch_role_changed(group, target_user, new_role: str, actor):
    """
    OWNERSHIP / ADMIN CHANGE -> Email + In-app + WebSocket.
    """
    action_url = f"/groups/{group.id}"
    create_in_app_notification(
        user=target_user,
        type_code=NotificationType.ROLE_CHANGED,
        title="Role Updated",
        message=f"You are now the {new_role} of {group.name}.",
        group=group,
        related_entity_id=str(group.id),
        related_entity_type="group",
        action_url=action_url,
    )

    _send_ws_group(group.id, "role.changed", {
        "user_id": target_user.id,
        "new_role": new_role,
        "updated_by": actor.name,
    })

    subject, plain, html = tmpl.role_changed(name=target_user.name, group_name=group.name, new_role=new_role, action_url=action_url)
    queue_email(
        send_email_message,
        recipient_email=target_user.email,
        subject=subject,
        plain=plain,
        html=html,
        user=target_user,
        event_type='role_changed',
        dedup_key=f"role_changed_{group.id}_{target_user.id}_{new_role}",
    )


# ---------------------------------------------------------------------------
# Expense Events
# ---------------------------------------------------------------------------

def dispatch_expense_created(expense, payer, splits_data: list, actor):
    """
    EXPENSE CREATED -> WebSocket + In-app + Email for materially affected users.
    splits_data: list of dicts or objects with user_id and share_minor.
    """
    group = expense.group
    action_url = f"/groups/{group.id}"
    total_fmt = _format_minor(expense.amount_minor)

    # 1. Real-time WebSocket to group
    _send_ws_group(group.id, "expense.created", {
        "expense_id": expense.id,
        "description": expense.description,
        "amount_minor": expense.amount_minor,
        "payer_id": payer.id,
        "payer_name": payer.name,
    })
    _send_ws_group(group.id, "balance.updated", {"reason": "expense_created"})

    # 2. In-app and Email to each participant who is financially affected
    for split in splits_data:
        uid = split['user_id'] if isinstance(split, dict) else split.user_id
        share_minor = split['share_minor'] if isinstance(split, dict) else split.share_minor

        # Skip sending redundant notification to the payer if they are the split participant
        if uid == payer.id:
            continue

        try:
            participant = User.objects.get(id=uid)
        except User.DoesNotExist:
            continue

        share_fmt = _format_minor(share_minor)
        resulting_balance_text = f"You owe {payer.name} {share_fmt}"

        create_in_app_notification(
            user=participant,
            type_code=NotificationType.EXPENSE_ADDED,
            title=f"New Expense: {expense.description}",
            message=f"{payer.name} added '{expense.description}' in {group.name} ({total_fmt}). Your share: {share_fmt}.",
            group=group,
            related_entity_id=str(expense.id),
            related_entity_type="expense",
            action_url=action_url,
        )

        subject, plain, html = tmpl.new_expense(
            name=participant.name,
            group_name=group.name,
            description=expense.description,
            total=total_fmt,
            paid_by=payer.name,
            your_share=share_fmt,
            resulting_balance=resulting_balance_text,
            action_url=action_url,
        )
        queue_email(
            send_email_message,
            recipient_email=participant.email,
            subject=subject,
            plain=plain,
            html=html,
            user=participant,
            event_type='expense_added',
            dedup_key=f"expense_added_{expense.id}_{participant.id}",
        )


def dispatch_expense_edited(expense, prev_amount_minor: int, prev_splits: dict, actor):
    """
    EXPENSE UPDATED -> WebSocket + In-app + Email for affected users.
    prev_splits: dict of {user_id: share_minor}
    """
    group = expense.group
    action_url = f"/groups/{group.id}"
    prev_total_fmt = _format_minor(prev_amount_minor)
    new_total_fmt = _format_minor(expense.amount_minor)

    _send_ws_group(group.id, "expense.updated", {
        "expense_id": expense.id,
        "description": expense.description,
        "amount_minor": expense.amount_minor,
    })
    _send_ws_group(group.id, "balance.updated", {"reason": "expense_edited"})

    current_splits = {s.user_id: s.share_minor for s in expense.splits.all()}
    all_affected_uids = set(prev_splits.keys()) | set(current_splits.keys())

    for uid in all_affected_uids:
        if uid == actor.id:
            continue

        try:
            participant = User.objects.get(id=uid)
        except User.DoesNotExist:
            continue

        prev_share = prev_splits.get(uid, 0)
        new_share = current_splits.get(uid, 0)

        prev_share_fmt = _format_minor(prev_share)
        new_share_fmt = _format_minor(new_share)

        create_in_app_notification(
            user=participant,
            type_code=NotificationType.EXPENSE_EDITED,
            title=f"Expense Updated: {expense.description}",
            message=f"{actor.name} updated '{expense.description}' in {group.name}.",
            group=group,
            related_entity_id=str(expense.id),
            related_entity_type="expense",
            action_url=action_url,
        )

        subject, plain, html = tmpl.expense_edited(
            name=participant.name,
            group_name=group.name,
            description=expense.description,
            prev_total=prev_total_fmt,
            new_total=new_total_fmt,
            prev_share=prev_share_fmt,
            new_share=new_share_fmt,
            updated_balance=f"Your share changed to {new_share_fmt}",
            action_url=action_url,
        )
        queue_email(
            send_email_message,
            recipient_email=participant.email,
            subject=subject,
            plain=plain,
            html=html,
            user=participant,
            event_type='expense_edited',
            dedup_key=f"expense_edited_{expense.id}_{participant.id}_{expense.amount_minor}",
        )


def dispatch_expense_deleted(group, description: str, amount_minor: int, affected_user_ids: list, actor):
    """
    EXPENSE DELETED -> WebSocket + In-app + Email for affected users.
    """
    amount_fmt = _format_minor(amount_minor)

    _send_ws_group(group.id, "expense.deleted", {
        "description": description,
        "amount_minor": amount_minor,
        "deleted_by": actor.name,
    })
    _send_ws_group(group.id, "balance.updated", {"reason": "expense_deleted"})

    for uid in affected_user_ids:
        if uid == actor.id:
            continue

        try:
            user = User.objects.get(id=uid)
        except User.DoesNotExist:
            continue

        create_in_app_notification(
            user=user,
            type_code=NotificationType.EXPENSE_DELETED,
            title=f"Expense Deleted: {description}",
            message=f"'{description}' ({amount_fmt}) was deleted from {group.name} by {actor.name}.",
            group=group,
            related_entity_type="expense",
            action_url=f"/groups/{group.id}",
        )

        subject, plain, html = tmpl.expense_deleted(
            name=user.name,
            group_name=group.name,
            description=description,
            amount=amount_fmt,
        )
        queue_email(
            send_email_message,
            recipient_email=user.email,
            subject=subject,
            plain=plain,
            html=html,
            user=user,
            event_type='expense_deleted',
            dedup_key=f"expense_deleted_{group.id}_{uid}_{description}",
        )


# ---------------------------------------------------------------------------
# Settlement & Payment Events
# ---------------------------------------------------------------------------

def dispatch_settlement_created(settlement, from_user, to_user, group, is_settled_zero: bool = False):
    """
    SETTLEMENT RECORDED -> WebSocket + In-app + Email to both parties.
    """
    action_url = f"/groups/{group.id}"
    amount_fmt = _format_minor(settlement.amount_minor)

    _send_ws_group(group.id, "settlement.created", {
        "settlement_id": settlement.id,
        "from_user_id": from_user.id,
        "from_user_name": from_user.name,
        "to_user_id": to_user.id,
        "to_user_name": to_user.name,
        "amount_minor": settlement.amount_minor,
    })
    _send_ws_group(group.id, "balance.updated", {"reason": "settlement_created"})

    # 1. Notify Payer (from_user)
    create_in_app_notification(
        user=from_user,
        type_code=NotificationType.PAYMENT_RECORDED,
        title="Payment Recorded",
        message=f"Your payment of {amount_fmt} to {to_user.name} has been recorded.",
        group=group,
        related_entity_id=str(settlement.id),
        related_entity_type="settlement",
        action_url=action_url,
    )
    subject_payer, plain_payer, html_payer = tmpl.payment_recorded(
        name=from_user.name,
        recipient=to_user.name,
        amount=amount_fmt,
        group_name=group.name,
        action_url=action_url,
    )
    queue_email(
        send_email_message,
        recipient_email=from_user.email,
        subject=subject_payer,
        plain=plain_payer,
        html=html_payer,
        user=from_user,
        event_type='payment_recorded',
        dedup_key=f"settlement_{settlement.id}_{from_user.id}",
    )

    # 2. Notify Recipient (to_user)
    create_in_app_notification(
        user=to_user,
        type_code=NotificationType.PAYMENT_RECEIVED,
        title="Payment Received",
        message=f"{from_user.name} paid you {amount_fmt} in {group.name}.",
        group=group,
        related_entity_id=str(settlement.id),
        related_entity_type="settlement",
        action_url=action_url,
    )
    subject_recip, plain_recip, html_recip = tmpl.payment_received(
        name=to_user.name,
        payer=from_user.name,
        amount=amount_fmt,
        group_name=group.name,
        action_url=action_url,
    )
    queue_email(
        send_email_message,
        recipient_email=to_user.email,
        subject=subject_recip,
        plain=plain_recip,
        html=html_recip,
        user=to_user,
        event_type='payment_received',
        dedup_key=f"settlement_{settlement.id}_{to_user.id}",
    )

    # 3. If balance reached zero between them -> notify balance settled
    if is_settled_zero:
        dispatch_balance_settled(from_user, to_user, group)


def dispatch_balance_settled(user_a, user_b, group):
    """
    BALANCE SETTLED -> In-app + optional email when outstanding balance reaches zero.
    """
    action_url = f"/groups/{group.id}"
    for user, other in [(user_a, user_b), (user_b, user_a)]:
        create_in_app_notification(
            user=user,
            type_code=NotificationType.BALANCE_SETTLED,
            title="All Settled Up! ✨",
            message=f"You're all settled up with {other.name} for {group.name}.",
            group=group,
            related_entity_type="group",
            action_url=action_url,
        )

        subject, plain, html = tmpl.balance_settled(
            name=user.name,
            other_name=other.name,
            group_name=group.name,
            action_url=action_url,
        )
        queue_email(
            send_email_message,
            recipient_email=user.email,
            subject=subject,
            plain=plain,
            html=html,
            user=user,
            event_type='balance_settled',
            dedup_key=f"settled_zero_{group.id}_{user.id}_{other.id}",
            cooldown_seconds=86400,
        )


def dispatch_settlement_reminder(group, creditor, debtor, amount_minor: int):
    """
    SETTLEMENT REMINDER -> In-app + Email sent to debtor.
    Enforces 24h deduplication cooldown per debtor-creditor pair in group.
    """
    action_url = f"/groups/{group.id}"
    amount_fmt = _format_minor(amount_minor)

    create_in_app_notification(
        user=debtor,
        type_code=NotificationType.SETTLEMENT_REMINDER,
        title="Settlement Reminder",
        message=f"{creditor.name} sent a reminder for a pending balance of {amount_fmt} in {group.name}.",
        group=group,
        related_entity_type="group",
        action_url=action_url,
    )

    subject, plain, html = tmpl.settlement_reminder(
        name=debtor.name,
        creditor=creditor.name,
        amount=amount_fmt,
        group_name=group.name,
        action_url=action_url,
    )
    return send_email_message(
        recipient_email=debtor.email,
        subject=subject,
        plain=plain,
        html=html,
        user=debtor,
        event_type='settlement_reminder',
        dedup_key=f"reminder_{group.id}_{creditor.id}_{debtor.id}",
        cooldown_seconds=86400,  # 24h cooldown
    )
