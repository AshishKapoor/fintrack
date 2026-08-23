"""Tests for the public demo instance's read-only enforcement.

See pft/demo_mode.py and ROADMAP.md's "Live demo instance" item. Off by
default (FINTRACK_DEMO_MODE=False), so every other test in the suite runs
against completely normal behaviour and never has to know this exists.
"""

from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from pft.models import Account, BudgetFile

User = get_user_model()
PASSWORD = "StrongPass123!"


@override_settings(FINTRACK_DEMO_MODE=True)
class DemoModeTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="demo-visitor@example.com",
            username="demo-visitor@example.com",
            password=PASSWORD,
        )
        self.budget_file = BudgetFile.objects.get(user=self.user, is_default=True)
        self.account = Account.objects.get(budget_file=self.budget_file, name="Cash")
        self.client.force_authenticate(user=self.user)

    def test_reads_still_work(self):
        response = self.client.get("/api/v1/finance/accounts/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_running_an_adhoc_report_still_works(self):
        # POST but read-only (see ReportViewSet.run_adhoc) - the dashboard's
        # own charts depend on this exact call working in demo mode.
        response = self.client.post(
            "/api/v1/finance/reports/run/",
            {"budget_file": self.budget_file.id, "report_type": "net_worth"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_running_a_saved_report_still_works(self):
        from pft.models import SavedReport

        saved = SavedReport.objects.create(
            budget_file=self.budget_file,
            name="Test report",
            report_type="net_worth",
            definition={},
        )
        response = self.client.post(f"/api/v1/finance/reports/{saved.id}/run/", {})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_creating_a_saved_report_is_still_refused(self):
        # Only the read-only "run" action is allowed - saving one for later
        # is a real write.
        response = self.client.post(
            "/api/v1/finance/reports/",
            {
                "budget_file": self.budget_file.id,
                "name": "Trespass",
                "report_type": "net_worth",
                "definition": {},
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_writes_are_refused(self):
        response = self.client.post(
            "/api/v1/finance/accounts/",
            {
                "budget_file": self.budget_file.id,
                "name": "Trespass",
                "type": "checking",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("read-only demo", response.json()["detail"])

    def test_updates_and_deletes_are_also_refused(self):
        for method in ("put", "patch", "delete"):
            response = getattr(self.client, method)(
                f"/api/v1/finance/accounts/{self.account.id}/", {}, format="json"
            )
            self.assertEqual(
                response.status_code, status.HTTP_403_FORBIDDEN, msg=method
            )

    def test_registration_is_refused(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(
            "/api/v1/register/",
            {
                "email": "new-visitor@example.com",
                "password": PASSWORD,
                "confirm_password": PASSWORD,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(User.objects.filter(email="new-visitor@example.com").exists())

    def test_signing_in_still_works(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(
            "/api/token/",
            {"email": self.user.email, "password": PASSWORD},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_the_admin_is_entirely_unreachable(self):
        self.client.force_authenticate(user=None)
        get_response = self.client.get("/admin/login/")
        post_response = self.client.post(
            "/admin/login/", {"username": "x", "password": "y"}
        )
        self.assertEqual(get_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(post_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_healthz_reports_demo_mode(self):
        response = self.client.get("/healthz/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertTrue(body["demo"])
        self.assertEqual(body["demo_email"], "demo@fintrack.local")


class DemoModeOffByDefaultTests(APITestCase):
    """The default (FINTRACK_DEMO_MODE=False) behind everything else in the suite."""

    def test_healthz_reports_demo_false_by_default(self):
        response = self.client.get("/healthz/")
        body = response.json()
        self.assertFalse(body["demo"])
        self.assertNotIn("demo_email", body)

    def test_registration_works_normally(self):
        response = self.client.post(
            "/api/v1/register/",
            {
                "email": "normal-visitor@example.com",
                "password": PASSWORD,
                "confirm_password": PASSWORD,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
