import random
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from pft.models import (
    Account,
    BudgetFile,
    BudgetMonth,
    Category,
    EnvelopeAssignment,
    LedgerPosting,
    LedgerTransaction,
    Payee,
)

# Deterministic so repeated runs and screenshots look the same.
SEED = 20260812

INCOME_PLAN = [
    ("Salary", Decimal("4200.00"), "Acme Corp"),
    ("Freelance", Decimal("650.00"), "Side Project Ltd"),
]

EXPENSE_PLAN = [
    # (category, payee, low, high, times per month)
    ("Housing", "City Apartments", Decimal("1400"), Decimal("1400"), 1),
    ("Food", "Green Grocer", Decimal("35"), Decimal("120"), 6),
    ("Transportation", "Metro Transit", Decimal("12"), Decimal("60"), 4),
    ("Utilities", "PowerCo", Decimal("60"), Decimal("140"), 1),
    ("Entertainment", "Cinema Plus", Decimal("15"), Decimal("55"), 2),
    ("Healthcare", "City Pharmacy", Decimal("20"), Decimal("90"), 1),
    ("Shopping", "Marketplace", Decimal("25"), Decimal("180"), 3),
]

ENVELOPE_TARGETS = {
    "Housing": Decimal("1400"),
    "Food": Decimal("500"),
    "Transportation": Decimal("150"),
    "Utilities": Decimal("140"),
    "Entertainment": Decimal("120"),
    "Healthcare": Decimal("100"),
    "Shopping": Decimal("300"),
}


class Command(BaseCommand):
    help = (
        "Create a demo account with several months of realistic transactions, so a "
        "fresh install is not an empty shell. Safe to re-run: it skips an existing "
        "demo user unless --reset is passed."
    )

    def add_arguments(self, parser):
        parser.add_argument("--email", default="demo@fintrack.local")
        parser.add_argument("--password", default="demo-password-123")
        parser.add_argument("--months", type=int, default=6)
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete the existing demo user and recreate it.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        email = options["email"]
        password = options["password"]
        months = options["months"]

        if months < 1:
            raise CommandError("--months must be at least 1")

        user = self._recreate_user(email, password, reset=options["reset"])
        if user is None:
            return

        budget_file, checking, savings = self._prepare_accounts(user)
        categories = {
            category.name: category
            for category in Category.objects.filter(budget_file=budget_file)
        }

        rng = random.Random(SEED)
        first_of_this_month = timezone.now().date().replace(day=1)
        created = 0

        for offset in range(months - 1, -1, -1):
            month_start = first_of_this_month
            for _ in range(offset):
                month_start = (month_start - timedelta(days=1)).replace(day=1)
            created += self._seed_month(
                budget_file, checking, categories, rng, month_start
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {created} transactions across {months} month(s) for {email}."
            )
        )
        self.stdout.write(f"  Accounts: {checking.name}, {savings.name}")
        self.stdout.write(f"  Sign in with: {email} / {password}")

    def _recreate_user(self, email, password, *, reset):
        user_model = get_user_model()
        existing = user_model.objects.filter(email__iexact=email).first()

        if existing and not reset:
            self.stdout.write(
                self.style.WARNING(
                    f"{email} already exists. Pass --reset to rebuild the demo data."
                )
            )
            return None

        if existing:
            existing.delete()
            self.stdout.write(f"Removed existing demo user {email}.")

        return user_model.objects.create_user(
            email=email, username=email, password=password
        )

    def _prepare_accounts(self, user):
        # The post_save signal already created a default budget file, a Cash
        # account and the standard category set.
        budget_file = BudgetFile.objects.get(user=user, is_default=True)
        checking = Account.objects.filter(budget_file=budget_file).first()
        checking.opening_balance = Decimal("1800.00")
        checking.save(update_fields=["opening_balance", "updated_at"])

        savings = Account.objects.create(
            budget_file=budget_file,
            name="Savings",
            type=Account.TYPE_SAVINGS,
            opening_balance=Decimal("5200.00"),
            currency_code=budget_file.currency_code,
        )
        return budget_file, checking, savings

    def _category_for(self, budget_file, categories, name, kind):
        if name not in categories:
            categories[name] = Category.objects.create(
                budget_file=budget_file, name=name, kind=kind
            )
        return categories[name]

    def _seed_month(self, budget_file, account, categories, rng, month_start):
        created = 0

        for name, amount, payee_name in INCOME_PLAN:
            category = self._category_for(
                budget_file, categories, name, Category.KIND_INCOME
            )
            created += self._write_transaction(
                budget_file=budget_file,
                account=account,
                category=category,
                payee_name=payee_name,
                memo=f"{name} - {month_start:%B %Y}",
                amount=amount,
                is_income=True,
                when=month_start + timedelta(days=1),
            )

        for name, payee_name, low, high, times in EXPENSE_PLAN:
            category = self._category_for(
                budget_file, categories, name, Category.KIND_EXPENSE
            )
            for _ in range(times):
                created += self._write_transaction(
                    budget_file=budget_file,
                    account=account,
                    category=category,
                    payee_name=payee_name,
                    memo=name,
                    amount=Decimal(rng.randint(int(low), int(high))),
                    is_income=False,
                    when=month_start + timedelta(days=rng.randint(0, 26)),
                )

        self._seed_envelopes(budget_file, categories, month_start)
        return created

    def _seed_envelopes(self, budget_file, categories, month_start):
        budget_month, _ = BudgetMonth.objects.get_or_create(
            budget_file=budget_file,
            year=month_start.year,
            month=month_start.month,
            defaults={"mode": BudgetMonth.MODE_ENVELOPE},
        )
        for name, assigned in ENVELOPE_TARGETS.items():
            category = self._category_for(
                budget_file, categories, name, Category.KIND_EXPENSE
            )
            EnvelopeAssignment.objects.get_or_create(
                budget_month=budget_month,
                category=category,
                defaults={"assigned_amount": assigned},
            )

    def _write_transaction(
        self,
        *,
        budget_file,
        account,
        category,
        payee_name,
        memo,
        amount,
        is_income,
        when,
    ):
        payee, _ = Payee.objects.get_or_create(budget_file=budget_file, name=payee_name)

        ledger_tx = LedgerTransaction.objects.create(
            budget_file=budget_file,
            transaction_date=when,
            payee=payee,
            memo=memo,
            source_type=LedgerTransaction.SOURCE_MANUAL,
            cleared=True,
        )

        # Double entry: money into the account is positive there and negative on
        # the income category, and the reverse for spending.
        account_amount = amount if is_income else -amount
        LedgerPosting.objects.create(
            transaction=ledger_tx,
            account=account,
            amount=account_amount,
            sort_order=0,
        )
        LedgerPosting.objects.create(
            transaction=ledger_tx,
            category=category,
            amount=-account_amount,
            sort_order=1,
        )
        return 1
