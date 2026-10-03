from django.db import models
from apps.accounts.models import User
from apps.groups.models import Group

class Expense(models.Model):
    id = models.BigAutoField(primary_key=True)
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='expenses')
    created_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name='created_expenses')
    payer = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='paid_expenses')
    description = models.CharField(max_length=255)
    amount_minor = models.BigIntegerField()
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.description} ({self.amount_minor})"

class ExpenseSplit(models.Model):
    id = models.BigAutoField(primary_key=True)
    expense = models.ForeignKey(Expense, on_delete=models.CASCADE, related_name='splits')
    user = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='expense_splits')
    share_minor = models.BigIntegerField()

    class Meta:
        unique_together = ('expense', 'user')

    def __str__(self):
        return f"{self.user.name}: {self.share_minor} for expense {self.expense_id}"
