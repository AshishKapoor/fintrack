"""The fast smoke suite - `make test-api`.

Deliberately shallow and broad: auth, signup bootstrap, and one pass through
the ledger's create/read/update/delete path. Depth lives in the per-feature
modules next door. This exercises /api/v1/finance/* only; the flat
/api/v1/{transactions,categories,budgets} resources it used to cover were
retired in migration 0017 (see test_legacy_api_retirement.py).
"""

from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from pft.models import Account, Category, LedgerPosting, LedgerTransaction
from pft.tests.helpers import personal_budget_file

User = get_user_model()

DEFAULT_INCOME_CATEGORIES = {"Salary", "Freelance", "Business", "Investments", "Bonus"}
DEFAULT_EXPENSE_CATEGORIES = {
    "Housing",
    "Groceries",
    "Transportation",
    "Utilities",
    "Entertainment",
}


class AuthSmokeTests(APITestCase):
    def test_register_user(self):
        payload = {
            "email": "new-user@example.com",
            "password": "StrongPass123!",
            "confirm_password": "StrongPass123!",
        }
        response = self.client.post("/api/v1/register/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email="new-user@example.com").exists())

        user = User.objects.get(email="new-user@example.com")

        # Signup bootstraps a personal workspace with one seeded budget file:
        # a Cash account, two groups, and the standard ten categories.
        budget_file = personal_budget_file(user)
        self.assertIsNotNone(budget_file.organization)
        self.assertEqual(Account.objects.filter(budget_file=budget_file).count(), 1)

        categories = Category.objects.filter(budget_file=budget_file)
        self.assertEqual(categories.count(), 10)
        self.assertSetEqual(
            set(
                categories.filter(kind=Category.KIND_INCOME).values_list(
                    "name", flat=True
                )
            ),
            DEFAULT_INCOME_CATEGORIES,
        )
        self.assertSetEqual(
            set(
                categories.filter(kind=Category.KIND_EXPENSE).values_list(
                    "name", flat=True
                )
            ),
            DEFAULT_EXPENSE_CATEGORIES,
        )

    def test_registering_a_taken_email_says_the_account_exists(self):
        """The 400 has to name the conflict, not send the user to support.

        The web signup form renders whatever this endpoint puts in the body, so
        a vague message here is what a self-hoster sees when they retry a signup
        that already went through (or bootstrapped an admin with
        FINTRACK_ADMIN_EMAIL): a dead end pointing at the wrong remedy.
        """
        User.objects.create_user(
            email="taken@example.com",
            username="taken@example.com",
            password="StrongPass123!",
        )

        response = self.client.post(
            "/api/v1/register/",
            {
                "email": "taken@example.com",
                "password": "StrongPass123!",
                "confirm_password": "StrongPass123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        message = response.data["email"][0]
        self.assertIn("already exists", message)
        self.assertNotIn("contact support", message)
        self.assertEqual(User.objects.filter(email="taken@example.com").count(), 1)

    def test_token_obtain_and_refresh(self):
        User.objects.create_user(
            email="auth-user@example.com",
            username="auth-user@example.com",
            password="StrongPass123!",
        )

        token_response = self.client.post(
            "/api/token/",
            {"email": "auth-user@example.com", "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(token_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", token_response.data)
        self.assertIn("refresh", token_response.data)

        refresh_response = self.client.post(
            "/api/token/refresh/",
            {"refresh": token_response.data["refresh"]},
            format="json",
        )
        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", refresh_response.data)

    def test_me_requires_auth(self):
        response = self.client.get("/api/v1/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class CoreFinanceSmokeTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="smoke-user@example.com",
            username="smoke-user@example.com",
            password="StrongPass123!",
        )
        self.client.force_authenticate(user=self.user)

        self.budget_file = personal_budget_file(self.user)
        self.account = Account.objects.get(budget_file=self.budget_file, name="Cash")
        self.expense_category = Category.objects.filter(
            budget_file=self.budget_file, kind=Category.KIND_EXPENSE
        ).first()

    def _postings(self, amount: str, category_id: int | None = None):
        """The two legs of a simple expense: money out of the account, into a
        category. The signs mirror apps/web/app/lib/ledger.ts.
        """
        magnitude = Decimal(amount)
        return [
            {
                "account": self.account.id,
                "category": None,
                "amount": f"{-magnitude:.2f}",
                "sort_order": 0,
            },
            {
                "account": None,
                "category": category_id or self.expense_category.id,
                "amount": f"{magnitude:.2f}",
                "sort_order": 1,
            },
        ]

    def _create_transaction(self, memo: str, amount: str, transaction_date: str):
        return self.client.post(
            "/api/v1/finance/transactions/",
            {
                "budget_file": self.budget_file.id,
                "transaction_date": transaction_date,
                "memo": memo,
                "postings": self._postings(amount),
            },
            format="json",
        )

    def test_category_transaction_and_budget_flows(self):
        category_response = self.client.post(
            "/api/v1/finance/categories/",
            {
                "budget_file": self.budget_file.id,
                "name": "Travel",
                "kind": Category.KIND_EXPENSE,
            },
            format="json",
        )
        self.assertEqual(category_response.status_code, status.HTTP_201_CREATED)

        categories_response = self.client.get(
            f"/api/v1/finance/categories/?budget_file={self.budget_file.id}"
        )
        self.assertEqual(categories_response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(categories_response.data["count"], 11)

        transaction_response = self._create_transaction(
            "Flight Ticket", "640.00", "2026-03-01"
        )
        self.assertEqual(transaction_response.status_code, status.HTTP_201_CREATED)
        transaction_id = transaction_response.data["id"]
        self.assertEqual(
            LedgerPosting.objects.filter(transaction_id=transaction_id).count(), 2
        )

        update_response = self.client.put(
            f"/api/v1/finance/transactions/{transaction_id}/",
            {
                "budget_file": self.budget_file.id,
                "transaction_date": "2026-03-02",
                "memo": "Flight Ticket (Updated)",
                "postings": self._postings("700.00"),
            },
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data["memo"], "Flight Ticket (Updated)")

        filtered = self.client.get(
            f"/api/v1/finance/transactions/?budget_file={self.budget_file.id}"
            "&start_date=2026-03-01&end_date=2026-03-31"
        )
        self.assertEqual(filtered.status_code, status.HTTP_200_OK)
        self.assertEqual(filtered.data["count"], 1)

        budget_month_response = self.client.post(
            "/api/v1/finance/budget-months/",
            {
                "budget_file": self.budget_file.id,
                "year": 2026,
                "month": 3,
                "mode": "envelope",
            },
            format="json",
        )
        self.assertEqual(budget_month_response.status_code, status.HTTP_201_CREATED)

        assignment_response = self.client.post(
            "/api/v1/finance/envelope-assignments/",
            {
                "budget_month": budget_month_response.data["id"],
                "category": self.expense_category.id,
                "assigned_amount": "1000.00",
            },
            format="json",
        )
        self.assertEqual(assignment_response.status_code, status.HTTP_201_CREATED)

        delete_response = self.client.delete(
            f"/api/v1/finance/transactions/{transaction_id}/"
        )
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(LedgerTransaction.objects.filter(pk=transaction_id).exists())

    def test_transactions_filter_search_ordering_and_pagination(self):
        self._create_transaction("Coffee", "100.00", "2026-03-10")
        self._create_transaction("Groceries", "900.00", "2026-03-11")
        self._create_transaction("Travel", "300.00", "2026-02-11")

        base = f"/api/v1/finance/transactions/?budget_file={self.budget_file.id}"

        filtered = self.client.get(f"{base}&start_date=2026-03-01&end_date=2026-03-31")
        self.assertEqual(filtered.status_code, status.HTTP_200_OK)
        self.assertEqual(filtered.data["count"], 2)

        search = self.client.get(f"{base}&search=Coffee")
        self.assertEqual(search.status_code, status.HTTP_200_OK)
        self.assertEqual(search.data["count"], 1)
        self.assertEqual(search.data["results"][0]["memo"], "Coffee")

        ordered = self.client.get(f"{base}&ordering=transaction_date")
        self.assertEqual(ordered.status_code, status.HTTP_200_OK)
        dates = [row["transaction_date"] for row in ordered.data["results"]]
        self.assertEqual(dates, sorted(dates))

        # Enough rows to cross a page boundary (LedgerTransactionPagination
        # serves 50 per page). Built directly rather than through the API:
        # this asserts pagination, not the create path, and 55 round trips
        # would dominate the smoke suite's runtime.
        for index in range(55):
            transaction = LedgerTransaction.objects.create(
                budget_file=self.budget_file,
                transaction_date="2026-03-12",
                memo=f"Bulk Item {index}",
            )
            LedgerPosting.objects.bulk_create(
                [
                    LedgerPosting(
                        transaction=transaction,
                        account=self.account,
                        amount=Decimal("-1.00"),
                        sort_order=0,
                    ),
                    LedgerPosting(
                        transaction=transaction,
                        category=self.expense_category,
                        amount=Decimal("1.00"),
                        sort_order=1,
                    ),
                ]
            )

        page_1 = self.client.get(f"{base}&page=1")
        page_2 = self.client.get(f"{base}&page=2")

        self.assertEqual(page_1.status_code, status.HTTP_200_OK)
        self.assertEqual(page_2.status_code, status.HTTP_200_OK)
        self.assertEqual(page_1.data["count"], 58)
        self.assertIsNotNone(page_1.data["next"])
        self.assertEqual(len(page_1.data["results"]), 50)
        self.assertEqual(len(page_2.data["results"]), 8)
        self.assertIsNotNone(page_2.data["previous"])

    def test_unbalanced_postings_are_rejected(self):
        response = self.client.post(
            "/api/v1/finance/transactions/",
            {
                "budget_file": self.budget_file.id,
                "transaction_date": "2026-03-10",
                "memo": "Broken",
                "postings": [
                    {"account": self.account.id, "amount": "-10.00", "sort_order": 0},
                    {
                        "category": self.expense_category.id,
                        "amount": "5.00",
                        "sort_order": 1,
                    },
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_profile_and_password_update_flows(self):
        profile_payload = {
            "first_name": "Smoke",
            "last_name": "Tester",
            "department": "engineering",
        }
        profile_response = self.client.put(
            "/api/v1/profile/update/", profile_payload, format="json"
        )
        self.assertEqual(profile_response.status_code, status.HTTP_200_OK)
        self.assertEqual(profile_response.data["first_name"], "Smoke")

        password_payload = {
            "current_password": "StrongPass123!",
            "new_password": "StrongerPass123!",
            "confirm_password": "StrongerPass123!",
        }
        password_response = self.client.post(
            "/api/v1/profile/change-password/",
            password_payload,
            format="json",
        )
        self.assertEqual(password_response.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("StrongerPass123!"))
