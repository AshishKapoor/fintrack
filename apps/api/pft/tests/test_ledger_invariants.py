"""The ledger cannot go unbalanced. Proven, not asserted.

Two layers of proof:

1. `DatabaseInvariantTests` bypasses the API entirely and writes through the
   ORM, exactly the way a buggy management command or admin action would. The
   deferred constraint trigger added in migration 0006 must reject the commit.
   These use TransactionTestCase because a deferred constraint only fires at a
   real COMMIT, which TestCase's rollback-based isolation never performs.

2. `LedgerPropertyTests` drives the public API with Hypothesis-generated
   posting sets and asserts the system-wide invariant afterwards: every stored
   transaction's postings sum to zero, and every account balance equals its
   opening balance plus the sum of its postings.
"""

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models import Sum
from django.test import TransactionTestCase
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st
from hypothesis.extra.django import TestCase as HypothesisTestCase
from rest_framework import status
from rest_framework.test import APIClient

from pft.models import Account, Category, LedgerPosting, LedgerTransaction
from pft.tests.helpers import personal_budget_file

User = get_user_model()

AMOUNTS = st.decimals(
    min_value=Decimal("-99999.99"),
    max_value=Decimal("99999.99"),
    places=2,
).filter(lambda d: d != 0)


def make_user(email):
    return User.objects.create_user(
        email=email, username=email, password="StrongPass123!"
    )


class DatabaseInvariantTests(TransactionTestCase):
    """Writes that bypass the serializer must still be unable to unbalance."""

    def setUp(self):
        self.user = make_user("invariant@example.com")
        self.budget_file = personal_budget_file(self.user)
        self.account = Account.objects.get(budget_file=self.budget_file, name="Cash")
        self.category = Category.objects.filter(
            budget_file=self.budget_file, kind=Category.KIND_EXPENSE
        ).first()

    def test_balanced_orm_write_commits(self):
        with transaction.atomic():
            tx = LedgerTransaction.objects.create(
                budget_file=self.budget_file, transaction_date="2026-03-10", memo="ok"
            )
            LedgerPosting.objects.create(
                transaction=tx, account=self.account, amount=Decimal("-5")
            )
            LedgerPosting.objects.create(
                transaction=tx, category=self.category, amount=Decimal("5")
            )
        self.assertEqual(tx.postings.count(), 2)

    def test_unbalanced_orm_write_is_rejected_at_commit(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                tx = LedgerTransaction.objects.create(
                    budget_file=self.budget_file,
                    transaction_date="2026-03-10",
                    memo="bad",
                )
                LedgerPosting.objects.create(
                    transaction=tx, account=self.account, amount=Decimal("-5")
                )
                # No second leg: the deferred trigger fires when the atomic
                # block commits, not at the INSERT.
        self.assertFalse(LedgerTransaction.objects.filter(memo="bad").exists())

    def test_deleting_one_leg_is_rejected(self):
        with transaction.atomic():
            tx = LedgerTransaction.objects.create(
                budget_file=self.budget_file, transaction_date="2026-03-10", memo="pair"
            )
            LedgerPosting.objects.create(
                transaction=tx, account=self.account, amount=Decimal("-7")
            )
            leg = LedgerPosting.objects.create(
                transaction=tx, category=self.category, amount=Decimal("7")
            )

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                leg.delete()

        self.assertEqual(
            tx.postings.count(), 2, "the delete must have been rolled back"
        )

    def test_amending_one_leg_is_rejected(self):
        with transaction.atomic():
            tx = LedgerTransaction.objects.create(
                budget_file=self.budget_file,
                transaction_date="2026-03-10",
                memo="amend",
            )
            LedgerPosting.objects.create(
                transaction=tx, account=self.account, amount=Decimal("-7")
            )
            leg = LedgerPosting.objects.create(
                transaction=tx, category=self.category, amount=Decimal("7")
            )

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                leg.amount = Decimal("8")
                leg.save(update_fields=["amount"])

    def test_deleting_the_whole_transaction_is_allowed(self):
        with transaction.atomic():
            tx = LedgerTransaction.objects.create(
                budget_file=self.budget_file,
                transaction_date="2026-03-10",
                memo="whole",
            )
            LedgerPosting.objects.create(
                transaction=tx, account=self.account, amount=Decimal("-3")
            )
            LedgerPosting.objects.create(
                transaction=tx, category=self.category, amount=Decimal("3")
            )

        with transaction.atomic():
            tx.delete()  # cascade removes both postings together: still balanced

        self.assertFalse(LedgerTransaction.objects.filter(memo="whole").exists())


class LedgerPropertyTests(HypothesisTestCase):
    """API-level property: whatever the client sends, the ledger stays balanced."""

    @classmethod
    def setUpTestData(cls):
        cls.user = make_user("property@example.com")
        cls.budget_file = personal_budget_file(cls.user)
        cls.account = Account.objects.get(budget_file=cls.budget_file, name="Cash")
        cls.category = Category.objects.filter(
            budget_file=cls.budget_file, kind=Category.KIND_EXPENSE
        ).first()

    def api(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        return client

    def assert_globally_balanced(self):
        unbalanced = (
            LedgerTransaction.objects.annotate(total=Sum("postings__amount"))
            .exclude(total=None)
            .exclude(total=Decimal("0"))
        )
        self.assertQuerySetEqual(unbalanced, [], msg="unbalanced transactions exist")

        for account in Account.objects.all():
            derived = account.opening_balance + (
                account.ledger_postings.aggregate(total=Sum("amount"))["total"]
                or Decimal("0")
            )
            self.assertEqual(
                Decimal(account.current_balance),
                derived,
                msg=f"balance drifted for account {account.id}",
            )

    @settings(
        max_examples=25, deadline=None, suppress_health_check=[HealthCheck.too_slow]
    )
    @given(amount=AMOUNTS)
    def test_balanced_pairs_always_accepted(self, amount):
        response = self.api().post(
            "/api/v1/finance/transactions/",
            {
                "budget_file": self.budget_file.id,
                "transaction_date": "2026-03-10",
                "memo": "prop",
                "postings": [
                    {"account": self.account.id, "amount": str(-amount)},
                    {"category": self.category.id, "amount": str(amount)},
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assert_globally_balanced()

    @settings(
        max_examples=25, deadline=None, suppress_health_check=[HealthCheck.too_slow]
    )
    @given(amount=AMOUNTS, skew=AMOUNTS)
    def test_unbalanced_pairs_always_rejected(self, amount, skew):
        response = self.api().post(
            "/api/v1/finance/transactions/",
            {
                "budget_file": self.budget_file.id,
                "transaction_date": "2026-03-10",
                "memo": "skewed",
                "postings": [
                    {"account": self.account.id, "amount": str(-amount)},
                    {"category": self.category.id, "amount": str(amount + skew)},
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(LedgerTransaction.objects.filter(memo="skewed").exists())
        self.assert_globally_balanced()

    @settings(
        max_examples=10, deadline=None, suppress_health_check=[HealthCheck.too_slow]
    )
    @given(amounts=st.lists(AMOUNTS, min_size=2, max_size=6))
    def test_multi_leg_transactions_hold_the_invariant(self, amounts):
        """A split across several categories balances against one account leg."""
        legs = [{"category": self.category.id, "amount": str(a)} for a in amounts]
        legs.append({"account": self.account.id, "amount": str(-sum(amounts))})

        response = self.api().post(
            "/api/v1/finance/transactions/",
            {
                "budget_file": self.budget_file.id,
                "transaction_date": "2026-03-10",
                "memo": "split",
                "postings": legs,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assert_globally_balanced()
