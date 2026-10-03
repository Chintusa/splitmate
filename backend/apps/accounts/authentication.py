from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from apps.accounts.models import User
from apps.accounts.utils import decode_access_token

class JWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return None

        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            raise AuthenticationFailed("Invalid Authorization header format. Expected 'Bearer <token>'")

        raw_token = parts[1]
        try:
            payload = decode_access_token(raw_token)
        except ValueError as e:
            raise AuthenticationFailed(f"Invalid or expired token: {e}")

        user_id = payload.get('user_id')
        try:
            user = User.objects.get(id=user_id, is_active=True)
        except User.DoesNotExist:
            raise AuthenticationFailed("User not found or inactive")

        return (user, raw_token)

    def authenticate_header(self, request):
        return 'Bearer realm="api"'
