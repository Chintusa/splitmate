from django.db import models
from apps.accounts.models import User
from apps.groups.models import Group

class Activity(models.Model):
    id = models.BigAutoField(primary_key=True)
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='activities')
    actor = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name='activities')
    type = models.CharField(max_length=50)
    payload = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Activity {self.type} in {self.group.name}"
