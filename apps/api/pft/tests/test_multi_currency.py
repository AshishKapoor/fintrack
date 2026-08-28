from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from pft.models import Account
from pft.tests.helpers import personal_budget_file

User = get_user_model()


class AccountCurrencyDefaultingTests(APITestCase):
    """Account.currency_code's docstring: every account gets an explicit
    currency, defaulting to its budget file's, rather than staying blank -
    see AccountSerializer.validate() and migration 0011's backfill."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="currency@example.com", username="currency@example.com", password="StrongPass123!"
        )
        self.client.force_authenticate(user=self.user)
        self.budget_file = personal_budget_file(self.user)

    def test_signup_seeded_cash_account_has_explicit_currency(self):
        cash = Account.objects.get(budget_file=self.budget_file, name="Cash")
        self.assertEqual(cash.currency_code, "USD")

    def test_creating_an_account_without_currency_defaults_to_budget_file(self):
        response = self.client.post(
            "/api/v1/finance/accounts/",
            {"budget_file": self.budget_file.id, "name": "Brokerage", "type": "asset"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["currency_code"], "USD")

    def test_creating_an_account_with_explicit_currency_keeps_it(self):
        response = self.client.post(
            "/api/v1/finance/accounts/",
            {
                "budget_file": self.budget_file.id,
                "name": "UK Current Account",
                "type": "checking",
                "currency_code": "GBP",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["currency_code"], "GBP")

    def test_effective_currency_code_falls_back_when_blank(self):
        account = Account.objects.create(
            budget_file=self.budget_file, name="Legacy Row", type=Account.TYPE_CASH
        )
        self.assertEqual(account.currency_code, "")
        self.assertEqual(account.effective_currency_code, self.budget_file.currency_code)

    def test_changing_budget_file_currency_does_not_retroactively_change_accounts(self):
        # currency_code is resolved once at account-creation time (see
        # AccountSerializer.validate) - an account keeps the currency it was
        # actually opened in even if the budget file's own display currency
        # changes later.
        gbp_account = Account.objects.create(
            budget_file=self.budget_file,
            name="Old GBP Account",
            type=Account.TYPE_CHECKING,
            currency_code="GBP",
        )
        self.budget_file.currency_code = "EUR"
        self.budget_file.save(update_fields=["currency_code"])
        gbp_account.refresh_from_db()
        self.assertEqual(gbp_account.currency_code, "GBP")
