"""Cross-tenant isolation tests.

Every other test module exercises a single user, so nothing verified that user B
cannot reach user A's data. For a self-hosted, multi-user finance app that is the
guarantee that matters most, so it gets its own suite.

Each test is written so that a regression produces a failure naming the exact
endpoint that leaked.
"""

from datetime import date

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from pft.models import (
    Account,
    Budget,
    BudgetFile,
    Category,
    CategoryV2,
    LedgerPosting,
    LedgerTransaction,
    NotificationPreference,
    Payee,
    ScheduledTransaction,
    Transaction,
)
from pft.views import LEGACY_DEPRECATED_AT

User = get_user_model()


class TenantFixture:
    """A user plus the finance objects auto-created for them on signup."""

    def __init__(self, email):
        self.user = User.objects.create_user(
            email=email, username=email, password="StrongPass123!"
        )
        self.budget_file = BudgetFile.objects.get(user=self.user, is_default=True)
        self.account = Account.objects.get(budget_file=self.budget_file, name="Cash")
        self.category_v2 = CategoryV2.objects.filter(
            budget_file=self.budget_file, kind=CategoryV2.KIND_EXPENSE
        ).first()
        self.category = Category.objects.create(
            user=self.user, name=f"Private {email}", type="expense"
        )
        self.transaction = Transaction.objects.create(
            user=self.user,
            title=f"Private transaction for {email}",
            amount="42.00",
            type="expense",
            category=self.category,
            transaction_date=date(2026, 3, 10),
        )
        self.budget = Budget.objects.create(
            user=self.user,
            category=self.category,
            month=3,
            year=2026,
            amount_limit="500.00",
        )
        self.payee = Payee.objects.create(
            budget_file=self.budget_file, name=f"Payee {email}"
        )


class TenantIsolationTestCase(APITestCase):
    def setUp(self):
        self.alice = TenantFixture("alice@example.com")
        self.bob = TenantFixture("bob@example.com")
        self.client.force_authenticate(user=self.bob.user)

    def as_alice(self):
        self.client.force_authenticate(user=self.alice.user)

    def as_bob(self):
        self.client.force_authenticate(user=self.bob.user)


