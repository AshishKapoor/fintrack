import json
from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from pft import bank_sync_gocardless as gc
from pft import bank_sync_simplefin as sf
from pft.bank_sync import (
    BankSyncError,
    ProviderAccount,
    ProviderTransaction,
    ingest_transactions,
    sync_connection,
)
from pft.crypto import decrypt_json, encrypt_json
from pft.models import (
    Account,
    LedgerTransaction,
    SyncConnection,
    SyncConnectionAccount,
    TransactionRule,
)
from pft.tests.helpers import personal_budget_file, rows

User = get_user_model()


def _json_response(payload):
    cm = MagicMock()
    cm.__enter__.return_value = MagicMock(
        read=MagicMock(return_value=json.dumps(payload).encode("utf-8"))
    )
    return cm


def _text_response(text):
    cm = MagicMock()
    cm.__enter__.return_value = MagicMock(
        read=MagicMock(return_value=text.encode("utf-8"))
    )
    return cm


class CryptoTests(TestCase):
    def test_roundtrip(self):
        token = encrypt_json({"access_url": "https://user:pass@bridge.example/simplefin"})
        self.assertNotIn("pass", token)
        self.assertEqual(
            decrypt_json(token),
            {"access_url": "https://user:pass@bridge.example/simplefin"},
        )

    def test_decrypt_blank_is_empty_dict(self):
        self.assertEqual(decrypt_json(""), {})


class IngestTransactionsTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="sync@example.com", username="sync@example.com", password="StrongPass123!"
        )
        self.budget_file = personal_budget_file(self.user)
        self.account = Account.objects.get(budget_file=self.budget_file, name="Cash")
        self.connection = SyncConnection.objects.create(
            budget_file=self.budget_file,
            provider=SyncConnection.PROVIDER_SIMPLEFIN,
            status=SyncConnection.STATUS_ACTIVE,
        )
        self.linked = SyncConnectionAccount.objects.create(
            connection=self.connection, account=self.account, external_account_id="acct-1"
        )

    def test_creates_transactions_and_dedupes_by_external_id(self):
        rows = [
            ProviderTransaction(
                external_id="tx-1",
                transaction_date=date(2026, 3, 1),
                amount=Decimal("-12.50"),
                payee="Coffee Shop",
                memo="latte",
            ),
            ProviderTransaction(
                external_id="tx-2",
                transaction_date=date(2026, 3, 1),
                amount=Decimal("-12.50"),
                payee="Coffee Shop",
                memo="latte",
            ),
        ]
        result = ingest_transactions(self.linked, rows)
        self.assertEqual(result, {"created": 2, "skipped": 0})
        created = LedgerTransaction.objects.filter(
            budget_file=self.budget_file, source_type=LedgerTransaction.SOURCE_SYNC
        )
        self.assertEqual(created.count(), 2)
        # Two genuinely separate $12.50 coffees on the same day must both
        # survive - a content hash would have wrongly collapsed these.
        self.assertEqual(
            set(created.values_list("match_key", flat=True)),
            {"sync:simplefin:acct-1:tx-1", "sync:simplefin:acct-1:tx-2"},
        )

        result_again = ingest_transactions(self.linked, rows)
        self.assertEqual(result_again, {"created": 0, "skipped": 2})
        self.assertEqual(created.count(), 2)

    def test_refuses_to_ingest_into_an_unmapped_account(self):
        unmapped = SyncConnectionAccount.objects.create(
            connection=self.connection, account=None, external_account_id="acct-2"
        )
        with self.assertRaises(BankSyncError):
            ingest_transactions(
                unmapped,
                [
                    ProviderTransaction(
                        external_id="x", transaction_date=date(2026, 3, 1), amount=Decimal("1")
                    )
                ],
            )

    def test_applies_matching_rule_and_creates_posting_pair(self):
        TransactionRule.objects.create(
            budget_file=self.budget_file,
            name="tag coffee",
            conditions={"payee_contains": "Coffee"},
            actions={"cleared": True},
        )
        ingest_transactions(
            self.linked,
            [
                ProviderTransaction(
                    external_id="tx-1",
                    transaction_date=date(2026, 3, 1),
                    amount=Decimal("-5.00"),
                    payee="Coffee Shop",
                )
            ],
        )
        tx = LedgerTransaction.objects.get(match_key="sync:simplefin:acct-1:tx-1")
        self.assertTrue(tx.cleared)
        self.assertEqual(tx.source_type, LedgerTransaction.SOURCE_RULE)
        amounts = sorted(tx.postings.values_list("amount", flat=True))
        self.assertEqual(amounts, [Decimal("-5.00"), Decimal("5.00")])


class SyncConnectionOrchestrationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="orch@example.com", username="orch@example.com", password="StrongPass123!"
        )
        self.budget_file = personal_budget_file(self.user)
        self.account = Account.objects.get(budget_file=self.budget_file, name="Cash")
        self.connection = SyncConnection.objects.create(
            budget_file=self.budget_file,
            provider=SyncConnection.PROVIDER_SIMPLEFIN,
            status=SyncConnection.STATUS_ACTIVE,
        )
        self.linked = SyncConnectionAccount.objects.create(
            connection=self.connection, account=self.account, external_account_id="acct-1"
        )

    @patch("pft.bank_sync.get_provider")
    def test_sync_connection_updates_status_and_cursors(self, mock_get_provider):
        provider = MagicMock()
        provider.fetch_transactions.return_value = [
            ProviderTransaction(
                external_id="tx-1", transaction_date=date(2026, 3, 1), amount=Decimal("10")
            )
        ]
        mock_get_provider.return_value = provider

        result = sync_connection(self.connection)

        self.assertEqual(result["created"], 1)
        self.assertEqual(result["accounts_synced"], 1)
        self.assertEqual(result["errors"], [])
        self.connection.refresh_from_db()
        self.linked.refresh_from_db()
        self.assertEqual(self.connection.status, SyncConnection.STATUS_ACTIVE)
        self.assertIsNotNone(self.connection.last_synced_at)
        self.assertIsNotNone(self.linked.last_synced_at)

    @patch("pft.bank_sync.get_provider")
    def test_sync_connection_records_error_without_crashing(self, mock_get_provider):
        provider = MagicMock()
        provider.fetch_transactions.side_effect = BankSyncError("bank says no")
        mock_get_provider.return_value = provider

        result = sync_connection(self.connection)

        self.assertEqual(result["accounts_synced"], 0)
        self.assertIn("bank says no", result["errors"][0])
        self.connection.refresh_from_db()
        self.assertEqual(self.connection.status, SyncConnection.STATUS_ERROR)

    @patch("pft.bank_sync.get_provider")
    def test_unmapped_accounts_are_skipped_not_synced(self, mock_get_provider):
        SyncConnectionAccount.objects.create(
            connection=self.connection, account=None, external_account_id="acct-2"
        )
        provider = MagicMock()
        provider.fetch_transactions.return_value = []
        mock_get_provider.return_value = provider

        sync_connection(self.connection)

        self.assertEqual(provider.fetch_transactions.call_count, 1)


