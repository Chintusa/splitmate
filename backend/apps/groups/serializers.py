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

    class Meta:
        model = Group
        fields = ['id', 'name', 'owner', 'members', 'created_at']

    def get_members(self, obj):
        memberships = obj.memberships.select_related('user').all()
        return [UserSerializer(m.user).data for m in memberships]

class GroupCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)

class AddMemberSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False)
    user_id = serializers.IntegerField(required=False)
