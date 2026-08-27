"""Retiring the flat /api/v1/{transactions,categories,budgets} API.

ROADMAP.md Phase 4. Two things have to be true: the endpoints are gone, and
nobody who was using them lost data on the way - migration 0017 carries the
flat rows into the ledger before dropping the tables, and that carry-over is
the part worth testing, because it runs exactly once on somebody's live
database and there is no second chance.
"""

from datetime import UTC, date
from datetime import datetime as dt
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TestCase, TransactionTestCase
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()

PASSWORD = "StrongPass123!"

SHOP_CREATED_AT = dt(2026, 3, 1, 9, 0, tzinfo=UTC)


class LegacyEndpointsAreGoneTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="scripter@example.com",
            username="scripter@example.com",
            password=PASSWORD,
        )
        self.client.force_authenticate(user=self.user)

    def test_flat_resources_404(self):
        for path in (
            "/api/v1/transactions/",
            "/api/v1/categories/",
            "/api/v1/budgets/",
        ):
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_the_ledger_resources_that_replaced_them_still_answer(self):
        for path in (
            "/api/v1/finance/transactions/",
            "/api/v1/finance/categories/",
            "/api/v1/finance/budget-months/",
        ):
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, status.HTTP_200_OK)


class SignupNoLongerSeedsLegacyRowsTests(TestCase):
    def test_a_new_user_gets_a_workspace_and_a_seeded_budget_file(self):
        user = User.objects.create_user(
            email="fresh@example.com", username="fresh@example.com", password=PASSWORD
        )

        budget_file = user.budget_files.get(is_default=True)
        self.assertIsNotNone(budget_file.organization)
        self.assertEqual(budget_file.accounts.count(), 1)
        self.assertEqual(budget_file.category_groups.count(), 2)
        self.assertEqual(budget_file.categories_v2.count(), 10)

    def test_the_legacy_models_are_not_importable(self):
        import pft.models as models

        for name in ("Category", "Transaction", "Budget"):
            with self.subTest(model=name):
                self.assertFalse(hasattr(models, name))


