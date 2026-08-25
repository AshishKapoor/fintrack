from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from pft.models import Account, BudgetFile, CategoryV2, FxRate

User = get_user_model()


class NetWorthSeriesTests(APITestCase):
    """compute_net_worth_series / report_type=net_worth_series - ROADMAP.md
    Phase 3's "net worth over time" panel. A single running-balance pass over
    postings, snapshotted at each month boundary, must match what repeatedly
    calling the existing point-in-time compute_net_worth(as_of=X) would give -
    these tests hand-compute the expected running balance at each boundary
    rather than trusting the implementation's own arithmetic.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            email="networth-user@example.com",
            username="networth-user@example.com",
            password="StrongPass123!",
        )
        self.client.force_authenticate(user=self.user)
        self.budget_file = BudgetFile.objects.get(user=self.user, is_default=True)
        self.assertEqual(self.budget_file.currency_code, "USD")
        self.cash = Account.objects.get(budget_file=self.budget_file, name="Cash")
        self.cash.opening_balance = Decimal("0.00")
        self.cash.save(update_fields=["opening_balance"])
        self.income_category = CategoryV2.objects.filter(
            budget_file=self.budget_file, kind=CategoryV2.KIND_INCOME
        ).first()
        self.expense_category = CategoryV2.objects.filter(
            budget_file=self.budget_file, kind=CategoryV2.KIND_EXPENSE
        ).first()

    def _post_account_leg(self, day, account, amount, category=None):
        """A balanced two-posting transaction: an account leg of `amount`
        against `account`, offset by a category leg (income/expense, whichever
        balances) so it passes _validate_postings_balance. The category leg
        never affects net worth - only account legs do.
        """
        category = category or (
            self.income_category if amount > 0 else self.expense_category
        )
        self.client.post(
            "/api/v1/finance/transactions/",
            {
                "budget_file": self.budget_file.id,
                "transaction_date": day,
                "memo": "net worth series fixture",
                "postings": [
                    {"account": account.id, "amount": str(amount)},
                    {"category": category.id, "amount": str(-amount)},
                ],
            },
            format="json",
        )

    def _run(self, **payload):
        response = self.client.post(
            "/api/v1/finance/reports/run/",
            {"budget_file": self.budget_file.id, "report_type": "net_worth_series", **payload},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        return response.data

    def test_empty_ledger_is_zero_at_every_point(self):
        data = self._run(start_date="2026-01-01", end_date="2026-03-31")
        self.assertEqual([p["date"] for p in data["points"]], ["2026-01-31", "2026-02-28", "2026-03-31"])
        for point in data["points"]:
            self.assertEqual(point["total"], "0.00")
            self.assertFalse(point["missing_rate"])

    def test_running_balance_matches_hand_computed_totals_at_each_boundary(self):
        self._post_account_leg("2026-01-15", self.cash, Decimal("500.00"))  # -> 500
        self._post_account_leg("2026-02-10", self.cash, Decimal("-200.00"))  # -> 300
        self._post_account_leg("2026-03-05", self.cash, Decimal("100.00"))  # -> 400

        data = self._run(start_date="2026-01-01", end_date="2026-03-31")
        totals = {p["date"]: p["total"] for p in data["points"]}
        self.assertEqual(totals["2026-01-31"], "500.00")
        self.assertEqual(totals["2026-02-28"], "300.00")
        self.assertEqual(totals["2026-03-31"], "400.00")

    def test_fx_rate_added_partway_through_history_applies_only_from_its_date_forward(self):
        # A second, EUR-denominated account with a constant balance across the
        # whole range - any change in the total across points is purely the FX
        # picture changing, not the account's own balance moving.
        euro_account = Account.objects.create(
            budget_file=self.budget_file,
            name="Euro Savings",
            type=Account.TYPE_SAVINGS,
            opening_balance=Decimal("100.00"),
            currency_code="EUR",
        )
        # Only a USD rate dated mid-February - convert_amount's EUR branch only
        # needs the *quote* currency's rate, not a same-dated EUR row.
        FxRate.objects.create(rate_date=date(2026, 2, 15), currency_code="USD", rate=Decimal("1.10"))

        data = self._run(start_date="2026-01-01", end_date="2026-03-31")
        points = {p["date"]: p for p in data["points"]}

        # January: no rate on or before Jan 31 exists yet - the euro account is
        # excluded and the point is flagged, not silently priced with a rate
        # that didn't exist yet (or worse, today's rate).
        self.assertTrue(points["2026-01-31"]["missing_rate"])
        self.assertEqual(points["2026-01-31"]["total"], "0.00")

        # February and March both fall on or after the Feb 15 rate, and pick
        # it up via nearest-on-or-before: 100 EUR * 1.10 = 110.0000.
        for key in ("2026-02-28", "2026-03-31"):
            self.assertFalse(points[key]["missing_rate"])
            self.assertEqual(Decimal(points[key]["total"]), Decimal("110.0000"))
        del euro_account  # fixture only; not asserted on directly

    def test_credit_and_liability_accounts_are_both_negated(self):
        Account.objects.create(
            budget_file=self.budget_file,
            name="Credit Card",
            type=Account.TYPE_CREDIT,
            opening_balance=Decimal("-50.00"),
        )
        Account.objects.create(
            budget_file=self.budget_file,
            name="Student Loan",
            type=Account.TYPE_LIABILITY,
            opening_balance=Decimal("-1000.00"),
        )

        data = self._run(start_date="2026-01-15", end_date="2026-01-15")
        self.assertEqual(len(data["points"]), 1)
        # 0 (Cash) - abs(-50) - abs(-1000), regardless of the stored sign.
        self.assertEqual(data["points"][0]["total"], "-1050.00")

    def test_a_transfer_between_two_accounts_leaves_net_worth_unchanged(self):
        savings = Account.objects.create(
            budget_file=self.budget_file,
            name="Savings",
            type=Account.TYPE_SAVINGS,
            opening_balance=Decimal("0.00"),
        )
        self._post_account_leg("2026-01-10", self.cash, Decimal("500.00"))  # -> Cash 500
        self.client.post(
            "/api/v1/finance/transactions/",
            {
                "budget_file": self.budget_file.id,
                "transaction_date": "2026-02-10",
                "memo": "transfer to savings",
                "postings": [
                    {"account": self.cash.id, "amount": "-200.00"},
                    {"account": savings.id, "amount": "200.00"},
                ],
            },
            format="json",
        )

        data = self._run(start_date="2026-01-01", end_date="2026-03-31")
        for point in data["points"]:
            self.assertEqual(point["total"], "500.00")

    def test_default_range_is_the_trailing_twelve_months_ending_today(self):
        data = self._run()
        self.assertEqual(len(data["points"]), 12)
        self.assertEqual(data["points"][-1]["date"], date.today().isoformat())
        dates = [date.fromisoformat(p["date"]) for p in data["points"]]
        self.assertEqual(dates, sorted(dates))
        self.assertEqual(len(set(dates)), 12)


class CashFlowSankeyTests(APITestCase):
    """compute_cash_flow_sankey / report_type=cash_flow_sankey - ROADMAP.md
    Phase 3's Sankey cash-flow diagram. The hub must stay flow-balanced
    (inflow == outflow) in every case, which is what the single-hub design
    with a "Savings"/"From savings" gap node exists to guarantee - these
    tests check that balance explicitly, not just that a graph comes back.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            email="sankey-user@example.com",
            username="sankey-user@example.com",
            password="StrongPass123!",
        )
        self.client.force_authenticate(user=self.user)
        self.budget_file = BudgetFile.objects.get(user=self.user, is_default=True)
        self.account = Account.objects.get(budget_file=self.budget_file, name="Cash")

    def _category(self, name):
        return CategoryV2.objects.get(budget_file=self.budget_file, name=name)

    def _post(self, day, category_name, amount):
        """A balanced two-posting transaction against the category leg only -
        the account leg's own value never appears in the Sankey."""
        category = self._category(category_name)
        sign = -1 if category.kind == CategoryV2.KIND_INCOME else 1
        self.client.post(
            "/api/v1/finance/transactions/",
            {
                "budget_file": self.budget_file.id,
                "transaction_date": day,
                "memo": "sankey fixture",
                "postings": [
                    {"account": self.account.id, "amount": str(-sign * amount)},
                    {"category": category.id, "amount": str(sign * amount)},
                ],
            },
            format="json",
        )

    def _run(self, **payload):
        response = self.client.post(
            "/api/v1/finance/reports/run/",
            {
                "budget_file": self.budget_file.id,
                "report_type": "cash_flow_sankey",
                "start_date": "2026-01-01",
                "end_date": "2026-01-31",
                **payload,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        return response.data

    def _node_index(self, data, name):
        for index, node in enumerate(data["nodes"]):
            if node["name"] == name:
                return index
        self.fail(f"no node named {name!r} in {data['nodes']}")

    def _assert_no_node(self, data, name):
        self.assertNotIn(name, [node["name"] for node in data["nodes"]])

    def _hub_flows(self, data):
        hub_index = self._node_index(data, "Income")
        inflow = sum(
            Decimal(link["value"]) for link in data["links"] if link["target"] == hub_index
        )
        outflow = sum(
            Decimal(link["value"]) for link in data["links"] if link["source"] == hub_index
        )
        return inflow, outflow

    def test_empty_range_is_an_empty_graph_not_a_lone_hub(self):
        data = self._run()
        self.assertEqual(data["nodes"], [])
        self.assertEqual(data["links"], [])

    def test_surplus_month_gets_a_savings_node_and_a_balanced_hub(self):
        self._post("2026-01-05", "Salary", Decimal("1000.00"))
        self._post("2026-01-10", "Groceries", Decimal("300.00"))

        data = self._run()
        savings_index = self._node_index(data, "Savings")
        savings_link = next(link for link in data["links"] if link["target"] == savings_index)
        self.assertEqual(savings_link["value"], "700.00")
        self._assert_no_node(data, "From savings")
        inflow, outflow = self._hub_flows(data)
        self.assertEqual(inflow, outflow)
        self.assertEqual(inflow, Decimal("1000.00"))

    def test_deficit_month_gets_a_from_savings_node_and_a_balanced_hub(self):
        self._post("2026-01-05", "Salary", Decimal("200.00"))
        self._post("2026-01-10", "Housing", Decimal("500.00"))

        data = self._run()
        from_savings_index = self._node_index(data, "From savings")
        from_savings_link = next(
            link for link in data["links"] if link["source"] == from_savings_index
        )
        self.assertEqual(from_savings_link["value"], "300.00")
        self._assert_no_node(data, "Savings")
        inflow, outflow = self._hub_flows(data)
        self.assertEqual(inflow, outflow)
        self.assertEqual(inflow, Decimal("500.00"))

    def test_top_n_caps_categories_and_folds_the_exact_remainder_into_other(self):
        self._post("2026-01-05", "Salary", Decimal("1000.00"))
        self._post("2026-01-10", "Housing", Decimal("400.00"))
        self._post("2026-01-11", "Groceries", Decimal("300.00"))
        self._post("2026-01-12", "Transportation", Decimal("200.00"))
        self._post("2026-01-13", "Utilities", Decimal("100.00"))

        data = self._run(top_n=2)

        for name in ("Housing", "Groceries"):
            index = self._node_index(data, name)
            link = next(link for link in data["links"] if link["target"] == index)
            self.assertIn(link["value"], {"400.00", "300.00"})

        other_index = self._node_index(data, "Other expenses")
        other_link = next(link for link in data["links"] if link["target"] == other_index)
        self.assertEqual(other_link["value"], "300.00")  # Transportation (200) + Utilities (100)

        self._assert_no_node(data, "Transportation")
        self._assert_no_node(data, "Utilities")
