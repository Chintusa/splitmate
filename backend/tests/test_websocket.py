import pytest
from asgiref.sync import sync_to_async
from channels.testing import WebsocketCommunicator
from channels.routing import URLRouter
from apps.accounts.models import User
from apps.accounts.utils import create_access_token
from apps.groups.models import Group, Membership
from apps.realtime.routing import websocket_urlpatterns

@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_websocket_authentication_and_authorization():
    alice = await sync_to_async(User.objects.create_user)(email='alice_ws@test.com', name='Alice WS', password='pass')
    bob = await sync_to_async(User.objects.create_user)(email='bob_ws@test.com', name='Bob WS', password='pass')

    group = await sync_to_async(Group.objects.create)(name='WS Group', owner=alice)
    await sync_to_async(Membership.objects.create)(group=group, user=alice)

    token_alice = create_access_token(alice)
    token_bob = create_access_token(bob)

    application = URLRouter(websocket_urlpatterns)

    # 1. Valid member Alice connects successfully
    communicator_alice = WebsocketCommunicator(
        application,
        f"/ws/groups/{group.id}/?token={token_alice}"
    )
    connected_a, _ = await communicator_alice.connect(timeout=5)
    assert connected_a
    await communicator_alice.disconnect()

    # 2. Non-member Bob rejected
    communicator_bob = WebsocketCommunicator(
        application,
        f"/ws/groups/{group.id}/?token={token_bob}"
    )
    connected_b, _ = await communicator_bob.connect(timeout=5)
    assert connected_b
    close_event_b = await communicator_bob.receive_output(timeout=5)
    assert close_event_b['type'] == 'websocket.close'
    assert close_event_b['code'] == 4003
    await communicator_bob.disconnect()

    # 3. Invalid token rejected
    communicator_bad = WebsocketCommunicator(
        application,
        f"/ws/groups/{group.id}/?token=invalid_token"
    )
    connected_bad, _ = await communicator_bad.connect(timeout=5)
    assert connected_bad
    close_event_bad = await communicator_bad.receive_output(timeout=5)
    assert close_event_bad['type'] == 'websocket.close'
    assert close_event_bad['code'] == 4003
    await communicator_bad.disconnect()
