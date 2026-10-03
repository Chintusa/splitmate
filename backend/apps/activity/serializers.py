from rest_framework import serializers
from apps.accounts.serializers import UserSerializer
from apps.activity.models import Activity

class ActivitySerializer(serializers.ModelSerializer):
    actor = UserSerializer(read_only=True)

    class Meta:
        model = Activity
        fields = ['id', 'group_id', 'actor', 'type', 'payload', 'created_at']