class LegacyCarryOverMigrationTests(TransactionTestCase):
    """Run migration 0017's data step against real rows in the old schema.

    TransactionTestCase rather than TestCase: migrating backwards and forwards
    issues DDL, which cannot happen inside the outer transaction TestCase keeps
    open. `available_apps` is deliberately unset so the rollback at the end of
    the class restores every app's tables.
    """

    BEFORE = "0016_aicategorizationsettings"
    AFTER = "0017_retire_legacy_flat_api"

    def _migrate(self, target):
        executor = MigrationExecutor(connection)
        executor.loader.build_graph()
        executor.migrate([("pft", target)])
        executor.loader.build_graph()
        return executor.loader.project_state([("pft", target)]).apps

    def tearDown(self):
        # Leave the database on the latest migration for whatever runs next,
        # including this class's own second test method.
        self._migrate(self.AFTER)

    def _seed_old_world(self, apps):
        """Build, in the 0016 schema, the state a real upgrade would find."""
        User_ = apps.get_model("pft", "User")
        Organization = apps.get_model("pft", "Organization")
        Membership = apps.get_model("pft", "Membership")
        BudgetFile = apps.get_model("pft", "BudgetFile")
        Account = apps.get_model("pft", "Account")
        CategoryGroupV2 = apps.get_model("pft", "CategoryGroupV2")
        CategoryV2 = apps.get_model("pft", "CategoryV2")
        Category = apps.get_model("pft", "Category")
        Transaction = apps.get_model("pft", "Transaction")
        Budget = apps.get_model("pft", "Budget")

        user = User_.objects.create(
            email="legacy@example.com", username="legacy@example.com", password="x"
        )
        organization = Organization.objects.create(name="legacy space", personal=True)
        Membership.objects.create(organization=organization, user=user, role="owner")
        budget_file = BudgetFile.objects.create(
            user=user, organization=organization, name="Primary Budget", is_default=True
        )
        Account.objects.create(
            budget_file=budget_file, name="Cash", type="checking", currency_code="USD"
        )
        expenses = CategoryGroupV2.objects.create(
            budget_file=budget_file, name="Expenses", sort_order=1
        )
        # Groceries already exists in the ledger; the legacy row of the same
        # name must map onto it rather than creating a duplicate.
        CategoryV2.objects.create(
            budget_file=budget_file, group=expenses, name="Groceries", kind="expense"
        )

        groceries = Category.objects.create(name="Groceries", type="expense", user=user)
        salary = Category.objects.create(name="Salary", type="income", user=user)

        shop = Transaction.objects.create(
            user=user,
            title="Weekly shop",
            amount=Decimal("54.32"),
            type="expense",
            category=groceries,
            transaction_date=date(2026, 3, 1),
        )
        # auto_now_add ignores anything passed to create(), so backdate the row
        # the way only a queryset update can. This is the whole point of the
        # timestamp assertion below: a row entered in March must not come out
        # of the migration claiming it was created on upgrade day.
        Transaction.objects.filter(pk=shop.pk).update(
            created_at=SHOP_CREATED_AT, updated_at=SHOP_CREATED_AT
        )
        Transaction.objects.create(
            user=user,
            title="Paycheck",
            amount=Decimal("2000.00"),
            type="income",
            category=salary,
            transaction_date=date(2026, 3, 2),
        )
        # No category at all: the flat API allowed it, the ledger does not.
        Transaction.objects.create(
            user=user,
            title="Mystery",
            amount=Decimal("9.99"),
            type="expense",
            category=None,
            transaction_date=date(2026, 3, 3),
        )
        Budget.objects.create(
            user=user,
            category=groceries,
            month=3,
            year=2026,
            amount_limit=Decimal("400.00"),
        )
        return user.id, budget_file.id

    def test_flat_rows_become_balanced_ledger_transactions(self):
        old = self._migrate(self.BEFORE)
        _, budget_file_id = self._seed_old_world(old)

        new = self._migrate(self.AFTER)
        LedgerTransaction = new.get_model("pft", "LedgerTransaction")
        CategoryV2 = new.get_model("pft", "CategoryV2")

        carried = LedgerTransaction.objects.filter(
            budget_file_id=budget_file_id, match_key__startswith="legacy:"
        ).order_by("transaction_date")
        self.assertEqual(carried.count(), 3)

        shop, paycheck, mystery = carried

        # Expense: the account is credited out, the category takes the charge.
        legs = {
            "account" if leg.account_id else "category": leg.amount
            for leg in shop.postings.all()
        }
        self.assertEqual(legs["account"], Decimal("-54.32"))
        self.assertEqual(legs["category"], Decimal("54.32"))
        self.assertEqual(shop.memo, "Weekly shop")

        # Income is the mirror image.
        legs = {
            "account" if leg.account_id else "category": leg.amount
            for leg in paycheck.postings.all()
        }
        self.assertEqual(legs["account"], Decimal("2000.00"))
        self.assertEqual(legs["category"], Decimal("-2000.00"))

        # Every carried transaction balances - the DB trigger would have
        # rejected the migration otherwise, but assert it rather than trusting
        # a constraint to have been checked.
        for transaction in carried:
            self.assertEqual(
                sum(leg.amount for leg in transaction.postings.all()), Decimal("0.00")
            )

        # An uncategorised legacy row gets a real category, because a posting
        # must target exactly one of account/category.
        mystery_category = mystery.postings.exclude(category_id=None).get()
        self.assertEqual(mystery_category.category.name, "Uncategorized")

        # The pre-existing ledger "Groceries" absorbed the legacy one instead
        # of being duplicated.
        self.assertEqual(
            CategoryV2.objects.filter(
                budget_file_id=budget_file_id, name="Groceries"
            ).count(),
            1,
        )

        # Original creation time survives auto_now_add.
        self.assertEqual(shop.created_at, SHOP_CREATED_AT)

    def test_legacy_budgets_become_envelope_assignments(self):
        old = self._migrate(self.BEFORE)
        _, budget_file_id = self._seed_old_world(old)

        new = self._migrate(self.AFTER)
        BudgetMonth = new.get_model("pft", "BudgetMonth")

        month = BudgetMonth.objects.get(
            budget_file_id=budget_file_id, year=2026, month=3
        )
        assignment = month.assignments.get()
        self.assertEqual(assignment.category.name, "Groceries")
        self.assertEqual(assignment.assigned_amount, Decimal("400.00"))
