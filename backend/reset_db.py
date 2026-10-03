import os
import sys
import django

# Set up Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import transaction
from apps.expenses.models import ExpenseSplit, Expense
from apps.settlements.models import Settlement
from apps.activity.models import Activity
from apps.notifications.models import Notification, NotificationPreference, EmailLog
from apps.groups.models import Membership, Group
from apps.accounts.models import OTPRecord, RefreshToken, User
from django.contrib.sessions.models import Session

def reset_all_data():
    print("Clearing all data from SplitMate database...")
    with transaction.atomic():
        es_count, _ = ExpenseSplit.objects.all().delete()
        exp_count, _ = Expense.objects.all().delete()
        settle_count, _ = Settlement.objects.all().delete()
        act_count, _ = Activity.objects.all().delete()
        notif_count, _ = Notification.objects.all().delete()
        pref_count, _ = NotificationPreference.objects.all().delete()
        elog_count, _ = EmailLog.objects.all().delete()
        mem_count, _ = Membership.objects.all().delete()
        grp_count, _ = Group.objects.all().delete()
        otp_count, _ = OTPRecord.objects.all().delete()
        rt_count, _ = RefreshToken.objects.all().delete()
        usr_count, _ = User.objects.all().delete()
        sess_count, _ = Session.objects.all().delete()

    print(f"Data wiped successfully:")
    print(f"  - ExpenseSplits deleted: {es_count}")
    print(f"  - Expenses deleted: {exp_count}")
    print(f"  - Settlements deleted: {settle_count}")
    print(f"  - Activities deleted: {act_count}")
    print(f"  - Notifications deleted: {notif_count}")
    print(f"  - Preferences deleted: {pref_count}")
    print(f"  - Email logs deleted: {elog_count}")
    print(f"  - Memberships deleted: {mem_count}")
    print(f"  - Groups deleted: {grp_count}")
    print(f"  - OTP records deleted: {otp_count}")
    print(f"  - Refresh tokens deleted: {rt_count}")
    print(f"  - Users deleted: {usr_count}")
    print(f"  - Sessions deleted: {sess_count}")
    print("Database is completely clean and empty.")

if __name__ == '__main__':
    reset_all_data()
