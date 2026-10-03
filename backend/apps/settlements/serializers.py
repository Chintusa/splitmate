from rest_framework import serializers
from apps.accounts.serializers import UserSerializer
from apps.settlements.models import Settlement

class SettlementSerializer(serializers.ModelSerializer):
    from_user = UserSerializer(read_only=True)
    to_user = UserSerializer(read_only=True)

    class Meta:
        model = Settlement
        fields = ['id', 'group_id', 'from_user', 'to_user', 'amount_minor', 'created_at']

class SettlementCreateSerializer(serializers.Serializer):
    to_user_id = serializers.IntegerField()
    amount_minor = serializers.IntegerField()
