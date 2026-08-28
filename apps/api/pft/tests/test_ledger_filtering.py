"""Server-side filtering, ordering and pagination for the ledger.

The transactions page used to filter and sort in the browser over whatever page
happened to be loaded, so the result count disagreed with the rows on screen and
"highest amount" only meant highest on this page.
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
)
from pft.tests.helpers import personal_budget_file

User = get_user_model()

URL = "/api/v1/finance/transactions/"


class LedgerFilteringTests(APITestCase):
    def setUp(self):
        email = "ledger@example.com"
        self.user = User.objects.create_user(
            email=email, username=email, password="StrongPass123!"
        )
        self.client.force_authenticate(user=self.user)

        self.budget_file = personal_budget_file(self.user)
        self.account = Account.objects.get(budget_file=self.budget_file, name="Cash")
        self.expense_category = Category.objects.filter(
            budget_file=self.budget_file, kind=Category.KIND_EXPENSE
        ).first()
        self.income_category = Category.objects.filter(
            budget_file=self.budget_file, kind=Category.KIND_INCOME
        ).first()

        self.small_expense = self.make_transaction(
            "Coffee", Decimal("5.00"), date(2026, 1, 5), income=False
        )
        self.large_expense = self.make_transaction(
            "Rent", Decimal("1200.00"), date(2026, 2, 1), income=False
        )
        self.salary = self.make_transaction(
            "Salary", Decimal("4200.00"), date(2026, 3, 1), income=True
        )

    def make_transaction(self, memo, amount, when, *, income):
        ledger_tx = LedgerTransaction.objects.create(
            budget_file=self.budget_file, transaction_date=when, memo=memo
        )
        account_amount = amount if income else -amount
        LedgerPosting.objects.create(
            transaction=ledger_tx,
            account=self.account,
            amount=account_amount,
            sort_order=0,
        )
        LedgerPosting.objects.create(
            transaction=ledger_tx,
            category=self.income_category if income else self.expense_category,
            amount=-account_amount,
            sort_order=1,
        )
        return ledger_tx

    def ids(self, response):
        return [row["id"] for row in response.data["results"]]

    def test_list_is_paginated(self):
        response = self.client.get(URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 3)
        self.assertIn("results", response.data)

    def test_page_size_is_capped(self):
        response = self.client.get(f"{URL}?page_size=100000")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertLessEqual(len(response.data["results"]), 500)

    def test_filter_by_type_expense(self):
        response = self.client.get(f"{URL}?type=expense")
        self.assertEqual(response.data["count"], 2)
        self.assertNotIn(self.salary.id, self.ids(response))

    def test_filter_by_type_income(self):
        response = self.client.get(f"{URL}?type=income")
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(self.ids(response), [self.salary.id])

    def test_search_matches_the_memo(self):
        response = self.client.get(f"{URL}?search=Rent")
        self.assertEqual(self.ids(response), [self.large_expense.id])

    def test_filter_by_date_range(self):
        response = self.client.get(f"{URL}?start_date=2026-02-01&end_date=2026-02-28")
        self.assertEqual(self.ids(response), [self.large_expense.id])

    def test_order_by_amount_uses_the_displayed_magnitude(self):
        """Income postings are negative on the category side; ordering must not
        be fooled by the sign, because the UI shows absolute amounts."""
        ascending = self.client.get(f"{URL}?ordering=amount")
        self.assertEqual(
            self.ids(ascending),
            [self.small_expense.id, self.large_expense.id, self.salary.id],
        )

        descending = self.client.get(f"{URL}?ordering=-amount")
        self.assertEqual(
            self.ids(descending),
            [self.salary.id, self.large_expense.id, self.small_expense.id],
        )

    def test_order_by_date(self):
        response = self.client.get(f"{URL}?ordering=transaction_date")
        self.assertEqual(
            self.ids(response),
            [self.small_expense.id, self.large_expense.id, self.salary.id],
        )

    def test_filters_combine(self):
        response = self.client.get(f"{URL}?type=expense&ordering=-amount")
        self.assertEqual(
            self.ids(response), [self.large_expense.id, self.small_expense.id]
        )

    def test_malformed_date_is_a_400(self):
        response = self.client.get(f"{URL}?start_date=not-a-date")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