class LegacyApiIsolationTests(TenantIsolationTestCase):
    """/api/v1/* - the transaction/category/budget endpoints."""

    def test_transaction_list_excludes_other_users(self):
        response = self.client.get("/api/v1/transactions/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = {row["id"] for row in response.data["results"]}
        self.assertNotIn(self.alice.transaction.id, returned_ids)
        self.assertIn(self.bob.transaction.id, returned_ids)

    def test_cannot_retrieve_other_users_transaction(self):
        response = self.client.get(f"/api/v1/transactions/{self.alice.transaction.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cannot_update_other_users_transaction(self):
        response = self.client.patch(
            f"/api/v1/transactions/{self.alice.transaction.id}/",
            {"title": "hijacked"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.alice.transaction.refresh_from_db()
        self.assertNotEqual(self.alice.transaction.title, "hijacked")

    def test_cannot_delete_other_users_transaction(self):
        response = self.client.delete(
            f"/api/v1/transactions/{self.alice.transaction.id}/"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(
            Transaction.objects.filter(id=self.alice.transaction.id).exists()
        )

    def test_cannot_reassign_own_transaction_to_another_user(self):
        """Regression: `user` used to be writable, so a PUT could donate a row."""
        response = self.client.put(
            f"/api/v1/transactions/{self.bob.transaction.id}/",
            {
                "user": self.alice.user.id,
                "title": "still mine",
                "amount": "42.00",
                "type": "expense",
                "transaction_date": "2026-03-10",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.bob.transaction.refresh_from_db()
        self.assertEqual(self.bob.transaction.user_id, self.bob.user.id)

    def test_create_transaction_does_not_require_user_field(self):
        response = self.client.post(
            "/api/v1/transactions/",
            {
                "title": "Coffee",
                "amount": "12.34",
                "type": "expense",
                "transaction_date": "2026-03-10",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            Transaction.objects.get(id=response.data["id"]).user_id, self.bob.user.id
        )

    def test_cannot_attach_another_users_category_to_a_transaction(self):
        response = self.client.post(
            "/api/v1/transactions/",
            {
                "title": "Sneaky",
                "amount": "1.00",
                "type": "expense",
                "category": self.alice.category.id,
                "transaction_date": "2026-03-10",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_retrieve_other_users_category(self):
        response = self.client.get(f"/api/v1/categories/{self.alice.category.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cannot_delete_other_users_category(self):
        response = self.client.delete(f"/api/v1/categories/{self.alice.category.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Category.objects.filter(id=self.alice.category.id).exists())

    def test_global_categories_are_readable_but_not_writable(self):
        """Regression: global (user IS NULL) rows were editable by everyone."""
        shared = Category.objects.create(
            user=None, name="Shared Global", type="expense"
        )

        listed = self.client.get("/api/v1/categories/")
        self.assertIn(shared.id, {row["id"] for row in listed.data["results"]})

        for method, kwargs in (
            ("patch", {"data": {"name": "hijacked"}, "format": "json"}),
            ("delete", {}),
        ):
            response = getattr(self.client, method)(
                f"/api/v1/categories/{shared.id}/", **kwargs
            )
            self.assertEqual(
                response.status_code,
                status.HTTP_404_NOT_FOUND,
                msg=f"{method.upper()} on a global category should not be allowed",
            )

        shared.refresh_from_db()
        self.assertEqual(shared.name, "Shared Global")

    def test_renaming_a_category_to_its_own_name_is_allowed(self):
        """Regression: the uniqueness check did not exclude the instance."""
        response = self.client.patch(
            f"/api/v1/categories/{self.bob.category.id}/",
            {"name": self.bob.category.name},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_cannot_retrieve_other_users_budget(self):
        response = self.client.get(f"/api/v1/budgets/{self.alice.budget.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cannot_budget_against_another_users_category(self):
        response = self.client.post(
            "/api/v1/budgets/",
            {
                "category": self.alice.category.id,
                "month": 4,
                "year": 2026,
                "amount_limit": "100.00",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class FinanceApiIsolationTests(TenantIsolationTestCase):
    """/api/v1/finance/* - the double-entry ledger endpoints."""

    def other_tenant_detail_urls(self):
        alice = self.alice
        return {
            "budget-files": f"/api/v1/finance/budget-files/{alice.budget_file.id}/",
            "accounts": f"/api/v1/finance/accounts/{alice.account.id}/",
            "categories": f"/api/v1/finance/categories/{alice.category_v2.id}/",
            "payees": f"/api/v1/finance/payees/{alice.payee.id}/",
        }

    def test_detail_endpoints_hide_other_tenants(self):
        for name, url in self.other_tenant_detail_urls().items():
            with self.subTest(resource=name):
                self.assertEqual(
                    self.client.get(url).status_code,
                    status.HTTP_404_NOT_FOUND,
                )
                self.assertEqual(
                    self.client.delete(url).status_code,
                    status.HTTP_404_NOT_FOUND,
                )

    def test_cannot_query_another_tenants_payee_suggested_category(self):
        """The custom @action isn't covered by other_tenant_detail_urls's get/delete table."""
        response = self.client.get(
            f"/api/v1/finance/payees/{self.alice.payee.id}/suggested-category/"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_list_endpoints_only_return_own_rows(self):
        cases = {
            "budget-files": (self.bob.budget_file.id, self.alice.budget_file.id),
            "accounts": (self.bob.account.id, self.alice.account.id),
            "payees": (self.bob.payee.id, self.alice.payee.id),
        }
        for resource, (mine, theirs) in cases.items():
            with self.subTest(resource=resource):
                response = self.client.get(f"/api/v1/finance/{resource}/")
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                returned = {row["id"] for row in response.data}
                self.assertIn(mine, returned)
                self.assertNotIn(theirs, returned)

    def test_cannot_create_a_transaction_in_another_tenants_budget_file(self):
        payload = {
            "budget_file": self.alice.budget_file.id,
            "transaction_date": "2026-03-10",
            "memo": "Trespassing",
            "postings": [
                {"account": self.alice.account.id, "amount": "-5.00", "sort_order": 0},
                {
                    "category": self.alice.category_v2.id,
                    "amount": "5.00",
                    "sort_order": 1,
                },
            ],
        }
        response = self.client.post(
            "/api/v1/finance/transactions/", payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(
            LedgerTransaction.objects.filter(
                budget_file=self.alice.budget_file
            ).exists()
        )

    def test_bulk_update_cannot_attach_another_tenants_payee(self):
        """Regression: `payee` was applied as a raw id with no ownership check."""
        ledger_tx = LedgerTransaction.objects.create(
            budget_file=self.bob.budget_file,
            transaction_date=date(2026, 3, 10),
            memo="mine",
        )
        response = self.client.post(
            "/api/v1/finance/transactions/bulk-update/",
            {"ids": [ledger_tx.id], "updates": {"payee": self.alice.payee.id}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        ledger_tx.refresh_from_db()
        self.assertIsNone(ledger_tx.payee_id)

    def test_scheduled_transaction_cannot_post_to_another_tenants_account(self):
        """Regression: template account_id/category_id were trusted verbatim."""
        schedule = ScheduledTransaction.objects.create(
            budget_file=self.bob.budget_file,
            name="Rent",
            is_active=True,
            start_date=date(2026, 3, 1),
            next_run_date=date(2026, 3, 1),
            frequency=ScheduledTransaction.FREQ_MONTHLY,
            interval=1,
            transaction_template={
                "memo": "Rent",
                "postings": [
                    {"account_id": self.alice.account.id, "amount": "-100.00"},
                    {"category_id": self.bob.category_v2.id, "amount": "100.00"},
                ],
            },
        )

        response = self.client.post(
            "/api/v1/finance/scheduled-transactions/run-due/",
            {"run_date": "2026-03-02"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(
            LedgerPosting.objects.filter(account=self.alice.account).exists(),
            msg="a schedule wrote a posting into another tenant's account",
        )
        schedule.refresh_from_db()
        self.assertIsNone(schedule.last_run_at)

    def test_report_run_rejects_another_tenants_budget_file(self):
        response = self.client.post(
            "/api/v1/finance/reports/run/",
            {"budget_file": self.alice.budget_file.id, "report_type": "net_worth"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class MalformedInputTests(TenantIsolationTestCase):
    """Bad input should be a 400, never a 500."""

    def test_balances_rejects_a_malformed_date(self):
        response = self.client.get(
            f"/api/v1/finance/budget-files/{self.bob.budget_file.id}/balances/?as_of=not-a-date"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_report_rejects_a_malformed_date(self):
        response = self.client.post(
            "/api/v1/finance/reports/run/",
            {
                "budget_file": self.bob.budget_file.id,
                "report_type": "cash_flow",
                "start_date": "13/13/2026",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_run_due_rejects_a_malformed_date(self):
        response = self.client.post(
            "/api/v1/finance/scheduled-transactions/run-due/",
            {"run_date": "yesterday"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class UnauthenticatedAccessTests(APITestCase):
    """Nothing but registration, tokens, docs and health is public."""

    PROTECTED_URLS = [
        "/api/v1/me/",
        "/api/v1/transactions/",
        "/api/v1/categories/",
        "/api/v1/budgets/",
        "/api/v1/finance/budget-files/",
        "/api/v1/finance/accounts/",
        "/api/v1/finance/categories/",
        "/api/v1/finance/transactions/",
        "/api/v1/finance/postings/",
        "/api/v1/finance/payees/",
        "/api/v1/finance/tags/",
        "/api/v1/finance/budget-months/",
        "/api/v1/finance/envelope-assignments/",
        "/api/v1/finance/scheduled-transactions/",
        "/api/v1/finance/rules/",
        "/api/v1/finance/reports/",
        "/api/v1/finance/exports/",
        "/api/v1/finance/backups/",
        "/api/v1/finance/imports/",
    ]

    def test_protected_endpoints_require_authentication(self):
        for url in self.PROTECTED_URLS:
            with self.subTest(url=url):
                self.assertEqual(
                    self.client.get(url).status_code,
                    status.HTTP_401_UNAUTHORIZED,
                )

    def test_healthz_is_public(self):
        self.assertEqual(self.client.get("/healthz/").status_code, status.HTTP_200_OK)


class LegacyDeprecationTests(TenantIsolationTestCase):
    """The flat v1 resources announce that they are on the way out."""

    LEGACY_URLS = [
        "/api/v1/transactions/",
        "/api/v1/categories/",
        "/api/v1/budgets/",
    ]

    def test_legacy_endpoints_are_marked_deprecated(self):
        for url in self.LEGACY_URLS:
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertEqual(response.headers["Deprecation"], LEGACY_DEPRECATED_AT)
                self.assertIn("successor-version", response.headers["Link"])
                self.assertIn("/api/v1/finance/", response.headers["Link"])

    def test_finance_endpoints_are_not_marked_deprecated(self):
        response = self.client.get("/api/v1/finance/transactions/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("Deprecation", response.headers)


class OrganizationSharingTests(TenantIsolationTestCase):
    """The new boundary: sharing happens through org membership and roles."""

    def add_bob_to_alices_org(self, role):
        from pft.models import Membership

        return Membership.objects.create(
            organization=self.alice.budget_file.organization,
            user=self.bob.user,
            role=role,
        )

    def test_membership_grants_read(self):
        self.add_bob_to_alices_org(role="member")
        response = self.client.get(
            f"/api/v1/finance/accounts/{self.alice.account.id}/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_membership_grants_write(self):
        self.add_bob_to_alices_org(role="member")
        response = self.client.post(
            "/api/v1/finance/transactions/",
            {
                "budget_file": self.alice.budget_file.id,
                "transaction_date": "2026-03-10",
                "memo": "Shared entry",
                "postings": [
                    {"account": self.alice.account.id, "amount": "-5.00", "sort_order": 0},
                    {
                        "category": self.alice.category_v2.id,
                        "amount": "5.00",
                        "sort_order": 1,
                    },
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_viewer_can_read_but_not_write(self):
        self.add_bob_to_alices_org(role="viewer")

        read = self.client.get(f"/api/v1/finance/accounts/{self.alice.account.id}/")
        self.assertEqual(read.status_code, status.HTTP_200_OK)

        write = self.client.post(
            "/api/v1/finance/transactions/",
            {
                "budget_file": self.alice.budget_file.id,
                "transaction_date": "2026-03-10",
                "memo": "Viewer trespass",
                "postings": [
                    {"account": self.alice.account.id, "amount": "-5.00", "sort_order": 0},
                    {
                        "category": self.alice.category_v2.id,
                        "amount": "5.00",
                        "sort_order": 1,
                    },
                ],
            },
            format="json",
        )
        self.assertEqual(write.status_code, status.HTTP_400_BAD_REQUEST)

        delete = self.client.delete(
            f"/api/v1/finance/accounts/{self.alice.account.id}/"
        )
        self.assertEqual(delete.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_membership_still_hides_everything(self):
        # Bob has no membership in Alice's org: unchanged 404s.
        response = self.client.get(
            f"/api/v1/finance/accounts/{self.alice.account.id}/"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_leaving_revokes_access(self):
        membership = self.add_bob_to_alices_org(role="member")
        self.assertEqual(
            self.client.get(
                f"/api/v1/finance/accounts/{self.alice.account.id}/"
            ).status_code,
            status.HTTP_200_OK,
        )
        membership.delete()
        self.assertEqual(
            self.client.get(
                f"/api/v1/finance/accounts/{self.alice.account.id}/"
            ).status_code,
            status.HTTP_404_NOT_FOUND,
        )


class NotificationPreferenceIsolationTests(TenantIsolationTestCase):
    """NotificationPreference has no id in the URL at all - it's always

    get_or_create(user=request.user) - so there is no "guess another user's
    row's id" attack surface the way there is for ledger models. What's worth
    proving instead: Bob's own GET/PATCH never sees or touches Alice's row.
    """

    def test_bob_get_never_returns_alices_preference(self):
        NotificationPreference.objects.create(
            user=self.alice.user, ntfy_topic="alices-secret-topic"
        )

        response = self.client.get("/api/v1/notifications/preferences/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotEqual(response.data["ntfy_topic"], "alices-secret-topic")
        self.assertEqual(
            NotificationPreference.objects.get(user=self.bob.user).ntfy_topic, ""
        )

    def test_bobs_patch_never_touches_alices_row(self):
        alice_preference = NotificationPreference.objects.create(
            user=self.alice.user, webhook_enabled=False
        )

        response = self.client.patch(
            "/api/v1/notifications/preferences/",
            # A literal public IP, not a hostname: resolves without a real DNS
            # query (see is_safe_outbound_url), so this test is deterministic
            # without network access.
            {"webhook_enabled": True, "webhook_url": "https://8.8.8.8/hook"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        alice_preference.refresh_from_db()
        self.assertFalse(alice_preference.webhook_enabled)
