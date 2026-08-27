import json
from datetime import date
from decimal import Decimal
from io import StringIO
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.core.management import CommandError, call_command
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from pft.fx_rates import (
    FxRateError,
    convert_amount,
    fetch_and_store_rates,
    has_any_rates,
)
from pft.models import Account, FxRate
from pft.tests.helpers import personal_budget_file

User = get_user_model()


def _response(payload):
    cm = MagicMock()
    cm.__enter__.return_value = MagicMock(
        read=MagicMock(return_value=json.dumps(payload).encode("utf-8"))
    )
    return cm


class FetchAndStoreRatesTests(TestCase):
    @patch("pft.fx_rates.urllib.request.urlopen")
    def test_stores_a_row_per_currency_plus_eur_itself(self, mock_urlopen):
        mock_urlopen.return_value = _response(
            {"amount": 1.0, "base": "EUR", "date": "2026-03-20", "rates": {"USD": 1.08, "GBP": 0.85}}
        )
        stored = fetch_and_store_rates()

        self.assertEqual(stored, 3)  # USD, GBP, and the implicit EUR=1 row
        self.assertEqual(FxRate.objects.count(), 3)
        usd = FxRate.objects.get(rate_date=date(2026, 3, 20), currency_code="USD")
        self.assertEqual(usd.rate, Decimal("1.08"))
        eur = FxRate.objects.get(rate_date=date(2026, 3, 20), currency_code="EUR")
        self.assertEqual(eur.rate, Decimal("1"))

    @patch("pft.fx_rates.urllib.request.urlopen")
    def test_rerunning_the_same_date_updates_rather_than_duplicates(self, mock_urlopen):
        mock_urlopen.return_value = _response(
            {"amount": 1.0, "base": "EUR", "date": "2026-03-20", "rates": {"USD": 1.08}}
        )
        fetch_and_store_rates()
        mock_urlopen.return_value = _response(
            {"amount": 1.0, "base": "EUR", "date": "2026-03-20", "rates": {"USD": 1.10}}
        )
        fetch_and_store_rates()

        self.assertEqual(FxRate.objects.filter(currency_code="USD").count(), 1)
        self.assertEqual(
            FxRate.objects.get(currency_code="USD").rate, Decimal("1.10")
        )

    @patch("pft.fx_rates.urllib.request.urlopen", side_effect=OSError("network down"))
    def test_network_failure_raises_fx_rate_error(self, _mock_urlopen):
        with self.assertRaises(FxRateError):
            fetch_and_store_rates()

    @patch("pft.fx_rates.urllib.request.urlopen")
    def test_unsafe_base_url_is_rejected(self, mock_urlopen):
        with override_settings(FRANKFURTER_BASE_URL="http://127.0.0.1:9999"):
            with self.assertRaises(FxRateError):
                fetch_and_store_rates()
        mock_urlopen.assert_not_called()

    @patch("pft.fx_rates.urllib.request.urlopen")
    def test_as_of_is_passed_through_as_a_dated_path(self, mock_urlopen):
        mock_urlopen.return_value = _response(
            {"amount": 1.0, "base": "EUR", "date": "2026-01-02", "rates": {"USD": 1.05}}
        )
        fetch_and_store_rates(as_of=date(2026, 1, 3))  # a Saturday; ECB has no rate
        request = mock_urlopen.call_args[0][0]
        self.assertIn("/2026-01-03", request.full_url)
        # Stored under the date frankfurter actually reported (the preceding
        # business day), not the one requested.
        self.assertTrue(FxRate.objects.filter(rate_date=date(2026, 1, 2)).exists())


class SyncFxRatesCommandTests(TestCase):
    """`manage.py sync_fx_rates` - the bare-metal-cron / no-beat fallback for
    sync-fx-rates-daily, mirroring prune_finance_jobs' own command wrapper."""

    @patch("pft.management.commands.sync_fx_rates.fetch_and_store_rates", return_value=3)
    def test_reports_how_many_currencies_were_stored(self, _mock_fetch):
        out = StringIO()
        call_command("sync_fx_rates", stdout=out)
        self.assertIn("3", out.getvalue())

    @patch(
        "pft.management.commands.sync_fx_rates.fetch_and_store_rates",
        side_effect=FxRateError("could not reach frankfurter.app"),
    )
    def test_upstream_failure_raises_command_error(self, _mock_fetch):
        with self.assertRaises(CommandError):
            call_command("sync_fx_rates", stdout=StringIO())


