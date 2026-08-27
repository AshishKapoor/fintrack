"""Tests for automatic scheduled-transaction materialization.

Covers the shared `materialize_due_scheduled_transactions` helper in
finance_services.py and its Celery beat wrapper,
`materialize_due_scheduled_transactions_task` (see CELERY_BEAT_SCHEDULE in
app/settings/base.py) - this is what makes recurring transactions post
themselves instead of requiring someone to click "Run Due" (still exercised
directly, cross-tenant, in test_tenant_isolation.py).
"""

from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase

from pft.finance_services import materialize_due_scheduled_transactions
from pft.models import (
    Account,
    BudgetFile,
    Category,
    LedgerTransaction,
    ScheduledTransaction,
)
from pft.tasks import materialize_due_scheduled_transactions_task

User = get_user_model()


def _make_user(email):
    return User.objects.create_user(email=email, username=email, password="StrongPass123!")


def _schedule(budget_file, *, name, next_run_date, account, category, is_active=True):
    """A schedule with a valid, balanced two-posting template."""
    return ScheduledTransaction.objects.create(
        budget_file=budget_file,
        name=name,
        is_active=is_active,
        start_date=next_run_date,
        next_run_date=next_run_date,
        frequency=ScheduledTransaction.FREQ_MONTHLY,
        interval=1,
        transaction_template={
            "memo": name,
            "postings": [
                {"account_id": account.id, "amount": "-25.00"},
                {"category_id": category.id, "amount": "25.00"},
            ],
        },
    )


def _unbalanced_schedule(budget_file, *, name, next_run_date, account):
    """A schedule whose template fails validation (postings don't sum to zero)."""
    return ScheduledTransaction.objects.create(
        budget_file=budget_file,
        name=name,
        is_active=True,
        start_date=next_run_date,
        next_run_date=next_run_date,
        frequency=ScheduledTransaction.FREQ_MONTHLY,
        transaction_template={"postings": [{"account_id": account.id, "amount": "-10.00"}]},
    )


class MaterializeDueScheduledTransactionsTests(TestCase):
    def setUp(self):
        self.user = _make_user("scheduler-user@example.com")
        self.budget_file = BudgetFile.objects.get(user=self.user, is_default=True)
        self.account = Account.objects.get(budget_file=self.budget_file, name="Cash")
        self.category = Category.objects.filter(
            budget_file=self.budget_file, kind=Category.KIND_EXPENSE
        ).first()

    def test_materializes_a_due_schedule_and_advances_next_run_date(self):
        schedule = _schedule(
            self.budget_file,
            name="Rent",
            next_run_date=date(2026, 3, 1),
            account=self.account,
            category=self.category,
        )

        created_ids, errors = materialize_due_scheduled_transactions(
            ScheduledTransaction.objects.filter(budget_file=self.budget_file),
            run_date=date(2026, 3, 1),
        )

        self.assertEqual(errors, [])
        self.assertEqual(len(created_ids), 1)
        self.assertTrue(LedgerTransaction.objects.filter(pk=created_ids[0]).exists())
        schedule.refresh_from_db()
        self.assertEqual(schedule.next_run_date, date(2026, 4, 1))
        self.assertIsNotNone(schedule.last_run_at)

    def test_leaves_schedules_that_are_not_yet_due(self):
        schedule = _schedule(
            self.budget_file,
            name="Future rent",
            next_run_date=date(2026, 5, 1),
            account=self.account,
            category=self.category,
        )

        created_ids, errors = materialize_due_scheduled_transactions(
            ScheduledTransaction.objects.filter(budget_file=self.budget_file),
            run_date=date(2026, 3, 1),
        )

        self.assertEqual((created_ids, errors), ([], []))
        schedule.refresh_from_db()
        self.assertIsNone(schedule.last_run_at)

    def test_leaves_inactive_schedules_alone(self):
        schedule = _schedule(
            self.budget_file,
            name="Paused",
            next_run_date=date(2026, 3, 1),
            account=self.account,
            category=self.category,
            is_active=False,
        )

        created_ids, errors = materialize_due_scheduled_transactions(
            ScheduledTransaction.objects.filter(budget_file=self.budget_file),
            run_date=date(2026, 3, 1),
        )

        self.assertEqual((created_ids, errors), ([], []))
        schedule.refresh_from_db()
        self.assertIsNone(schedule.last_run_at)

    def test_on_error_raise_stops_and_leaves_later_due_schedules_unprocessed(self):
        broken = _unbalanced_schedule(
            self.budget_file,
            name="Broken",
            next_run_date=date(2026, 3, 1),
            account=self.account,
        )
        later = _schedule(
            self.budget_file,
            name="Later, also due",
            next_run_date=date(2026, 3, 2),
            account=self.account,
            category=self.category,
        )

        with self.assertRaises(ValueError) as ctx:
            materialize_due_scheduled_transactions(
                ScheduledTransaction.objects.filter(budget_file=self.budget_file),
                run_date=date(2026, 3, 2),
            )

        self.assertIn(f"Scheduled transaction {broken.id}", str(ctx.exception))
        broken.refresh_from_db()
        later.refresh_from_db()
        self.assertIsNone(broken.last_run_at)
        self.assertIsNone(later.last_run_at)

    def test_on_error_skip_continues_past_a_bad_schedule(self):
        broken = _unbalanced_schedule(
            self.budget_file,
            name="Broken",
            next_run_date=date(2026, 3, 1),
            account=self.account,
        )
        good = _schedule(
            self.budget_file,
            name="Good",
            next_run_date=date(2026, 3, 2),
            account=self.account,
            category=self.category,
        )

        created_ids, errors = materialize_due_scheduled_transactions(
            ScheduledTransaction.objects.filter(budget_file=self.budget_file),
            run_date=date(2026, 3, 2),
            on_error="skip",
        )

        self.assertEqual(len(errors), 1)
        self.assertEqual(errors[0][0], broken.id)
        self.assertEqual(len(created_ids), 1)
        good.refresh_from_db()
        broken.refresh_from_db()
        self.assertIsNotNone(good.last_run_at)
        self.assertIsNone(broken.last_run_at)


