from rest_framework import serializers
from apps.accounts.serializers import UserSerializer
from apps.expenses.models import Expense, ExpenseSplit

class ExpenseSplitSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = ExpenseSplit
        fields = ['id', 'user', 'user_id', 'share_minor']

class ExpenseSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    payer = UserSerializer(read_only=True)
    splits = ExpenseSplitSerializer(many=True, read_only=True)

    class Meta:
        model = Expense
        fields = ['id', 'group_id', 'created_by', 'payer', 'description', 'amount_minor', 'date', 'created_at', 'splits']

class ExpenseCreateUpdateSerializer(serializers.Serializer):
    description = serializers.CharField(max_length=255)
    amount_minor = serializers.IntegerField()
    payer_id = serializers.IntegerField()
    date = serializers.DateField()
    split_type = serializers.ChoiceField(choices=['equal', 'exact'])
    # For 'equal': split_member_ids (list of ints)
    split_member_ids = serializers.ListField(child=serializers.IntegerField(), required=False)
    # For 'exact': shares (dict of user_id_str -> share_minor_int)
    shares = serializers.DictField(child=serializers.IntegerField(), required=False)
