"""Budget files belong to an organization, and "default" belongs to a person.

ROADMAP.md Phase 4's `BudgetFile.user` -> organization item. Migration 0019
finished the expand/contract: `organization` is NOT NULL, `user` is gone, and
the default-file choice moved to `Membership.default_budget_file`.

Three real bugs fell out of the old shape, and each has a test here:

- `set-default` cleared `is_default` across every budget file the caller could
  see, so one member of a shared workspace picking a default silently changed
  it for everyone else - and for the caller's other workspaces too.
- `EnvelopeAssignmentSerializer` compared `budget_file.user_id` to the caller,
  so a member of a shared workspace could not touch an envelope in a file
  somebody else had created there, despite having write access to everything
  around it.
- `BudgetFile.user` was ON DELETE CASCADE, so the person who first created a
  shared workspace's budget file took the whole workspace's books with them
  when they closed their account.
"""

from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from pft.models import BudgetFile, Category, Membership, Organization
from pft.tenancy import default_budget_file, personal_organization
from pft.tests.helpers import personal_budget_file

User = get_user_model()

PASSWORD = "StrongPass123!"


def make_user(email):
    return User.objects.create_user(email=email, username=email, password=PASSWORD)


class BudgetFileShapeTests(APITestCase):
    def test_signup_leaves_no_organizationless_budget_file(self):
        user = make_user("shape@example.com")
        budget_file = personal_budget_file(user)

        self.assertIsNotNone(budget_file.organization_id)
        self.assertTrue(budget_file.organization.personal)
        self.assertEqual(budget_file.created_by_id, user.id)

    def test_the_signup_file_is_the_membership_default(self):
        user = make_user("shape2@example.com")
        membership = Membership.objects.get(user=user)

        self.assertEqual(
            membership.default_budget_file_id, personal_budget_file(user).id
        )

    def test_created_by_is_provenance_not_access(self):
        """A file's creator has no special claim on it, and losing them is fine."""
        owner = make_user("creator@example.com")
        organization = personal_organization(owner)
        budget_file = BudgetFile.objects.create(
            organization=organization, created_by=None, name="Nobody made this"
        )

        self.client.force_authenticate(user=owner)
        response = self.client.get(f"/api/v1/finance/budget-files/{budget_file.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class SharedWorkspaceFixture(APITestCase):
    def setUp(self):
        self.alice = make_user("alice-bf@example.com")
        self.bob = make_user("bob-bf@example.com")

        self.shared = Organization.objects.create(name="Household")
        Membership.objects.create(
            organization=self.shared, user=self.alice, role=Membership.ROLE_OWNER
        )
        Membership.objects.create(
            organization=self.shared, user=self.bob, role=Membership.ROLE_MEMBER
        )
        self.shared_file = BudgetFile.objects.create(
            organization=self.shared, created_by=self.alice, name="Household books"
        )
        self.second_shared_file = BudgetFile.objects.create(
            organization=self.shared, created_by=self.alice, name="Holiday fund"
        )


class DefaultBudgetFileIsPerPersonTests(SharedWorkspaceFixture):
    def _set_default(self, user, budget_file):
        self.client.force_authenticate(user=user)
        return self.client.post(
            f"/api/v1/finance/budget-files/{budget_file.id}/set-default/"
        )

    def test_one_members_choice_does_not_move_anothers(self):
        self.assertEqual(
            self._set_default(self.alice, self.shared_file).status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            self._set_default(self.bob, self.second_shared_file).status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            default_budget_file(self.alice, self.shared).id, self.shared_file.id
        )
        self.assertEqual(
            default_budget_file(self.bob, self.shared).id, self.second_shared_file.id
        )

    def test_choosing_in_one_workspace_leaves_the_other_alone(self):
        personal = personal_budget_file(self.alice)
        self._set_default(self.alice, self.second_shared_file)

        self.assertEqual(
            default_budget_file(self.alice, personal_organization(self.alice)).id,
            personal.id,
        )

    def test_is_default_is_reported_from_the_callers_own_choice(self):
        self._set_default(self.alice, self.shared_file)
        self._set_default(self.bob, self.second_shared_file)

        def defaults_for(user):
            self.client.force_authenticate(user=user)
            response = self.client.get("/api/v1/finance/budget-files/")
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            rows = (
                response.data["results"]
                if "results" in response.data
                else response.data
            )
            return {row["id"] for row in rows if row["is_default"]}

        self.assertIn(self.shared_file.id, defaults_for(self.alice))
        self.assertNotIn(self.second_shared_file.id, defaults_for(self.alice))
        self.assertIn(self.second_shared_file.id, defaults_for(self.bob))
        self.assertNotIn(self.shared_file.id, defaults_for(self.bob))

    def test_a_non_member_cannot_adopt_a_file_as_their_default(self):
        outsider = make_user("outsider@example.com")
        self.client.force_authenticate(user=outsider)
        response = self.client.post(
            f"/api/v1/finance/budget-files/{self.shared_file.id}/set-default/"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_deleting_the_chosen_file_does_not_evict_the_member(self):
        self._set_default(self.bob, self.second_shared_file)
        self.second_shared_file.delete()

        membership = Membership.objects.get(organization=self.shared, user=self.bob)
        self.assertIsNone(membership.default_budget_file_id)
        # And the fallback still lands somewhere usable.
        self.assertEqual(
            default_budget_file(self.bob, self.shared).id, self.shared_file.id
        )


class EnvelopeWritesFollowMembershipTests(SharedWorkspaceFixture):
    def test_a_member_can_budget_in_a_file_someone_else_created(self):
        self.client.force_authenticate(user=self.bob)

        # Seeded by the budget file's own post_save, same as any new workspace.
        category = Category.objects.get(budget_file=self.shared_file, name="Groceries")
        month = self.client.post(
            "/api/v1/finance/budget-months/",
            {"budget_file": self.shared_file.id, "year": 2026, "month": 4},
            format="json",
        )
        self.assertEqual(month.status_code, status.HTTP_201_CREATED)

        response = self.client.post(
            "/api/v1/finance/envelope-assignments/",
            {
                "budget_month": month.data["id"],
                "category": category.id,
                "assigned_amount": "250.00",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(response.data["assigned_amount"]), Decimal("250.00"))

    def test_a_viewer_still_cannot(self):
        viewer = make_user("viewer-bf@example.com")
        Membership.objects.create(
            organization=self.shared, user=viewer, role=Membership.ROLE_VIEWER
        )
        category = Category.objects.get(budget_file=self.shared_file, name="Housing")

        self.client.force_authenticate(user=self.alice)
        month = self.client.post(
            "/api/v1/finance/budget-months/",
            {"budget_file": self.shared_file.id, "year": 2026, "month": 5},
            format="json",
        )

        self.client.force_authenticate(user=viewer)
        response = self.client.post(
            "/api/v1/finance/envelope-assignments/",
            {
                "budget_month": month.data["id"],
                "category": category.id,
                "assigned_amount": "900.00",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class AccountDeletionRespectsTheWorkspaceTests(SharedWorkspaceFixture):
    def test_the_creator_leaving_does_not_take_the_shared_books(self):
        self.alice.delete()

        self.shared_file.refresh_from_db()
        self.assertIsNone(self.shared_file.created_by_id)
        self.assertTrue(Organization.objects.filter(pk=self.shared.pk).exists())
        self.assertTrue(BudgetFile.objects.filter(pk=self.shared_file.pk).exists())

    def test_the_last_member_leaving_takes_the_workspace_with_them(self):
        alice_personal = personal_budget_file(self.alice)
        self.bob.delete()
        self.alice.delete()

        self.assertFalse(Organization.objects.filter(pk=self.shared.pk).exists())
        self.assertFalse(BudgetFile.objects.filter(pk=self.shared_file.pk).exists())
        self.assertFalse(BudgetFile.objects.filter(pk=alice_personal.pk).exists())
