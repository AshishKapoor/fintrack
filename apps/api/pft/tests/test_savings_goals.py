from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from pft.models import Account, BudgetFile, SavingsGoal
from pft.tests.helpers import personal_budget_file

User = get_user_model()


class SavingsGoalTests(APITestCase):
    """SavingsGoal - ROADMAP.md Phase 3's "first-class savings goals" item.
    Account-anchored: progress is a direct read of Account.current_balance,
    not a new computation, so these tests exercise the serializer's derived
    fields (current_amount/progress_percent) against real posting history
    rather than the arithmetic in isolation.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            email="goals-user@example.com",
            username="goals-user@example.com",
            password="StrongPass123!",
        )
        self.client.force_authenticate(user=self.user)
        self.budget_file = personal_budget_file(self.user)
        self.cash = Account.objects.get(budget_file=self.budget_file, name="Cash")
        self.cash.opening_balance = Decimal("400.00")
        self.cash.save(update_fields=["opening_balance"])

    def test_create_and_read_progress(self):
        response = self.client.post(
            "/api/v1/finance/savings-goals/",
            {
                "budget_file": self.budget_file.id,
                "account": self.cash.id,
                "name": "Emergency Fund",
                "target_amount": "1000.00",
                "target_date": "2026-12-31",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["current_amount"], "400.00")
        self.assertEqual(response.data["progress_percent"], 40.0)
        self.assertEqual(response.data["account_name"], "Cash")

    def test_progress_updates_as_the_account_balance_moves(self):
        goal = SavingsGoal.objects.create(
            budget_file=self.budget_file,
            account=self.cash,
            name="Vacation",
            target_amount=Decimal("800.00"),
        )
        # 400 opening balance against an 800 target -> 50%.
        response = self.client.get(f"/api/v1/finance/savings-goals/{goal.id}/")
        self.assertEqual(response.data["progress_percent"], 50.0)

        self.cash.opening_balance = Decimal("800.00")
        self.cash.save(update_fields=["opening_balance"])
        response = self.client.get(f"/api/v1/finance/savings-goals/{goal.id}/")
        self.assertEqual(response.data["progress_percent"], 100.0)

    def test_progress_is_not_capped_past_one_hundred_percent(self):
        goal = SavingsGoal.objects.create(
            budget_file=self.budget_file,
            account=self.cash,
            name="Overshot",
            target_amount=Decimal("100.00"),
        )
        response = self.client.get(f"/api/v1/finance/savings-goals/{goal.id}/")
        # 400 / 100 = 400% - a goal can be exceeded, and that's kept visible
        # rather than silently clamped to a misleading "100% done".
        self.assertEqual(response.data["progress_percent"], 400.0)

    def test_negative_account_balance_floors_progress_at_zero(self):
        self.cash.opening_balance = Decimal("-50.00")
        self.cash.save(update_fields=["opening_balance"])
        goal = SavingsGoal.objects.create(
            budget_file=self.budget_file,
            account=self.cash,
            name="Underwater",
            target_amount=Decimal("200.00"),
        )
        response = self.client.get(f"/api/v1/finance/savings-goals/{goal.id}/")
        self.assertEqual(response.data["progress_percent"], 0.0)

    def test_target_amount_must_be_positive(self):
        response = self.client.post(
            "/api/v1/finance/savings-goals/",
            {
                "budget_file": self.budget_file.id,
                "account": self.cash.id,
                "name": "Bad goal",
                "target_amount": "0.00",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_account_must_belong_to_the_same_budget_file(self):
        other_account = Account.objects.create(
            budget_file=self.budget_file, name="Other Budget File's Account (fixture)"
        )
        other_bf = BudgetFile.objects.create(
            organization=self.budget_file.organization,
            created_by=self.user,
            name="Second Budget File",
            currency_code="USD",
        )
        response = self.client.post(
            "/api/v1/finance/savings-goals/",
            {
                "budget_file": other_bf.id,
                "account": other_account.id,  # belongs to self.budget_file, not other_bf
                "name": "Mismatched",
                "target_amount": "100.00",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_removes_the_goal(self):
        goal = SavingsGoal.objects.create(
            budget_file=self.budget_file,
            account=self.cash,
            name="Short-lived",
            target_amount=Decimal("100.00"),
        )
        response = self.client.delete(f"/api/v1/finance/savings-goals/{goal.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(SavingsGoal.objects.filter(id=goal.id).exists())
