from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from pft.models import Account, BudgetFile

User = get_user_model()


class DebtPayoffProjectionTests(APITestCase):
    """compute_debt_payoff_projection / report_type=debt_payoff - ROADMAP.md
    Phase 3's "snowball/avalanche projections and payoff timelines" item.
    Expected figures in these tests were independently computed by
    hand-simulating the same month-by-month accrual in a throwaway script,
    not derived from the implementation itself.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            email="debt-user@example.com",
            username="debt-user@example.com",
            password="StrongPass123!",
        )
        self.client.force_authenticate(user=self.user)
        self.budget_file = BudgetFile.objects.get(user=self.user, is_default=True)

    def _debt_account(self, name, balance, rate, minimum, account_type=Account.TYPE_CREDIT, currency=None):
        account = Account.objects.create(
            budget_file=self.budget_file,
            name=name,
            type=account_type,
            # A credit account's own balance is conventionally negative
            # (money owed) - compute_debt_payoff_projection reads abs().
            opening_balance=-balance,
            interest_rate=rate,
            minimum_payment=minimum,
            **({"currency_code": currency} if currency else {}),
        )
        return account

    def _run(self, **payload):
        response = self.client.post(
            "/api/v1/finance/reports/run/",
            {"budget_file": self.budget_file.id, "report_type": "debt_payoff", **payload},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        return response.data

    def test_no_debt_accounts_returns_an_empty_projection(self):
        data = self._run()
        self.assertEqual(data["schedule"], [])
        self.assertEqual(data["payoff_order"], [])
        self.assertEqual(data["months_to_debt_free"], 0)
        self.assertEqual(data["total_interest_paid"], "0.00")

    def test_single_debt_interest_accrual_matches_hand_computation(self):
        self._debt_account("Card", Decimal("1200.00"), Decimal("12"), Decimal("500.00"))
        data = self._run(strategy="avalanche", extra_payment="0")
        self.assertEqual(data["months_to_debt_free"], 3)
        self.assertEqual(data["total_interest_paid"], "21.31")
        self.assertEqual(len(data["schedule"]), 3)
        self.assertEqual(data["schedule"][-1]["total_balance"], "0.00")

    def test_snowball_and_avalanche_choose_different_priority_debts(self):
        self._debt_account("Small Low Rate", Decimal("300.00"), Decimal("10"), Decimal("50.00"))
        self._debt_account("Big High Rate", Decimal("2000.00"), Decimal("20"), Decimal("60.00"))

        snowball = self._run(strategy="snowball", extra_payment="100")
        avalanche = self._run(strategy="avalanche", extra_payment="100")

        # payoff_order is chronological (when each debt actually hit zero),
        # not "who was targeted" - under snowball "Small Low Rate" is both
        # targeted AND smaller, so here it happens to lead the list too.
        self.assertEqual(snowball["payoff_order"][0]["account"], "Small Low Rate")
        self.assertEqual(snowball["payoff_order"][0]["payoff_month"], 3)
        self.assertEqual(snowball["payoff_order"][1]["payoff_month"], 13)

        # Avalanche targets "Big High Rate" for extra payments instead, but
        # its balance is so much larger that it still finishes last - the
        # real signal that avalanche re-targeted is "Small Low Rate" (now
        # getting only its own minimum) paying off *later* than it did under
        # snowball: month 7 here vs month 3 there.
        avalanche_payoff_by_account = {row["account"]: row["payoff_month"] for row in avalanche["payoff_order"]}
        self.assertEqual(avalanche_payoff_by_account["Small Low Rate"], 7)
        self.assertEqual(avalanche_payoff_by_account["Big High Rate"], 13)

        # The whole point of avalanche: same debts, same extra payment, less
        # total interest paid than snowball.
        self.assertEqual(snowball["total_interest_paid"], "282.61")
        self.assertEqual(avalanche["total_interest_paid"], "254.46")
        self.assertLess(Decimal(avalanche["total_interest_paid"]), Decimal(snowball["total_interest_paid"]))

    def test_minimum_payment_below_interest_never_pays_off(self):
        self._debt_account("Underwater Card", Decimal("5000.00"), Decimal("24"), Decimal("90.00"))
        data = self._run(strategy="avalanche", extra_payment="0")
        self.assertIsNone(data["months_to_debt_free"])
        # Still a real (very large) number, not silently dropped - the
        # simulation ran the full backstop window, it just never finished.
        self.assertEqual(len(data["schedule"]), 600)

    def test_excludes_accounts_missing_interest_rate_or_minimum_payment(self):
        Account.objects.create(
            budget_file=self.budget_file,
            name="Unconfigured Card",
            type=Account.TYPE_CREDIT,
            opening_balance=Decimal("-400.00"),
        )
        data = self._run()
        self.assertEqual(data["payoff_order"], [])
        self.assertEqual(len(data["excluded"]), 1)
        self.assertEqual(data["excluded"][0]["account"], "Unconfigured Card")
        self.assertEqual(data["excluded"][0]["reason"], "missing_interest_rate_or_minimum_payment")

    def test_a_paid_off_debt_is_not_included(self):
        # A credit account with a positive (or zero) balance - nothing owed.
        Account.objects.create(
            budget_file=self.budget_file,
            name="Paid Off Card",
            type=Account.TYPE_CREDIT,
            opening_balance=Decimal("0.00"),
            interest_rate=Decimal("19.99"),
            minimum_payment=Decimal("25.00"),
        )
        data = self._run()
        self.assertEqual(data["payoff_order"], [])
        self.assertEqual(data["excluded"], [])

    def test_non_debt_account_types_are_never_considered(self):
        Account.objects.create(
            budget_file=self.budget_file,
            name="Everyday Checking",
            type=Account.TYPE_CHECKING,
            opening_balance=Decimal("-100.00"),  # overdrawn, but not a debt account type
            interest_rate=Decimal("19.99"),
            minimum_payment=Decimal("10.00"),
        )
        data = self._run()
        self.assertEqual(data["payoff_order"], [])
        self.assertEqual(data["excluded"], [])

    def test_excludes_a_debt_with_no_fx_rate_for_its_currency(self):
        self._debt_account(
            "Foreign Card", Decimal("500.00"), Decimal("15"), Decimal("50.00"), currency="JPY"
        )
        # No FxRate rows at all - JPY can't be converted to the budget
        # file's USD.
        data = self._run()
        self.assertEqual(data["payoff_order"], [])
        self.assertEqual(len(data["excluded"]), 1)
        self.assertEqual(data["excluded"][0]["reason"], "missing_fx_rate")

    def test_invalid_strategy_is_rejected(self):
        response = self.client.post(
            "/api/v1/finance/reports/run/",
            {"budget_file": self.budget_file.id, "report_type": "debt_payoff", "strategy": "bogus"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_negative_extra_payment_is_rejected(self):
        response = self.client.post(
            "/api/v1/finance/reports/run/",
            {
                "budget_file": self.budget_file.id,
                "report_type": "debt_payoff",
                "extra_payment": "-50",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
