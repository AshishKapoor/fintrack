"""Payee -> suggested category, the learning half of quick-add's

amount -> payee -> (suggested) category -> done flow (ROADMAP.md Phase 1).
See PayeeViewSet.suggested_category in finance_views.py.
"""

from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from pft.models import (
    Account,
    Category,
    LedgerPosting,
    LedgerTransaction,
    Payee,
)
from pft.tests.helpers import personal_budget_file

User = get_user_model()


class SuggestedCategoryTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="payee-suggest@example.com",
            username="payee-suggest@example.com",
            password="StrongPass123!",
        )
        self.client.force_authenticate(user=self.user)

        self.budget_file = personal_budget_file(self.user)
        self.account = Account.objects.get(budget_file=self.budget_file, name="Cash")
        categories = list(
            Category.objects.filter(
                budget_file=self.budget_file, kind=Category.KIND_EXPENSE
            )[:2]
        )
        self.groceries, self.dining = categories
        self.payee = Payee.objects.create(
            budget_file=self.budget_file, name="Corner Store"
        )

    def _spend(self, category, amount="10.00", on=date(2026, 3, 1)):
        tx = LedgerTransaction.objects.create(
            budget_file=self.budget_file, transaction_date=on, payee=self.payee
        )
        LedgerPosting.objects.create(
            transaction=tx, account=self.account, amount=f"-{amount}"
        )
        LedgerPosting.objects.create(
            transaction=tx, category=category, amount=Decimal(amount)
        )
        return tx

    def test_no_history_returns_no_suggestion(self):
        response = self.client.get(
            f"/api/v1/finance/payees/{self.payee.id}/suggested-category/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["category"])
        self.assertEqual(response.data["category_name"], "")

    def test_suggests_the_most_frequently_used_category(self):
        self._spend(self.groceries, on=date(2026, 3, 1))
        self._spend(self.groceries, on=date(2026, 3, 8))
        self._spend(self.dining, on=date(2026, 3, 15))

        response = self.client.get(
            f"/api/v1/finance/payees/{self.payee.id}/suggested-category/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["category"], self.groceries.id)
        self.assertEqual(response.data["category_name"], self.groceries.name)

    def test_ties_are_broken_by_most_recent(self):
        self._spend(self.groceries, on=date(2026, 3, 1))
        self._spend(self.dining, on=date(2026, 3, 20))

        response = self.client.get(
            f"/api/v1/finance/payees/{self.payee.id}/suggested-category/"
        )

        self.assertEqual(response.data["category"], self.dining.id)

    def test_only_considers_this_payees_history(self):
        other_payee = Payee.objects.create(
            budget_file=self.budget_file, name="Other Shop"
        )
        other_tx = LedgerTransaction.objects.create(
            budget_file=self.budget_file,
            transaction_date=date(2026, 3, 1),
            payee=other_payee,
        )
        LedgerPosting.objects.create(
            transaction=other_tx, account=self.account, amount="-5.00"
        )
        LedgerPosting.objects.create(
            transaction=other_tx, category=self.dining, amount=Decimal("5.00")
        )

        response = self.client.get(
            f"/api/v1/finance/payees/{self.payee.id}/suggested-category/"
        )

        self.assertIsNone(response.data["category"])
