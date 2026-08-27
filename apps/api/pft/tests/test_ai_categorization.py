import json
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from pft.ai_categorization import suggest_category_via_ai
from pft.models import Account, AICategorizationSettings, BudgetFile, Category, Payee
from pft.notifications import is_safe_local_service_url

User = get_user_model()


def _response(payload):
    cm = MagicMock()
    cm.__enter__.return_value = MagicMock(
        read=MagicMock(return_value=json.dumps(payload).encode("utf-8"))
    )
    return cm


def _chat_completion(content):
    return _response({"choices": [{"message": {"content": content}}]})


class IsSafeLocalServiceUrlTests(TestCase):
    """The relaxed SSRF guard for Ollama - is_safe_outbound_url itself is
    untouched and keeps its own existing test coverage; these only cover the
    new sibling function's narrower allow-list."""

    def test_loopback_is_allowed(self):
        self.assertTrue(is_safe_local_service_url("http://127.0.0.1:11434/v1"))

    def test_private_network_is_allowed(self):
        self.assertTrue(is_safe_local_service_url("http://192.168.1.50:11434/v1"))

    def test_link_local_is_still_rejected(self):
        # Covers the cloud metadata endpoint shape (169.254.169.254).
        self.assertFalse(is_safe_local_service_url("http://169.254.169.254/v1"))

    def test_non_http_scheme_is_rejected(self):
        self.assertFalse(is_safe_local_service_url("ftp://127.0.0.1/v1"))

    def test_unresolvable_host_is_rejected(self):
        self.assertFalse(is_safe_local_service_url("http://this-host-does-not-resolve.invalid/v1"))


class SuggestCategoryViaAiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="ai-user@example.com", username="ai-user@example.com", password="StrongPass123!"
        )
        self.budget_file = BudgetFile.objects.get(user=self.user, is_default=True)
        self.candidates = [{"id": 1, "name": "Groceries"}, {"id": 2, "name": "Rent"}]

    def _settings(self, **overrides):
        defaults = {
            "budget_file": self.budget_file,
            "is_enabled": True,
            "provider": AICategorizationSettings.PROVIDER_OPENAI_COMPATIBLE,
        }
        defaults.update(overrides)
        settings_obj = AICategorizationSettings.objects.create(**defaults)
        if settings_obj.provider == AICategorizationSettings.PROVIDER_OPENAI_COMPATIBLE:
            settings_obj.encrypted_api_key = _encrypt_key("sk-test")
            settings_obj.save(update_fields=["encrypted_api_key"])
        return settings_obj

    @patch("pft.ai_categorization.urllib.request.urlopen")
    def test_returns_the_matching_candidate(self, mock_urlopen):
        mock_urlopen.return_value = _chat_completion("Groceries")
        settings_obj = self._settings()
        result = suggest_category_via_ai(settings_obj, "Trader Joe's", self.candidates)
        self.assertEqual(result, {"id": 1, "name": "Groceries"})

    @patch("pft.ai_categorization.urllib.request.urlopen")
    def test_none_sentinel_means_no_suggestion(self, mock_urlopen):
        mock_urlopen.return_value = _chat_completion("NONE")
        settings_obj = self._settings()
        result = suggest_category_via_ai(settings_obj, "Some Payee", self.candidates)
        self.assertIsNone(result)

    @patch("pft.ai_categorization.urllib.request.urlopen")
    def test_a_hallucinated_category_is_never_trusted(self, mock_urlopen):
        mock_urlopen.return_value = _chat_completion("Yacht Maintenance")
        settings_obj = self._settings()
        result = suggest_category_via_ai(settings_obj, "Some Payee", self.candidates)
        self.assertIsNone(result)

    @patch("pft.ai_categorization.urllib.request.urlopen")
    def test_disabled_settings_never_call_out(self, mock_urlopen):
        settings_obj = self._settings(is_enabled=False)
        result = suggest_category_via_ai(settings_obj, "Some Payee", self.candidates)
        self.assertIsNone(result)
        mock_urlopen.assert_not_called()

    @patch("pft.ai_categorization.urllib.request.urlopen")
    def test_no_candidates_never_calls_out(self, mock_urlopen):
        settings_obj = self._settings()
        result = suggest_category_via_ai(settings_obj, "Some Payee", [])
        self.assertIsNone(result)
        mock_urlopen.assert_not_called()

    @patch("pft.ai_categorization.urllib.request.urlopen")
    def test_cloud_provider_with_no_key_never_calls_out(self, mock_urlopen):
        settings_obj = AICategorizationSettings.objects.create(
            budget_file=self.budget_file,
            is_enabled=True,
            provider=AICategorizationSettings.PROVIDER_OPENAI_COMPATIBLE,
        )  # encrypted_api_key left blank
        result = suggest_category_via_ai(settings_obj, "Some Payee", self.candidates)
        self.assertIsNone(result)
        mock_urlopen.assert_not_called()

    @patch("pft.ai_categorization.urllib.request.urlopen")
    def test_ollama_needs_no_api_key_and_sends_no_auth_header(self, mock_urlopen):
        mock_urlopen.return_value = _chat_completion("Rent")
        settings_obj = self._settings(
            provider=AICategorizationSettings.PROVIDER_OLLAMA,
            base_url="http://127.0.0.1:11434/v1",
        )
        result = suggest_category_via_ai(settings_obj, "Landlord", self.candidates)
        self.assertEqual(result, {"id": 2, "name": "Rent"})
        sent_request = mock_urlopen.call_args[0][0]
        self.assertNotIn("Authorization", sent_request.headers)

    @patch("pft.ai_categorization.urllib.request.urlopen")
    def test_a_cloud_provider_pointed_at_a_private_address_is_blocked(self, mock_urlopen):
        settings_obj = self._settings(base_url="http://192.168.1.50:8080/v1")
        result = suggest_category_via_ai(settings_obj, "Some Payee", self.candidates)
        self.assertIsNone(result)
        mock_urlopen.assert_not_called()

    @patch("pft.ai_categorization.urllib.request.urlopen")
    def test_network_failure_returns_none_not_a_raised_exception(self, mock_urlopen):
        mock_urlopen.side_effect = OSError("connection refused")
        settings_obj = self._settings()
        result = suggest_category_via_ai(settings_obj, "Some Payee", self.candidates)
        self.assertIsNone(result)


