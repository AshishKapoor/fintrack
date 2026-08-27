"""The audit log: written on mutation, readable by managers only."""

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from pft.models import AuditLog, BudgetFile, Category, Organization

User = get_user_model()

PASSWORD = "StrongPass123!"


def make_user(email):
    return User.objects.create_user(email=email, username=email, password=PASSWORD)


class AuditWritingTests(APITestCase):
    def setUp(self):
        self.owner = make_user("audit-owner@example.com")
        self.client.force_authenticate(user=self.owner)
        self.org = Organization.objects.get(memberships__user=self.owner)
        self.budget_file = BudgetFile.objects.get(user=self.owner, is_default=True)
        self.category = Category.objects.filter(budget_file=self.budget_file).first()

    def test_finance_mutations_are_recorded(self):
        response = self.client.post(
            "/api/v1/finance/payees/",
            {"budget_file": self.budget_file.id, "name": "Audited Grocer"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        entry = AuditLog.objects.filter(
            organization=self.org, entity_type="Payee"
        ).first()
        self.assertIsNotNone(entry)
        self.assertEqual(entry.action, AuditLog.ACTION_CREATED)
        self.assertEqual(entry.actor_email, "audit-owner@example.com")
        self.assertIn("Audited Grocer", entry.summary)

    def test_deletes_capture_the_name_before_it_is_gone(self):
        create = self.client.post(
            "/api/v1/finance/payees/",
            {"budget_file": self.budget_file.id, "name": "Doomed Payee"},
            format="json",
        )
        self.client.delete(f"/api/v1/finance/payees/{create.data['id']}/")

        entry = AuditLog.objects.filter(
            organization=self.org,
            entity_type="Payee",
            action=AuditLog.ACTION_DELETED,
        ).first()
        self.assertIsNotNone(entry)
        self.assertIn("Doomed", entry.summary)

    def test_membership_changes_are_recorded(self):
        invitee = make_user("audit-joiner@example.com")
        org_response = self.client.post("/api/v1/orgs/", {"name": "Audit Co"}, format="json")
        org_id = org_response.data["id"]
        invited = self.client.post(
            f"/api/v1/orgs/{org_id}/invitations/",
            {"email": "audit-joiner@example.com", "role": "member"},
            format="json",
        )
        self.client.force_authenticate(user=invitee)
        self.client.post(
            "/api/v1/orgs/accept-invitation/",
            {"token": invited.data["token"]},
            format="json",
        )

        summaries = list(
            AuditLog.objects.filter(organization_id=org_id).values_list(
                "summary", flat=True
            )
        )
        self.assertTrue(any("Invited audit-joiner@example.com" in item for item in summaries))
        self.assertTrue(any("joined as member" in item for item in summaries))


class AuditReadingTests(APITestCase):
    def setUp(self):
        self.owner = make_user("reader-owner@example.com")
        self.member = make_user("reader-member@example.com")
        self.client.force_authenticate(user=self.owner)

        org_response = self.client.post("/api/v1/orgs/", {"name": "Readers"}, format="json")
        self.org_id = org_response.data["id"]
        invited = self.client.post(
            f"/api/v1/orgs/{self.org_id}/invitations/",
            {"email": "reader-member@example.com", "role": "member"},
            format="json",
        )
        self.client.force_authenticate(user=self.member)
        self.client.post(
            "/api/v1/orgs/accept-invitation/",
            {"token": invited.data["token"]},
            format="json",
        )
        self.client.force_authenticate(user=self.owner)

    def test_owner_reads_the_log(self):
        response = self.client.get(f"/api/v1/audit-log/?organization={self.org_id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["count"], 1)

    def test_plain_member_sees_nothing(self):
        self.client.force_authenticate(user=self.member)
        response = self.client.get(f"/api/v1/audit-log/?organization={self.org_id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)

    def test_csv_export(self):
        response = self.client.get(
            f"/api/v1/audit-log/export/?organization={self.org_id}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "text/csv")
        body = response.content.decode()
        self.assertIn("timestamp,actor,action", body)
        self.assertIn("Invited reader-member@example.com", body)

    def test_no_write_surface_exists(self):
        response = self.client.post(
            "/api/v1/audit-log/", {"summary": "forged"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
