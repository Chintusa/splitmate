from rest_framework import serializers
from apps.accounts.serializers import UserSerializer
from apps.groups.models import Group, Membership

class MembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    class Meta:
        model = Membership
        fields = ['id', 'user', 'joined_at']

class GroupSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    members = serializers.SerializerMethodField(read_only=True)
    user_balance_minor = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Group
        fields = ['id', 'name', 'owner', 'members', 'user_balance_minor', 'created_at']

    def get_members(self, obj):
        memberships = obj.memberships.select_related('user').all()
        return [UserSerializer(m.user).data for m in memberships]

    def get_user_balance_minor(self, obj):
        request = self.context.get('request')
        if not request or not getattr(request, 'user', None) or not request.user.is_authenticated:
            return 0
        from apps.groups.services import calculate_group_balances
        try:
            balances = calculate_group_balances(obj.id)
            for item in balances.get('net_balances', []):
                if item['user_id'] == request.user.id:
                    return item['net_minor']
        except Exception:
            pass
        return 0

class GroupCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)

class AddMemberSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False)
    user_id = serializers.IntegerField(required=False)