def _encrypt_key(raw_key):
    from pft.crypto import encrypt_json

    return encrypt_json({"api_key": raw_key})


class AICategorizationSettingsApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="ai-settings-user@example.com",
            username="ai-settings-user@example.com",
            password="StrongPass123!",
        )
        self.client.force_authenticate(user=self.user)
        self.budget_file = BudgetFile.objects.get(user=self.user, is_default=True)

    def test_get_creates_lazily_with_sensible_defaults(self):
        self.assertFalse(AICategorizationSettings.objects.filter(budget_file=self.budget_file).exists())
        response = self.client.get(
            f"/api/v1/finance/ai-categorization/settings/?budget_file={self.budget_file.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_enabled"])
        self.assertFalse(response.data["has_api_key"])
        self.assertTrue(AICategorizationSettings.objects.filter(budget_file=self.budget_file).exists())

    def test_the_encrypted_key_field_never_appears_in_a_response(self):
        AICategorizationSettings.objects.create(
            budget_file=self.budget_file, encrypted_api_key=_encrypt_key("sk-secret")
        )
        response = self.client.get(
            f"/api/v1/finance/ai-categorization/settings/?budget_file={self.budget_file.id}"
        )
        self.assertNotIn("encrypted_api_key", response.data)
        self.assertNotIn("sk-secret", json.dumps(response.data))
        self.assertTrue(response.data["has_api_key"])

    def test_set_api_key_then_clear_it(self):
        set_response = self.client.post(
            "/api/v1/finance/ai-categorization/set-api-key/",
            {"budget_file": self.budget_file.id, "api_key": "sk-abc123"},
            format="json",
        )
        self.assertEqual(set_response.status_code, status.HTTP_200_OK)
        self.assertTrue(set_response.data["has_api_key"])
        self.assertNotIn("sk-abc123", json.dumps(set_response.data))

        settings_obj = AICategorizationSettings.objects.get(budget_file=self.budget_file)
        self.assertNotEqual(settings_obj.encrypted_api_key, "")
        self.assertNotIn("sk-abc123", settings_obj.encrypted_api_key)

        clear_response = self.client.post(
            "/api/v1/finance/ai-categorization/set-api-key/",
            {"budget_file": self.budget_file.id, "api_key": ""},
            format="json",
        )
        self.assertFalse(clear_response.data["has_api_key"])

    def test_updating_provider_and_toggling_enabled(self):
        response = self.client.patch(
            f"/api/v1/finance/ai-categorization/settings/?budget_file={self.budget_file.id}",
            {"is_enabled": True, "provider": "ollama", "base_url": "http://127.0.0.1:11434/v1"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertTrue(response.data["is_enabled"])
        self.assertEqual(response.data["provider"], "ollama")

    def test_a_cloud_base_url_pointed_at_a_private_address_is_rejected(self):
        response = self.client.patch(
            f"/api/v1/finance/ai-categorization/settings/?budget_file={self.budget_file.id}",
            {"provider": "openai_compatible", "base_url": "http://192.168.1.1/v1"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_the_same_private_address_is_accepted_for_ollama(self):
        response = self.client.patch(
            f"/api/v1/finance/ai-categorization/settings/?budget_file={self.budget_file.id}",
            {"provider": "ollama", "base_url": "http://192.168.1.1:11434/v1"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

    def test_missing_budget_file_param_is_a_clean_400(self):
        response = self.client.get("/api/v1/finance/ai-categorization/settings/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class SuggestedCategoryAiFallbackTests(APITestCase):
    """PayeeViewSet.suggested_category's AI fallback - history always wins
    when it exists; AI is only ever consulted for a payee with none."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="fallback-user@example.com",
            username="fallback-user@example.com",
            password="StrongPass123!",
        )
        self.client.force_authenticate(user=self.user)
        self.budget_file = BudgetFile.objects.get(user=self.user, is_default=True)
        self.account = Account.objects.get(budget_file=self.budget_file, name="Cash")
        self.groceries = Category.objects.filter(
            budget_file=self.budget_file, kind=Category.KIND_EXPENSE, name="Groceries"
        ).first()
        self.payee = Payee.objects.create(budget_file=self.budget_file, name="New Payee")

    def test_no_history_no_ai_configured_returns_nothing(self):
        response = self.client.get(f"/api/v1/finance/payees/{self.payee.id}/suggested-category/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["category"])
        self.assertIsNone(response.data["source"])

    @patch("pft.finance_views.suggest_category_via_ai")
    def test_no_history_ai_enabled_returns_ai_suggestion(self, mock_suggest):
        mock_suggest.return_value = {"id": self.groceries.id, "name": "Groceries"}
        AICategorizationSettings.objects.create(budget_file=self.budget_file, is_enabled=True)

        response = self.client.get(f"/api/v1/finance/payees/{self.payee.id}/suggested-category/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["category"], self.groceries.id)
        self.assertEqual(response.data["source"], "ai")

    @patch("pft.finance_views.suggest_category_via_ai")
    def test_existing_history_is_never_overridden_by_ai(self, mock_suggest):
        AICategorizationSettings.objects.create(budget_file=self.budget_file, is_enabled=True)
        self.client.post(
            "/api/v1/finance/transactions/",
            {
                "budget_file": self.budget_file.id,
                "transaction_date": "2026-01-05",
                "payee": self.payee.id,
                "postings": [
                    {"account": self.account.id, "amount": "-10.00"},
                    {"category": self.groceries.id, "amount": "10.00"},
                ],
            },
            format="json",
        )

        response = self.client.get(f"/api/v1/finance/payees/{self.payee.id}/suggested-category/")
        self.assertEqual(response.data["source"], "history")
        mock_suggest.assert_not_called()
