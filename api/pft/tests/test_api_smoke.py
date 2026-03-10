from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from pft.models import Category, Transaction


User = get_user_model()


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
        user_categories = Category.objects.filter(user=user)
        self.assertEqual(user_categories.count(), 10)
        self.assertEqual(user_categories.filter(type="income").count(), 5)
        self.assertEqual(user_categories.filter(type="expense").count(), 5)

        expected_income = {"Salary", "Freelance", "Business", "Investments", "Bonus"}
        expected_expense = {
            "Housing",
            "Groceries",
            "Transportation",
            "Utilities",
            "Entertainment",
        }
        self.assertSetEqual(
            set(user_categories.filter(type="income").values_list("name", flat=True)),
            expected_income,
        )
        self.assertSetEqual(
            set(user_categories.filter(type="expense").values_list("name", flat=True)),
            expected_expense,
        )

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
        self.expense_category = Category.objects.filter(user=self.user, type="expense").first()

    def _create_transaction(self, title: str, amount: str, transaction_date: str):
        payload = {
            "user": self.user.id,
            "title": title,
            "amount": amount,
            "type": "expense",
            "category": self.expense_category.id,
            "transaction_date": transaction_date,
        }
        return self.client.post("/api/v1/transactions/", payload, format="json")

    def test_category_transaction_and_budget_flows(self):
        category_payload = {"name": "Travel", "type": "expense"}
        category_response = self.client.post("/api/v1/categories/", category_payload, format="json")
        self.assertEqual(category_response.status_code, status.HTTP_201_CREATED)

        categories_response = self.client.get("/api/v1/categories/")
        self.assertEqual(categories_response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(categories_response.data["count"], 3)

        transaction_response = self._create_transaction("Flight Ticket", "640.00", "2026-03-01")
        self.assertEqual(transaction_response.status_code, status.HTTP_201_CREATED)

        transaction_id = transaction_response.data["id"]
        update_payload = {
            "user": self.user.id,
            "title": "Flight Ticket (Updated)",
            "amount": "700.00",
            "type": "expense",
            "category": self.expense_category.id,
            "transaction_date": "2026-03-02",
        }
        update_response = self.client.put(
            f"/api/v1/transactions/{transaction_id}/",
            update_payload,
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data["title"], "Flight Ticket (Updated)")

        filtered_transactions_response = self.client.get(
            "/api/v1/transactions/?start_date=2026-03-01&end_date=2026-03-31"
        )
        self.assertEqual(filtered_transactions_response.status_code, status.HTTP_200_OK)
        self.assertEqual(filtered_transactions_response.data["count"], 1)

        budget_payload = {
            "category": self.expense_category.id,
            "month": 3,
            "year": 2026,
            "amount_limit": "1000.00",
        }
        budget_create_response = self.client.post("/api/v1/budgets/", budget_payload, format="json")
        self.assertEqual(budget_create_response.status_code, status.HTTP_201_CREATED)

        budget_update_payload = {
            "category": self.expense_category.id,
            "month": 3,
            "year": 2026,
            "amount_limit": "1500.00",
        }
        budget_update_response = self.client.post(
            "/api/v1/budgets/",
            budget_update_payload,
            format="json",
        )
        self.assertEqual(budget_update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(budget_update_response.data["amount_limit"], "1500.00")

        delete_response = self.client.delete(f"/api/v1/transactions/{transaction_id}/")
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

    def test_transactions_filter_search_ordering_and_pagination(self):
        self._create_transaction("Coffee", "100.00", "2026-03-10")
        self._create_transaction("Groceries", "900.00", "2026-03-11")
        self._create_transaction("Travel", "300.00", "2026-02-11")

        filtered_response = self.client.get(
            "/api/v1/transactions/?start_date=2026-03-01&end_date=2026-03-31"
        )
        self.assertEqual(filtered_response.status_code, status.HTTP_200_OK)
        self.assertEqual(filtered_response.data["count"], 2)

        search_response = self.client.get("/api/v1/transactions/?search=Coffee")
        self.assertEqual(search_response.status_code, status.HTTP_200_OK)
        self.assertEqual(search_response.data["count"], 1)
        self.assertEqual(search_response.data["results"][0]["title"], "Coffee")

        ordered_response = self.client.get("/api/v1/transactions/?ordering=amount")
        self.assertEqual(ordered_response.status_code, status.HTTP_200_OK)
        amounts = [Decimal(item["amount"]) for item in ordered_response.data["results"]]
        self.assertEqual(amounts, sorted(amounts))

        # Create enough data for multi-page verification with page_size=100.
        bulk_transactions = [
            Transaction(
                user=self.user,
                title=f"Bulk Item {index}",
                amount=Decimal("1.00"),
                type="expense",
                category=self.expense_category,
                transaction_date=date(2026, 3, 12),
            )
            for index in range(105)
        ]
        Transaction.objects.bulk_create(bulk_transactions)

        page_1 = self.client.get("/api/v1/transactions/?page=1")
        page_2 = self.client.get("/api/v1/transactions/?page=2")

        self.assertEqual(page_1.status_code, status.HTTP_200_OK)
        self.assertEqual(page_2.status_code, status.HTTP_200_OK)
        self.assertEqual(page_1.data["count"], 108)
        self.assertIsNotNone(page_1.data["next"])
        self.assertEqual(len(page_1.data["results"]), 100)
        self.assertEqual(len(page_2.data["results"]), 8)
        self.assertIsNotNone(page_2.data["previous"])

    def test_transaction_create_allows_null_category(self):
        payload = {
            "user": self.user.id,
            "title": "Uncategorized expense",
            "amount": "42.00",
            "type": "expense",
            "category": None,
            "transaction_date": "2026-03-10",
        }

        response = self.client.post("/api/v1/transactions/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data["category"])

    def test_profile_and_password_update_flows(self):
        profile_payload = {
            "first_name": "Smoke",
            "last_name": "Tester",
            "department": "engineering",
        }
        profile_response = self.client.put("/api/v1/profile/update/", profile_payload, format="json")
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
