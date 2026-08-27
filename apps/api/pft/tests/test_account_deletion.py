"""Account deletion.

The settings page had a permanently disabled "Delete Account" button and there
was no endpoint behind it, so there was no way to get your data out of a
FinTrack instance short of dropping the database.
"""

from datetime import date

from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APITestCase

from pft.models import BudgetFile, LedgerTransaction
from pft.tests.helpers import personal_budget_file

User = get_user_model()

PASSWORD = "StrongPass123!"
URL = "/api/v1/profile/delete-account/"


class DeleteAccountTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)

        self.email = "leaving@example.com"
        self.user = User.objects.create_user(
            email=self.email, username=self.email, password=PASSWORD
        )
        self.other = User.objects.create_user(
            email="staying@example.com",
            username="staying@example.com",
            password=PASSWORD,
        )

        self.budget_file = personal_budget_file(self.user)
        self.ledger_transaction = LedgerTransaction.objects.create(
            budget_file=self.budget_file,
            transaction_date=date(2026, 3, 10),
            memo="Coffee",
        )

        self.client.force_authenticate(user=self.user)

    def test_requires_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(URL, {"password": PASSWORD}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_requires_a_password(self):
        response = self.client.post(URL, {"confirmation": "DELETE"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(User.objects.filter(pk=self.user.pk).exists())

    def test_rejects_a_wrong_password(self):
        response = self.client.post(
            URL,
            {"password": "not-my-password", "confirmation": "DELETE"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(User.objects.filter(pk=self.user.pk).exists())

    def test_requires_the_confirmation_phrase(self):
        response = self.client.post(
            URL, {"password": PASSWORD, "confirmation": "yes"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(User.objects.filter(pk=self.user.pk).exists())

    def test_deletes_the_account_and_all_of_its_data(self):
        response = self.client.post(
            URL, {"password": PASSWORD, "confirmation": "DELETE"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        self.assertFalse(User.objects.filter(pk=self.user.pk).exists())
        self.assertFalse(BudgetFile.objects.filter(pk=self.budget_file.pk).exists())
        self.assertFalse(
            LedgerTransaction.objects.filter(pk=self.ledger_transaction.pk).exists()
        )

    def test_leaves_other_accounts_untouched(self):
        other_budget_file = personal_budget_file(self.other)

        self.client.post(
            URL, {"password": PASSWORD, "confirmation": "DELETE"}, format="json"
        )

        self.assertTrue(User.objects.filter(pk=self.other.pk).exists())
        self.assertTrue(BudgetFile.objects.filter(pk=other_budget_file.pk).exists())

    def test_tokens_stop_working_after_deletion(self):
        tokens = self.client.post(
            "/api/token/", {"email": self.email, "password": PASSWORD}, format="json"
        )
        refresh = tokens.data["refresh"]

        self.client.post(
            URL, {"password": PASSWORD, "confirmation": "DELETE"}, format="json"
        )

        self.client.force_authenticate(user=None)
        response = self.client.post(
            "/api/token/refresh/", {"refresh": refresh}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