class MaterializeDueScheduledTransactionsTaskTests(TestCase):
    """The Celery beat wrapper - see CELERY_BEAT_SCHEDULE in settings/base.py."""

    def _tenant(self, email):
        user = _make_user(email)
        budget_file = BudgetFile.objects.get(user=user, is_default=True)
        account = Account.objects.get(budget_file=budget_file, name="Cash")
        category = Category.objects.filter(
            budget_file=budget_file, kind=Category.KIND_EXPENSE
        ).first()
        return budget_file, account, category

    def test_task_materializes_due_schedules_across_every_tenant(self):
        alice_file, alice_account, alice_category = self._tenant("scheduler-alice@example.com")
        bob_file, bob_account, bob_category = self._tenant("scheduler-bob@example.com")

        alice_schedule = _schedule(
            alice_file,
            name="Alice rent",
            next_run_date=date(2026, 3, 1),
            account=alice_account,
            category=alice_category,
        )
        bob_schedule = _schedule(
            bob_file,
            name="Bob rent",
            next_run_date=date(2026, 3, 1),
            account=bob_account,
            category=bob_category,
        )

        materialize_due_scheduled_transactions_task()

        alice_schedule.refresh_from_db()
        bob_schedule.refresh_from_db()
        self.assertIsNotNone(alice_schedule.last_run_at)
        self.assertIsNotNone(bob_schedule.last_run_at)

    def test_a_broken_schedule_in_one_tenant_does_not_block_another(self):
        alice_file, alice_account, _alice_category = self._tenant("scheduler-broken-alice@example.com")
        bob_file, bob_account, bob_category = self._tenant("scheduler-broken-bob@example.com")

        broken = _unbalanced_schedule(
            alice_file, name="Broken", next_run_date=date(2026, 3, 1), account=alice_account
        )
        good = _schedule(
            bob_file,
            name="Bob rent",
            next_run_date=date(2026, 3, 1),
            account=bob_account,
            category=bob_category,
        )

        # Must not raise - one tenant's broken template can't block another's.
        materialize_due_scheduled_transactions_task()

        good.refresh_from_db()
        broken.refresh_from_db()
        self.assertIsNotNone(good.last_run_at)
        self.assertIsNone(broken.last_run_at)
