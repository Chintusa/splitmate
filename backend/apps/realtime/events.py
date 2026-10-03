from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def broadcast_group_updated(group_id: int, reason: str = None):
    channel_layer = get_channel_layer()
    if not channel_layer:
        return
    data = {
        "event": "group:updated",
        "group_id": group_id,
        "reason": reason
    }
    async_to_sync(channel_layer.group_send)(
        f"group_{group_id}",
        {
            "type": "group_event",
            "data": data
        }
    )
    # Also notify all members in their personal user rooms so all dashboard / list pages update live
    try:
        from apps.groups.models import Membership
        member_ids = list(Membership.objects.filter(group_id=group_id).values_list('user_id', flat=True))
        for uid in member_ids:
            async_to_sync(channel_layer.group_send)(
                f"user_{uid}",
                {
                    "type": "user_event",
                    "data": data
                }
            )
    except Exception:
        pass


def broadcast_balance_updated(group_id: int, affected_user_ids: list = None):
    channel_layer = get_channel_layer()
    if not channel_layer:
        return
    data = {
        "event": "balance:updated",
        "group_id": group_id
    }
    # Always notify the group room
    async_to_sync(channel_layer.group_send)(
        f"group_{group_id}",
        {
            "type": "group_event",
            "data": data
        }
    )
    # Also notify all members in their personal user rooms
    try:
        from apps.groups.models import Membership
        target_uids = set(affected_user_ids or [])
        member_uids = set(Membership.objects.filter(group_id=group_id).values_list('user_id', flat=True))
        all_uids = target_uids.union(member_uids)
        for uid in all_uids:
            async_to_sync(channel_layer.group_send)(
                f"user_{uid}",
                {
                    "type": "user_event",
                    "data": data
                }
            )
    except Exception:
        pass


def broadcast_to_user(user_id: int, event_name: str, payload: dict = None):
    """Broadcast an arbitrary event to a single user's channel."""
    channel_layer = get_channel_layer()
    if not channel_layer:
        return
    data = {"event": event_name, **(payload or {})}
    async_to_sync(channel_layer.group_send)(
        f"user_{user_id}",
        {
            "type": "user_event",
            "data": data
        }
    )


def broadcast_to_group(group_id: int, event_name: str, payload: dict = None):
    """Broadcast an arbitrary event to an entire group's channel."""
    channel_layer = get_channel_layer()
    if not channel_layer:
        return
    data = {"event": event_name, "group_id": group_id, **(payload or {})}
    async_to_sync(channel_layer.group_send)(
        f"group_{group_id}",
        {
            "type": "group_event",
            "data": data
        }
    )