class ConvertAmountTests(TestCase):
    def setUp(self):
        FxRate.objects.create(rate_date=date(2026, 3, 20), currency_code="EUR", rate=Decimal("1"))
        FxRate.objects.create(rate_date=date(2026, 3, 20), currency_code="USD", rate=Decimal("1.10"))
        FxRate.objects.create(rate_date=date(2026, 3, 20), currency_code="GBP", rate=Decimal("0.85"))

    def test_same_currency_is_a_no_op(self):
        self.assertEqual(
            convert_amount(Decimal("50"), "USD", "USD", as_of=date(2026, 3, 20)), Decimal("50")
        )

    def test_eur_to_quote_currency(self):
        result = convert_amount(Decimal("100"), "EUR", "USD", as_of=date(2026, 3, 20))
        self.assertEqual(result, Decimal("110.0000"))

    def test_quote_currency_to_eur(self):
        result = convert_amount(Decimal("110"), "USD", "EUR", as_of=date(2026, 3, 20))
        self.assertEqual(result, Decimal("100.0000"))

    def test_triangulates_between_two_non_eur_currencies(self):
        # 100 USD -> EUR (/1.10) -> GBP (*0.85)
        result = convert_amount(Decimal("100"), "USD", "GBP", as_of=date(2026, 3, 20))
        expected = (Decimal("100") / Decimal("1.10") * Decimal("0.85")).quantize(Decimal("0.0001"))
        self.assertEqual(result, expected)

    def test_uses_nearest_rate_on_or_before_as_of(self):
        result = convert_amount(Decimal("10"), "EUR", "USD", as_of=date(2026, 4, 1))
        self.assertEqual(result, Decimal("11.0000"))

    def test_missing_rate_returns_none_not_a_guess(self):
        self.assertIsNone(convert_amount(Decimal("10"), "EUR", "JPY", as_of=date(2026, 3, 20)))
        self.assertIsNone(
            convert_amount(Decimal("10"), "EUR", "USD", as_of=date(2020, 1, 1))
        )

    def test_has_any_rates(self):
        self.assertTrue(has_any_rates())
        FxRate.objects.all().delete()
        self.assertFalse(has_any_rates())


class AccountBalanceConversionTests(APITestCase):
    """account_balances/compute_net_worth actually converting - the heart of
    ROADMAP.md Phase 2's "Real multi-currency": today currency was
    display-only, this is what makes it real."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="fx-user@example.com", username="fx-user@example.com", password="StrongPass123!"
        )
        self.client.force_authenticate(user=self.user)
        self.budget_file = personal_budget_file(self.user)
        self.assertEqual(self.budget_file.currency_code, "USD")
        self.cash = Account.objects.get(budget_file=self.budget_file, name="Cash")
        self.cash.opening_balance = Decimal("100.00")
        self.cash.save(update_fields=["opening_balance"])

        self.euro_account = Account.objects.create(
            budget_file=self.budget_file,
            name="Euro Savings",
            type=Account.TYPE_SAVINGS,
            opening_balance=Decimal("200.00"),
            currency_code="EUR",
        )
        FxRate.objects.create(rate_date=date.today(), currency_code="EUR", rate=Decimal("1"))
        FxRate.objects.create(rate_date=date.today(), currency_code="USD", rate=Decimal("1.10"))

    def test_balances_endpoint_reports_native_and_converted_amounts(self):
        response = self.client.get(
            f"/api/v1/finance/budget-files/{self.budget_file.id}/balances/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        by_id = {row["account_id"]: row for row in response.data["accounts"]}

        cash_row = by_id[self.cash.id]
        self.assertEqual(cash_row["currency_code"], "USD")
        self.assertEqual(cash_row["balance"], "100.00")
        self.assertEqual(cash_row["converted_balance"], "100.00")

        euro_row = by_id[self.euro_account.id]
        self.assertEqual(euro_row["currency_code"], "EUR")
        self.assertEqual(euro_row["balance"], "200.00")
        # 200 EUR -> USD at 1.10
        self.assertEqual(euro_row["converted_balance"], "220.0000")

        net_worth = response.data["net_worth"]
        self.assertEqual(net_worth["currency_code"], "USD")
        self.assertEqual(Decimal(net_worth["total"]), Decimal("320.0000"))
        self.assertFalse(net_worth["missing_rate"])

    def test_missing_rate_excludes_account_and_flags_partial_total(self):
        FxRate.objects.all().delete()  # nothing fetched yet on this instance
        response = self.client.get(
            f"/api/v1/finance/budget-files/{self.budget_file.id}/balances/"
        )
        by_id = {row["account_id"]: row for row in response.data["accounts"]}
        self.assertIsNone(by_id[self.euro_account.id]["converted_balance"])
        # Same-currency accounts still convert trivially even with an empty table.
        self.assertEqual(by_id[self.cash.id]["converted_balance"], "100.00")
        self.assertTrue(response.data["net_worth"]["missing_rate"])
        self.assertEqual(Decimal(response.data["net_worth"]["total"]), Decimal("100.00"))


class FxRateApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="fx-api@example.com", username="fx-api@example.com", password="StrongPass123!"
        )
        self.client.force_authenticate(user=self.user)

    def test_list_filters_by_currency_code(self):
        FxRate.objects.create(rate_date=date(2026, 3, 20), currency_code="USD", rate=Decimal("1.1"))
        FxRate.objects.create(rate_date=date(2026, 3, 20), currency_code="GBP", rate=Decimal("0.85"))

        response = self.client.get("/api/v1/finance/fx-rates/?currency_code=usd")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["currency_code"], "USD")

    @patch("pft.finance_views.fetch_and_store_rates", return_value=5)
    def test_sync_action_returns_stored_count(self, _mock_fetch):
        response = self.client.post("/api/v1/finance/fx-rates/sync/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {"stored": 5})

    @patch(
        "pft.finance_views.fetch_and_store_rates",
        side_effect=FxRateError("could not reach frankfurter.app"),
    )
    def test_sync_action_surfaces_upstream_failure(self, _mock_fetch):
        response = self.client.post("/api/v1/finance/fx-rates/sync/")
        self.assertEqual(response.status_code, 502)
