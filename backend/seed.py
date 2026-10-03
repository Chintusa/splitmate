import os
import sys
from datetime import date

import django

# Set up Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import transaction
from apps.accounts.models import User
from apps.groups.models import Group, Membership
from apps.expenses.models import Expense, ExpenseSplit
from apps.settlements.models import Settlement
from apps.activity.models import Activity
from core.money import equal_split, validate_exact

def run_seed():
    print("Seeding SplitMate database...")

    with transaction.atomic():
        # 1. Users
        alice, created_a = User.objects.get_or_create(
            email="alice@test.com",
            defaults={"name": "Alice"}
        )
        if created_a or not alice.check_password("password123"):
            alice.set_password("password123")
            alice.save()

        bob, created_b = User.objects.get_or_create(
            email="bob@test.com",
            defaults={"name": "Bob"}
        )
        if created_b or not bob.check_password("password123"):
            bob.set_password("password123")
            bob.save()

        print(f"Users created/ready: {alice.email}, {bob.email}")

        # 2. Group
        group, _ = Group.objects.get_or_create(
            name="Goa Trip",
            defaults={"owner": alice}
        )

        # 3. Memberships
        Membership.objects.get_or_create(group=group, user=alice)
        Membership.objects.get_or_create(group=group, user=bob)

        # Clear existing expenses & activity for Goa Trip to make seed idempotent
        Expense.objects.filter(group=group).delete()
        Settlement.objects.filter(group=group).delete()
        Activity.objects.filter(group=group).delete()

        # 4. Expense 1: Equal Split (e.g. Hotel Booking ₹6000 = 600000 minor)
        total_1 = 600000
        shares_1 = equal_split(total_1, [str(alice.id), str(bob.id)])

        exp_1 = Expense.objects.create(
            group=group,
            created_by=alice,
            payer=alice,
            description="Goa Beach Resort",
            amount_minor=total_1,
            date=date.today()
        )
        ExpenseSplit.objects.bulk_create([
            ExpenseSplit(expense=exp_1, user_id=int(uid), share_minor=share)
            for uid, share in shares_1.items()
        ])
        Activity.objects.create(
            group=group,
            actor=alice,
            type="expense_added",
            payload={
                "expense_id": exp_1.id,
                "description": exp_1.description,
                "amount_minor": exp_1.amount_minor,
                "payer_name": alice.name
            }
        )

        # 5. Expense 2: Exact Split (e.g. Dinner ₹2500 = 250000 minor: Bob paid 250000; Bob share 150000, Alice share 100000)
        total_2 = 250000
        exact_shares = {str(bob.id): 150000, str(alice.id): 100000}
        shares_2 = validate_exact(total_2, exact_shares)

        exp_2 = Expense.objects.create(
            group=group,
            created_by=bob,
            payer=bob,
            description="Seafood Dinner at Thalassa",
            amount_minor=total_2,
            date=date.today()
        )
        ExpenseSplit.objects.bulk_create([
            ExpenseSplit(expense=exp_2, user_id=int(uid), share_minor=share)
            for uid, share in shares_2.items()
        ])
        Activity.objects.create(
            group=group,
            actor=bob,
            type="expense_added",
            payload={
                "expense_id": exp_2.id,
                "description": exp_2.description,
                "amount_minor": exp_2.amount_minor,
                "payer_name": bob.name
            }
        )

    print("Seed completed successfully!")

if __name__ == "__main__":
    run_seed()
