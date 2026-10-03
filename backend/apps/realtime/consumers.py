import re
import urllib.parse
from channels.generic.websocket import AsyncJsonWebsocketConsumer  # type: ignore[import-untyped]
from channels.db import database_sync_to_async  # type: ignore[import-untyped]

from apps.accounts.utils import decode_access_token
from apps.groups.models import Membership


class GroupConsumer(AsyncJsonWebsocketConsumer):
    user_id: int
    group_id: int
    group_room: str
    user_room: str

    async def connect(self):
        query_string = self.scope.get('query_string', b'').decode('utf-8')
        params = urllib.parse.parse_qs(query_string)
        tokens = params.get('token', [])

        if not tokens:
            await self.accept()
            await self.close(code=4001)
            return

        raw_token = tokens[0]
        try:
            payload = decode_access_token(raw_token)
            user_id = payload.get('user_id')
            if not user_id:
                raise ValueError("No user_id in token")
        except Exception:
            await self.accept()
            await self.close(code=4003)
            return

        group_id_str = self.scope.get('url_route', {}).get('kwargs', {}).get('group_id')
        if not group_id_str:
            path = self.scope.get('path', '')
            match = re.search(r'/ws/groups/(\d+)', path)
            if match:
                group_id_str = match.group(1)

        try:
            group_id = int(group_id_str)
        except (ValueError, TypeError):
            await self.accept()
            await self.close(code=4004)
            return

        is_member = await self.check_membership(group_id, user_id)
        if not is_member:
            await self.accept()
            await self.close(code=4003)
            return

        self.user_id = user_id
        self.group_id = group_id
        self.group_room = f"group_{self.group_id}"
        self.user_room = f"user_{self.user_id}"

        # Join room groups
        await self.channel_layer.group_add(self.group_room, self.channel_name)
        await self.channel_layer.group_add(self.user_room, self.channel_name)

        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_room'):
            await self.channel_layer.group_discard(self.group_room, self.channel_name)
        if hasattr(self, 'user_room'):
            await self.channel_layer.group_discard(self.user_room, self.channel_name)

    @database_sync_to_async
    def check_membership(self, group_id, user_id):
        return Membership.objects.filter(group_id=group_id, user_id=user_id).exists()

    async def group_event(self, event):
        await self.send_json(event['data'])

    async def user_event(self, event):
        await self.send_json(event['data'])


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """
    Dedicated user notification consumer for real-time in-app alerts,
    badge updates, and user-scoped events across the entire application.
    """
    user_id: int
    user_room: str

    async def connect(self):
        query_string = self.scope.get('query_string', b'').decode('utf-8')
        params = urllib.parse.parse_qs(query_string)
        tokens = params.get('token', [])

        if not tokens:
            await self.accept()
            await self.close(code=4001)
            return

        raw_token = tokens[0]
        try:
            payload = decode_access_token(raw_token)
            user_id = payload.get('user_id')
            if not user_id:
                raise ValueError("No user_id in token")
        except Exception:
            await self.accept()
            await self.close(code=4003)
            return

        self.user_id = user_id
        self.user_room = f"user_{self.user_id}"

        await self.channel_layer.group_add(self.user_room, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'user_room'):
            await self.channel_layer.group_discard(self.user_room, self.channel_name)

    async def user_event(self, event):
        await self.send_json(event['data'])

    async def notification_created(self, event):
        await self.send_json(event['data'])
