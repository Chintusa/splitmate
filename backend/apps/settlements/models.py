from django.db import models
from apps.accounts.models import User
from apps.groups.models import Group

class Settlement(models.Model):
    id = models.BigAutoField(primary_key=True)
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='settlements')
    from_user = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='sent_settlements')
    to_user = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='received_settlements')
    amount_minor = models.BigIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Settlement {self.from_user.name} -> {self.to_user.name}: {self.amount_minor}"
