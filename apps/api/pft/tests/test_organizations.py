"""Organizations: the management surface for the tenancy boundary."""

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from pft.models import Invitation, Membership, Organization
from pft.tests.helpers import personal_budget_file

User = get_user_model()

PASSWORD = "StrongPass123!"


def make_user(email):
    return User.objects.create_user(email=email, username=email, password=PASSWORD)


class PersonalOrganizationTests(APITestCase):
    def test_signup_creates_a_personal_org_with_ownership(self):
        user = make_user("solo@example.com")
        organization = Organization.objects.get(memberships__user=user)
        self.assertTrue(organization.personal)
        membership = Membership.objects.get(organization=organization, user=user)
        self.assertEqual(membership.role, Membership.ROLE_OWNER)

    def test_budget_file_joins_the_personal_org(self):
        user = make_user("solo2@example.com")
        budget_file = personal_budget_file(user)
        self.assertIsNotNone(budget_file.organization)
        self.assertTrue(budget_file.organization.personal)

    def test_personal_org_cannot_be_deleted(self):
        user = make_user("solo3@example.com")
        self.client.force_authenticate(user=user)
        organization = Organization.objects.get(memberships__user=user)
        response = self.client.delete(f"/api/v1/orgs/{organization.id}/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(Organization.objects.filter(pk=organization.pk).exists())


class OrganizationManagementTests(APITestCase):
    def setUp(self):
        self.owner = make_user("owner@example.com")
        self.other = make_user("other@example.com")
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            "/api/v1/orgs/", {"name": "Acme Books"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.org_id = response.data["id"]
        self.assertEqual(response.data["my_role"], "owner")

    def invite(self, email, role="member"):
        return self.client.post(
            f"/api/v1/orgs/{self.org_id}/invitations/",
            {"email": email, "role": role},
            format="json",
        )

    def accept_as(self, user, token):
        self.client.force_authenticate(user=user)
        return self.client.post(
            "/api/v1/orgs/accept-invitation/", {"token": token}, format="json"
        )

    def test_invite_and_accept(self):
        invited = self.invite("other@example.com")
        self.assertEqual(invited.status_code, status.HTTP_201_CREATED)

        accepted = self.accept_as(self.other, invited.data["token"])
        self.assertEqual(accepted.status_code, status.HTTP_200_OK)
        self.assertEqual(
            Membership.objects.get(organization_id=self.org_id, user=self.other).role,
            Membership.ROLE_MEMBER,
        )

    def test_invitation_is_bound_to_the_invited_email(self):
        interloper = make_user("interloper@example.com")
        invited = self.invite("other@example.com")
        response = self.accept_as(interloper, invited.data["token"])
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_owners_cannot_be_invited_directly(self):
        response = self.invite("other@example.com", role="owner")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_members_get_404_for_the_org(self):
        self.client.force_authenticate(user=self.other)
        response = self.client.get(f"/api/v1/orgs/{self.org_id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_member_cannot_invite(self):
        invited = self.invite("other@example.com")
        self.accept_as(self.other, invited.data["token"])

        self.client.force_authenticate(user=self.other)
        response = self.client.post(
            f"/api/v1/orgs/{self.org_id}/invitations/",
            {"email": "third@example.com"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_cannot_demote_an_owner(self):
        invited = self.invite("other@example.com", role="admin")
        self.accept_as(self.other, invited.data["token"])
        owner_membership = Membership.objects.get(
            organization_id=self.org_id, user=self.owner
        )

        self.client.force_authenticate(user=self.other)
        response = self.client.patch(
            f"/api/v1/orgs/{self.org_id}/members/{owner_membership.id}/",
            {"role": "member"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_the_last_owner_cannot_be_demoted(self):
        self.client.force_authenticate(user=self.owner)
        owner_membership = Membership.objects.get(
            organization_id=self.org_id, user=self.owner
        )
        response = self.client.patch(
            f"/api/v1/orgs/{self.org_id}/members/{owner_membership.id}/",
            {"role": "member"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_member_can_leave(self):
        invited = self.invite("other@example.com")
        self.accept_as(self.other, invited.data["token"])
        membership = Membership.objects.get(
            organization_id=self.org_id, user=self.other
        )

        self.client.force_authenticate(user=self.other)
        response = self.client.delete(
            f"/api/v1/orgs/{self.org_id}/members/{membership.id}/remove/"
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Membership.objects.filter(pk=membership.pk).exists())

    def test_duplicate_pending_invitation_rejected(self):
        first = self.invite("other@example.com")
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        second = self.invite("other@example.com")
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            Invitation.objects.filter(
                organization_id=self.org_id, accepted_at__isnull=True
            ).count(),
            1,
        )