@override_settings(
    GOCARDLESS_SECRET_ID="test-id",
    GOCARDLESS_SECRET_KEY="test-key",
    GOCARDLESS_API_BASE_URL="https://bankaccountdata.gocardless.com/api/v2",
    FINTRACK_FRONTEND_URL="https://app.example.com",
)
class GoCardlessProviderTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            email="gc@example.com", username="gc@example.com", password="StrongPass123!"
        )
        self.budget_file = personal_budget_file(self.user)
        self.connection = SyncConnection.objects.create(
            budget_file=self.budget_file, provider=SyncConnection.PROVIDER_GOCARDLESS
        )

    def test_is_configured_reflects_settings(self):
        self.assertTrue(gc.provider.is_configured())
        with override_settings(GOCARDLESS_SECRET_ID="", GOCARDLESS_SECRET_KEY=""):
            self.assertFalse(gc.provider.is_configured())

    @patch("pft.bank_sync_gocardless.urllib.request.urlopen")
    def test_list_institutions_fetches_token_once_and_caches_result(self, mock_urlopen):
        mock_urlopen.side_effect = [
            _json_response({"access": "tok-1", "access_expires": 3600}),
            _json_response([{"id": "REVOLUT_REVOGB21", "name": "Revolut", "logo": "l"}]),
        ]
        institutions = gc.provider.list_institutions(country="gb")
        self.assertEqual([i.id for i in institutions], ["REVOLUT_REVOGB21"])
        self.assertEqual(mock_urlopen.call_count, 2)

        # A second call for the same country hits the institutions cache, not
        # even the token cache - no further urlopen calls at all.
        again = gc.provider.list_institutions(country="gb")
        self.assertEqual([i.id for i in again], ["REVOLUT_REVOGB21"])
        self.assertEqual(mock_urlopen.call_count, 2)

    @patch("pft.bank_sync_gocardless.urllib.request.urlopen")
    def test_start_link_creates_agreement_and_requisition(self, mock_urlopen):
        mock_urlopen.side_effect = [
            _json_response({"access": "tok-1", "access_expires": 3600}),
            _json_response({"id": "agreement-1"}),
            _json_response({"id": "req-1", "link": "https://bank.example/consent"}),
        ]
        result = gc.provider.start_link(self.connection, {"institution_id": "REVOLUT_REVOGB21"})

        self.assertEqual(result, {"redirect_url": "https://bank.example/consent"})
        self.connection.refresh_from_db()
        self.assertEqual(self.connection.external_reference, "req-1")
        self.assertEqual(
            decrypt_json(self.connection.secret_data),
            {"requisition_id": "req-1", "agreement_id": "agreement-1"},
        )
        # The redirect sent to GoCardless carries FINTRACK_FRONTEND_URL and
        # this connection's id, so the frontend knows which one to finish.
        requisition_call = mock_urlopen.call_args_list[2][0][0]
        body = json.loads(requisition_call.data)
        self.assertEqual(
            body["redirect"],
            f"https://app.example.com/bank-sync/callback?connection={self.connection.id}",
        )

    def test_start_link_requires_institution_id(self):
        with self.assertRaises(BankSyncError):
            gc.provider.start_link(self.connection, {})

    @patch("pft.bank_sync_gocardless.urllib.request.urlopen")
    def test_finish_link_requires_linked_status(self, mock_urlopen):
        self.connection.external_reference = "req-1"
        self.connection.save(update_fields=["external_reference"])
        mock_urlopen.side_effect = [
            _json_response({"access": "tok-1", "access_expires": 3600}),
            _json_response({"id": "req-1", "status": "CR"}),
        ]
        with self.assertRaises(BankSyncError):
            gc.provider.finish_link(self.connection, {})

    @patch("pft.bank_sync_gocardless.urllib.request.urlopen")
    def test_list_accounts_returns_provider_accounts(self, mock_urlopen):
        self.connection.external_reference = "req-1"
        self.connection.save(update_fields=["external_reference"])
        mock_urlopen.side_effect = [
            _json_response({"access": "tok-1", "access_expires": 3600}),
            _json_response({"id": "req-1", "status": "LN", "accounts": ["acct-1"]}),
            _json_response(
                {"account": {"iban": "GB00BANK00000000", "currency": "gbp", "name": "Main"}}
            ),
        ]
        accounts = gc.provider.list_accounts(self.connection)
        self.assertEqual(len(accounts), 1)
        self.assertEqual(accounts[0].external_id, "acct-1")
        self.assertEqual(accounts[0].currency_code, "GBP")
        self.assertEqual(accounts[0].iban, "GB00BANK00000000")

    @patch("pft.bank_sync_gocardless.urllib.request.urlopen")
    def test_fetch_transactions_parses_booked_entries_with_signed_amount(self, mock_urlopen):
        linked = SyncConnectionAccount.objects.create(
            connection=self.connection, external_account_id="acct-1"
        )
        mock_urlopen.side_effect = [
            _json_response({"access": "tok-1", "access_expires": 3600}),
            _json_response(
                {
                    "transactions": {
                        "booked": [
                            {
                                "transactionId": "gc-1",
                                "bookingDate": "2026-03-01",
                                "transactionAmount": {"amount": "-9.99", "currency": "GBP"},
                                "creditorName": "Corner Shop",
                                "remittanceInformationUnstructured": "card purchase",
                            }
                        ],
                        "pending": [{"transactionAmount": {"amount": "-1.00"}}],
                    }
                }
            ),
        ]
        rows = gc.provider.fetch_transactions(self.connection, linked, since=date(2026, 3, 1))
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].external_id, "gc-1")
        self.assertEqual(rows[0].amount, Decimal("-9.99"))
        self.assertEqual(rows[0].payee, "Corner Shop")

    @patch("pft.bank_sync_gocardless.urllib.request.urlopen")
    def test_unsafe_api_base_url_is_rejected(self, mock_urlopen):
        with override_settings(GOCARDLESS_API_BASE_URL="http://127.0.0.1:9999/api/v2"):
            with self.assertRaises(BankSyncError):
                gc.provider.list_institutions(country="gb")
        mock_urlopen.assert_not_called()


class SimpleFinProviderTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="sf@example.com", username="sf@example.com", password="StrongPass123!"
        )
        self.budget_file = personal_budget_file(self.user)
        self.connection = SyncConnection.objects.create(
            budget_file=self.budget_file, provider=SyncConnection.PROVIDER_SIMPLEFIN
        )

    def _token_for(self, claim_url: str) -> str:
        import base64

        return base64.b64encode(claim_url.encode("utf-8")).decode("ascii")

    @patch("pft.bank_sync_simplefin.urllib.request.urlopen")
    def test_start_link_claims_token_and_stores_access_url(self, mock_urlopen):
        mock_urlopen.return_value = _text_response(
            "https://demo-user:demo-pass@bridge.simplefin.org/simplefin"
        )
        setup_token = self._token_for("https://bridge.simplefin.org/claim/abc123")

        result = sf.provider.start_link(self.connection, {"setup_token": setup_token})

        self.assertEqual(result, {"status": "active"})
        self.connection.refresh_from_db()
        self.assertEqual(self.connection.status, SyncConnection.STATUS_ACTIVE)
        self.assertEqual(
            decrypt_json(self.connection.secret_data),
            {"access_url": "https://demo-user:demo-pass@bridge.simplefin.org/simplefin"},
        )
        # Basic auth is sent as a header, not left in the claim request's URL.
        request = mock_urlopen.call_args[0][0]
        self.assertEqual(request.get_method(), "POST")
        self.assertEqual(request.full_url, "https://bridge.simplefin.org/claim/abc123")

    def test_start_link_rejects_garbage_token(self):
        with self.assertRaises(BankSyncError):
            sf.provider.start_link(self.connection, {"setup_token": "not-base64-!!!"})

    def test_start_link_requires_setup_token(self):
        with self.assertRaises(BankSyncError):
            sf.provider.start_link(self.connection, {})

    @patch("pft.bank_sync_simplefin.urllib.request.urlopen")
    def test_start_link_rejects_claim_url_pointing_at_private_network(self, mock_urlopen):
        setup_token = self._token_for("http://127.0.0.1:8000/claim/evil")
        with self.assertRaises(BankSyncError):
            sf.provider.start_link(self.connection, {"setup_token": setup_token})
        mock_urlopen.assert_not_called()

    @patch("pft.bank_sync_simplefin.urllib.request.urlopen")
    def test_list_accounts_and_fetch_transactions(self, mock_urlopen):
        self.connection.secret_data = encrypt_json(
            {"access_url": "https://u:p@bridge.simplefin.org/simplefin"}
        )
        self.connection.save(update_fields=["secret_data"])
        linked = SyncConnectionAccount.objects.create(
            connection=self.connection, external_account_id="acct-9"
        )

        mock_urlopen.return_value = _text_response(
            json.dumps({"accounts": [{"id": "acct-9", "name": "Checking", "currency": "usd"}]})
        )
        accounts = sf.provider.list_accounts(self.connection)
        self.assertEqual(accounts[0].external_id, "acct-9")
        self.assertEqual(accounts[0].currency_code, "USD")
        list_request = mock_urlopen.call_args[0][0]
        self.assertEqual(list_request.get_header("Authorization"), "Basic dTpw")

        mock_urlopen.return_value = _text_response(
            json.dumps(
                {
                    "accounts": [
                        {
                            "id": "acct-9",
                            "transactions": [
                                {
                                    "id": "sf-1",
                                    "posted": 1772582400,
                                    "amount": "-42.10",
                                    "payee": "Grocery Store",
                                    "description": "POS purchase",
                                }
                            ],
                        }
                    ]
                }
            )
        )
        rows = sf.provider.fetch_transactions(self.connection, linked, since=date(2026, 3, 1))
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].external_id, "sf-1")
        self.assertEqual(rows[0].amount, Decimal("-42.10"))
        self.assertEqual(rows[0].payee, "Grocery Store")


class SyncConnectionApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="api-sync@example.com", username="api-sync@example.com", password="StrongPass123!"
        )
        self.client.force_authenticate(user=self.user)
        self.budget_file = personal_budget_file(self.user)
        self.account = Account.objects.get(budget_file=self.budget_file, name="Cash")

        self.other_user = User.objects.create_user(
            email="other-sync@example.com",
            username="other-sync@example.com",
            password="StrongPass123!",
        )

    def test_providers_endpoint_lists_both_providers(self):
        response = self.client.get("/api/v1/finance/sync-connections/providers/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        keys = {row["key"] for row in response.data}
        self.assertEqual(keys, {"gocardless", "simplefin"})
        simplefin = next(r for r in response.data if r["key"] == "simplefin")
        self.assertTrue(simplefin["configured"])

    def test_create_connection_defaults_to_pending(self):
        response = self.client.post(
            "/api/v1/finance/sync-connections/",
            {"budget_file": self.budget_file.id, "provider": "simplefin"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "pending")
        # Credentials never round-trip back out of the API.
        self.assertNotIn("secret_data", response.data)

    @patch("pft.finance_views.get_provider")
    def test_link_and_callback_discover_accounts(self, mock_get_provider):
        connection = SyncConnection.objects.create(
            budget_file=self.budget_file, provider=SyncConnection.PROVIDER_SIMPLEFIN
        )
        provider = MagicMock()
        provider.start_link.return_value = {"status": "active"}
        provider.list_accounts.return_value = [
            ProviderAccount(external_id="ext-1", name="Checking", currency_code="USD")
        ]
        mock_get_provider.return_value = provider

        link_response = self.client.post(
            f"/api/v1/finance/sync-connections/{connection.id}/link/",
            {"setup_token": "abc"},
            format="json",
        )
        self.assertEqual(link_response.status_code, status.HTTP_200_OK)
        provider.start_link.assert_called_once()

        callback_response = self.client.post(
            f"/api/v1/finance/sync-connections/{connection.id}/callback/",
            {},
            format="json",
        )
        self.assertEqual(callback_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(callback_response.data["linked_accounts"]), 1)
        self.assertEqual(
            callback_response.data["linked_accounts"][0]["external_account_id"], "ext-1"
        )

    @patch("pft.finance_views.get_provider")
    def test_callback_error_marks_connection_errored(self, mock_get_provider):
        connection = SyncConnection.objects.create(
            budget_file=self.budget_file, provider=SyncConnection.PROVIDER_GOCARDLESS
        )
        provider = MagicMock()
        provider.finish_link.side_effect = BankSyncError("consent expired")
        mock_get_provider.return_value = provider

        response = self.client.post(
            f"/api/v1/finance/sync-connections/{connection.id}/callback/",
            {},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        connection.refresh_from_db()
        self.assertEqual(connection.status, SyncConnection.STATUS_ERROR)
        self.assertIn("consent expired", connection.last_error)

    def test_map_account_creates_new_account(self):
        connection = SyncConnection.objects.create(
            budget_file=self.budget_file,
            provider=SyncConnection.PROVIDER_SIMPLEFIN,
            status=SyncConnection.STATUS_ACTIVE,
        )
        linked = SyncConnectionAccount.objects.create(
            connection=connection,
            external_account_id="ext-1",
            display_name="Checking",
            currency_code="EUR",
        )

        response = self.client.post(
            f"/api/v1/finance/sync-connection-accounts/{linked.id}/map/",
            {"create_account": {"name": "My Checking"}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        linked.refresh_from_db()
        self.assertIsNotNone(linked.account)
        self.assertEqual(linked.account.name, "My Checking")
        self.assertEqual(linked.account.currency_code, "EUR")

    def test_map_account_to_existing_account(self):
        connection = SyncConnection.objects.create(
            budget_file=self.budget_file,
            provider=SyncConnection.PROVIDER_SIMPLEFIN,
            status=SyncConnection.STATUS_ACTIVE,
        )
        linked = SyncConnectionAccount.objects.create(
            connection=connection, external_account_id="ext-1"
        )

        response = self.client.post(
            f"/api/v1/finance/sync-connection-accounts/{linked.id}/map/",
            {"account_id": self.account.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        linked.refresh_from_db()
        self.assertEqual(linked.account_id, self.account.id)

    def test_direct_create_of_linked_account_is_rejected(self):
        connection = SyncConnection.objects.create(
            budget_file=self.budget_file, provider=SyncConnection.PROVIDER_SIMPLEFIN
        )
        response = self.client.post(
            "/api/v1/finance/sync-connection-accounts/",
            {"connection": connection.id, "external_account_id": "fake"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    @patch("pft.bank_sync.get_provider")
    def test_sync_action_requires_active_status(self, mock_get_provider):
        connection = SyncConnection.objects.create(
            budget_file=self.budget_file, provider=SyncConnection.PROVIDER_SIMPLEFIN
        )
        response = self.client.post(f"/api/v1/finance/sync-connections/{connection.id}/sync/")
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        mock_get_provider.assert_not_called()

    @patch("pft.bank_sync.get_provider")
    def test_sync_action_runs_inline_under_eager_celery(self, mock_get_provider):
        connection = SyncConnection.objects.create(
            budget_file=self.budget_file,
            provider=SyncConnection.PROVIDER_SIMPLEFIN,
            status=SyncConnection.STATUS_ACTIVE,
        )
        SyncConnectionAccount.objects.create(
            connection=connection, account=self.account, external_account_id="ext-1"
        )
        provider = MagicMock()
        provider.fetch_transactions.return_value = [
            ProviderTransaction(
                external_id="tx-1", transaction_date=date(2026, 3, 1), amount=Decimal("5")
            )
        ]
        mock_get_provider.return_value = provider

        response = self.client.post(f"/api/v1/finance/sync-connections/{connection.id}/sync/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            LedgerTransaction.objects.filter(
                budget_file=self.budget_file, source_type=LedgerTransaction.SOURCE_SYNC
            ).count(),
            1,
        )

    @patch("pft.finance_views.get_provider")
    def test_disconnect_revokes_and_clears_secret(self, mock_get_provider):
        connection = SyncConnection.objects.create(
            budget_file=self.budget_file,
            provider=SyncConnection.PROVIDER_GOCARDLESS,
            status=SyncConnection.STATUS_ACTIVE,
            secret_data=encrypt_json({"requisition_id": "req-1"}),
        )
        provider = MagicMock()
        mock_get_provider.return_value = provider

        response = self.client.post(
            f"/api/v1/finance/sync-connections/{connection.id}/disconnect/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        provider.disconnect.assert_called_once()
        connection.refresh_from_db()
        self.assertEqual(connection.status, SyncConnection.STATUS_REVOKED)
        self.assertEqual(connection.secret_data, "")

    def test_other_user_cannot_see_or_act_on_this_connection(self):
        connection = SyncConnection.objects.create(
            budget_file=self.budget_file, provider=SyncConnection.PROVIDER_SIMPLEFIN
        )
        self.client.force_authenticate(user=self.other_user)

        list_response = self.client.get("/api/v1/finance/sync-connections/")
        self.assertEqual(
            [row["id"] for row in rows(list_response)], []
        )

        detail_response = self.client.get(
            f"/api/v1/finance/sync-connections/{connection.id}/"
        )
        self.assertEqual(detail_response.status_code, status.HTTP_404_NOT_FOUND)

        sync_response = self.client.post(
            f"/api/v1/finance/sync-connections/{connection.id}/sync/"
        )
        self.assertEqual(sync_response.status_code, status.HTTP_404_NOT_FOUND)
