from rest_framework import serializers
from apps.notifications.models import Notification, NotificationPreference


class NotificationSerializer(serializers.ModelSerializer):
    group_name = serializers.CharField(source='group.name', read_only=True, default='')

    class Meta:
        model = Notification
        fields = [
            'id',
            'type',
            'title',
            'message',
            'group',
            'group_name',
            'related_entity_id',
            'related_entity_type',
            'action_url',
            'is_read',
            'created_at',
            'read_at',
        ]
        read_only_fields = ['id', 'created_at']


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    email_security_alerts = serializers.BooleanField(required=False, default=True)

    class Meta:
        model = NotificationPreference
        fields = [
            'email_security_alerts',
            'email_expense_updates',
            'email_group_activity',
            'email_settlement_updates',
            'email_balance_reminders',
            'email_product_news',
            'in_app_notifications',
            'updated_at',
        ]
        read_only_fields = ['updated_at']

    def validate_email_security_alerts(self, value):
        if value is False:
            raise serializers.ValidationError(
                "Security alert emails are required for account protection and cannot be disabled."
            )
        return value
