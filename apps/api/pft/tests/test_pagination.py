"""Every list endpoint paginates.

ROADMAP.md Phase 4. Before this only `/api/v1/finance/transactions/` and
`/api/v1/audit-log/` did; everything else returned a bare array, so a large
budget file meant one enormous response and a client with no way to know it had
been handed everything or not.

The list here is deliberately exhaustive rather than a sample: a new resource
shipping unpaginated is exactly the failure this is guarding against, and a
sampled test would not notice. `test_the_route_list_is_complete` fails when a
router gains a resource nobody added here.
"""

from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from pft.finance_routers import router as finance_router
from pft.models import (
    Account,
    Category,
    LedgerPosting,
    LedgerTransaction,
    Membership,
    Organization,
    Payee,
)
from pft.pagination import StandardPagination
from pft.tests.helpers import personal_budget_file

User = get_user_model()

# Every registered finance resource, and whether a plain GET of its list is
# expected to work for an ordinary authenticated user.
FINANCE_LIST_ENDPOINTS = [
    "budget-files",
    "accounts",
    "savings-goals",
    "category-groups",
    "categories",
    "payees",
    "tags",
    "transactions",
    "postings",
    "budget-months",
    "envelope-assignments",
    "scheduled-transactions",
    "rules",
    "reports",
    "exports",
    "backups",
    "imports",
    "sync-connections",
    "sync-connection-accounts",
    "fx-rates",
]

ENVELOPE_KEYS = {"count", "next", "previous", "results"}


class PaginationEnvelopeTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="paging@example.com",
            username="paging@example.com",
            password="StrongPass123!",
        )
        self.client.force_authenticate(user=self.user)
        self.budget_file = personal_budget_file(self.user)

    def test_the_route_list_is_complete(self):
        """Guard against a new resource shipping without a test here."""
        registered = {prefix for prefix, _, _ in finance_router.registry}
        self.assertEqual(registered, set(FINANCE_LIST_ENDPOINTS))

    def test_every_finance_list_returns_the_envelope(self):
        for resource in FINANCE_LIST_ENDPOINTS:
            with self.subTest(resource=resource):
                response = self.client.get(f"/api/v1/finance/{resource}/")
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertEqual(set(response.data.keys()), ENVELOPE_KEYS)
                self.assertIsInstance(response.data["results"], list)

    def test_the_non_finance_lists_do_too(self):
        # /api/v1/audit-log/ is manager-only and covered in test_audit_log.py;
        # orgs is the one every user can reach.
        response = self.client.get("/api/v1/orgs/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), ENVELOPE_KEYS)


class PageBoundaryTests(APITestCase):
    """A list longer than one page, on a resource that used to return all of it."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="many@example.com",
            username="many@example.com",
            password="StrongPass123!",
        )
        self.client.force_authenticate(user=self.user)
        self.budget_file = personal_budget_file(self.user)

        # Payees: cheap to create, and previously unpaginated.
        Payee.objects.bulk_create(
            [
                Payee(budget_file=self.budget_file, name=f"Payee {index:03d}")
                for index in range(120)
            ]
        )

    def test_first_page_is_capped_and_advertises_more(self):
        response = self.client.get("/api/v1/finance/payees/")
        self.assertEqual(response.data["count"], 120)
        self.assertEqual(len(response.data["results"]), StandardPagination.page_size)
        self.assertIsNotNone(response.data["next"])
        self.assertIsNone(response.data["previous"])

    def test_following_next_reaches_every_row_exactly_once(self):
        seen = []
        url = "/api/v1/finance/payees/"
        while url:
            response = self.client.get(url)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            seen.extend(row["id"] for row in response.data["results"])
            url = response.data["next"]

        self.assertEqual(len(seen), 120)
        self.assertEqual(len(set(seen)), 120)

    def test_page_size_is_adjustable_up_to_the_cap(self):
        response = self.client.get("/api/v1/finance/payees/?page_size=120")
        self.assertEqual(len(response.data["results"]), 120)
        self.assertIsNone(response.data["next"])

    def test_page_size_cannot_exceed_the_cap(self):
        response = self.client.get("/api/v1/finance/payees/?page_size=100000")
        self.assertEqual(
            len(response.data["results"]),
            min(120, StandardPagination.max_page_size),
        )

    def test_a_page_past_the_end_is_a_404_not_an_empty_page(self):
        response = self.client.get("/api/v1/finance/payees/?page=99")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class PostingsPaginationTests(APITestCase):
    """Postings are the list most likely to get genuinely large.

    One ledger transaction is at least two of them, so a budget file with a few
    years of history has tens of thousands. This was one of the unpaginated
    ones.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            email="postings@example.com",
            username="postings@example.com",
            password="StrongPass123!",
        )
        self.client.force_authenticate(user=self.user)
        self.budget_file = personal_budget_file(self.user)
        self.account = Account.objects.get(budget_file=self.budget_file, name="Cash")
        self.category = Category.objects.filter(
            budget_file=self.budget_file, kind=Category.KIND_EXPENSE
        ).first()

        for index in range(40):
            transaction = LedgerTransaction.objects.create(
                budget_file=self.budget_file,
                transaction_date="2026-03-01",
                memo=f"Entry {index}",
            )
            LedgerPosting.objects.bulk_create(
                [
                    LedgerPosting(
                        transaction=transaction,
                        account=self.account,
                        amount=Decimal("-1.00"),
                        sort_order=0,
                    ),
                    LedgerPosting(
                        transaction=transaction,
                        category=self.category,
                        amount=Decimal("1.00"),
                        sort_order=1,
                    ),
                ]
            )

    def test_postings_paginate(self):
        response = self.client.get("/api/v1/finance/postings/")
        self.assertEqual(response.data["count"], 80)
        self.assertEqual(len(response.data["results"]), StandardPagination.page_size)
        self.assertIsNotNone(response.data["next"])


class PaginationRespectsTenancyTests(APITestCase):
    """`count` must not leak the size of somebody else's data."""

    def setUp(self):
        self.alice = User.objects.create_user(
            email="alice-page@example.com",
            username="alice-page@example.com",
            password="StrongPass123!",
        )
        self.bob = User.objects.create_user(
            email="bob-page@example.com",
            username="bob-page@example.com",
            password="StrongPass123!",
        )
        alice_file = personal_budget_file(self.alice)
        Payee.objects.bulk_create(
            [
                Payee(budget_file=alice_file, name=f"Alice payee {index}")
                for index in range(75)
            ]
        )

    def test_count_covers_only_what_the_caller_can_read(self):
        self.client.force_authenticate(user=self.bob)
        response = self.client.get("/api/v1/finance/payees/")
        self.assertEqual(response.data["count"], 0)

    def test_a_shared_workspace_is_counted_in(self):
        shared = Organization.objects.create(name="Shared")
        Membership.objects.create(
            organization=shared, user=self.alice, role=Membership.ROLE_OWNER
        )
        Membership.objects.create(
            organization=shared, user=self.bob, role=Membership.ROLE_MEMBER
        )
        # The workspace's budget file seeds its own categories; count those.
        self.client.force_authenticate(user=self.bob)
        before = self.client.get("/api/v1/finance/categories/").data["count"]

        from pft.models import BudgetFile

        BudgetFile.objects.create(
            organization=shared, created_by=self.alice, name="Shared books"
        )

        after = self.client.get("/api/v1/finance/categories/").data["count"]
        self.assertEqual(after, before + 10)
