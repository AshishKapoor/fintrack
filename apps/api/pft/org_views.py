"""Organizations, members and invitations.

The management surface for the tenancy boundary. Data access enforcement lives
in the finance viewsets (they scope querysets through Membership); this module
is about the organizations themselves: create one, invite people, change
roles, leave.

Role rules, enforced here:
- owner: everything, including deleting the org and managing owners
- admin: manage members and invitations, not owners, cannot delete the org
- member/viewer: read the member list, leave
"""

import uuid

from django.db import transaction
from django.utils import timezone
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from .audit import record
from .models import AuditLog, Invitation, Membership, Organization


class MembershipSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Membership
        fields = ["id", "user", "email", "role", "created_at"]
        read_only_fields = ["id", "user", "email", "created_at"]


class OrganizationSerializer(serializers.ModelSerializer):
    my_role = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = ["id", "name", "personal", "my_role", "created_at"]
        read_only_fields = ["id", "personal", "my_role", "created_at"]

    def get_my_role(self, obj):
        user = self.context["request"].user
        membership = next(
            (m for m in obj.memberships.all() if m.user_id == user.id), None
        )
        return membership.role if membership else None


class InvitationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invitation
        fields = ["id", "email", "role", "token", "created_at", "accepted_at"]
        read_only_fields = ["id", "token", "created_at", "accepted_at"]

    def validate_role(self, value):
        if value == Membership.ROLE_OWNER:
            raise serializers.ValidationError(
                "Owners are promoted from existing members, not invited."
            )
        return value


class OrganizationViewSet(viewsets.ModelViewSet):
    serializer_class = OrganizationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Organization.objects.filter(memberships__user=self.request.user)
            .prefetch_related("memberships")
            .distinct()
            .order_by("id")
        )

    def membership_for(self, organization) -> Membership:
        membership = Membership.objects.filter(
            organization=organization, user=self.request.user
        ).first()
        if membership is None:
            raise PermissionDenied("You are not a member of this organization.")
        return membership

    def require_role(self, organization, allowed) -> Membership:
        membership = self.membership_for(organization)
        if membership.role not in allowed:
            raise PermissionDenied("Your role does not allow that.")
        return membership

    def perform_create(self, serializer):
        with transaction.atomic():
            organization = serializer.save(personal=False)
            Membership.objects.create(
                organization=organization,
                user=self.request.user,
                role=Membership.ROLE_OWNER,
            )

    def perform_update(self, serializer):
        self.require_role(serializer.instance, Membership.MANAGE_ROLES)
        serializer.save()

    def perform_destroy(self, instance):
        self.require_role(instance, {Membership.ROLE_OWNER})
        if instance.personal:
            raise ValidationError(
                {"detail": "A personal organization cannot be deleted."}
            )
        instance.delete()

    # ---- Members ----------------------------------------------------------

    @action(detail=True, methods=["get"], url_path="members")
    def members(self, request, pk=None):
        organization = self.get_object()
        self.membership_for(organization)
        rows = organization.memberships.select_related("user").order_by("id")
        return Response(MembershipSerializer(rows, many=True).data)

    @action(
        detail=True,
        methods=["patch"],
        url_path=r"members/(?P<membership_id>\d+)",
    )
    def update_member(self, request, pk=None, membership_id=None):
        organization = self.get_object()
        actor = self.require_role(organization, Membership.MANAGE_ROLES)
        membership = organization.memberships.filter(pk=membership_id).first()
        if membership is None:
            return Response(status=status.HTTP_404_NOT_FOUND)

        new_role = request.data.get("role")
        if new_role not in dict(Membership.ROLE_CHOICES):
            raise ValidationError({"role": "Unknown role."})

        # Only an owner touches owners - promoting to or demoting from.
        touching_owner = (
            membership.role == Membership.ROLE_OWNER
            or new_role == Membership.ROLE_OWNER
        )
        if touching_owner and actor.role != Membership.ROLE_OWNER:
            raise PermissionDenied("Only an owner can manage owners.")

        # Never demote the last owner: the org would be unmanageable.
        if (
            membership.role == Membership.ROLE_OWNER
            and new_role != Membership.ROLE_OWNER
            and organization.memberships.filter(role=Membership.ROLE_OWNER).count() == 1
        ):
            raise ValidationError(
                {"detail": "An organization needs at least one owner."}
            )

        old_role = membership.role
        membership.role = new_role
        membership.save(update_fields=["role"])
        record(
            organization=organization,
            actor=request.user,
            action=AuditLog.ACTION_UPDATED,
            entity=membership,
            summary=f"Changed {membership.user.email} from {old_role} to {new_role}",
            changes={"role": {"from": old_role, "to": new_role}},
        )
        return Response(MembershipSerializer(membership).data)

    @action(
        detail=True,
        methods=["delete"],
        url_path=r"members/(?P<membership_id>\d+)/remove",
    )
    def remove_member(self, request, pk=None, membership_id=None):
        organization = self.get_object()
        actor = self.membership_for(organization)
        membership = organization.memberships.filter(pk=membership_id).first()
        if membership is None:
            return Response(status=status.HTTP_404_NOT_FOUND)

        removing_self = membership.user_id == request.user.id
        if not removing_self and actor.role not in Membership.MANAGE_ROLES:
            raise PermissionDenied("Your role does not allow removing members.")
        if (
            membership.role == Membership.ROLE_OWNER
            and actor.role != Membership.ROLE_OWNER
        ):
            raise PermissionDenied("Only an owner can remove an owner.")
        if (
            membership.role == Membership.ROLE_OWNER
            and organization.memberships.filter(role=Membership.ROLE_OWNER).count() == 1
        ):
            raise ValidationError(
                {"detail": "An organization needs at least one owner."}
            )

        removed_email = membership.user.email
        membership.delete()
        record(
            organization=organization,
            actor=request.user,
            action=AuditLog.ACTION_DELETED,
            entity="Membership",
            summary=(
                f"{removed_email} left the workspace"
                if removing_self
                else f"Removed {removed_email} from the workspace"
            ),
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ---- Invitations ------------------------------------------------------

    @action(detail=True, methods=["get", "post"], url_path="invitations")
    def invitations(self, request, pk=None):
        organization = self.get_object()
        self.require_role(organization, Membership.MANAGE_ROLES)

        if request.method == "GET":
            rows = organization.invitations.filter(accepted_at__isnull=True)
            return Response(InvitationSerializer(rows, many=True).data)

        serializer = InvitationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower()

        if organization.memberships.filter(user__email__iexact=email).exists():
            raise ValidationError({"email": "Already a member."})
        if organization.invitations.filter(
            email__iexact=email, accepted_at__isnull=True
        ).exists():
            raise ValidationError({"email": "An invitation is already pending."})

        invitation = Invitation.objects.create(
            organization=organization,
            email=email,
            role=serializer.validated_data.get("role", Membership.ROLE_MEMBER),
            invited_by=request.user,
        )
        record(
            organization=organization,
            actor=request.user,
            action=AuditLog.ACTION_CREATED,
            entity=invitation,
            summary=f"Invited {email} as {invitation.role}",
        )
        # No email backend is configured; the token is returned to the inviter
        # to share out of band. When SMTP lands, this is where the mail goes.
        return Response(
            InvitationSerializer(invitation).data, status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=["post"], url_path="accept-invitation")
    def accept_invitation(self, request):
        raw_token = request.data.get("token", "")
        try:
            token = uuid.UUID(str(raw_token))
        except ValueError as exc:
            raise ValidationError({"token": "Malformed token."}) from exc

        invitation = Invitation.objects.filter(
            token=token, accepted_at__isnull=True
        ).first()
        if invitation is None:
            return Response(
                {"detail": "Invitation not found or already used."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if invitation.email.lower() != request.user.email.lower():
            raise PermissionDenied("This invitation was issued to a different email.")

        with transaction.atomic():
            membership, _ = Membership.objects.get_or_create(
                organization=invitation.organization,
                user=request.user,
                defaults={"role": invitation.role},
            )
            invitation.accepted_at = timezone.now()
            invitation.save(update_fields=["accepted_at"])
            record(
                organization=invitation.organization,
                actor=request.user,
                action=AuditLog.ACTION_CREATED,
                entity=membership,
                summary=f"{request.user.email} joined as {membership.role}",
            )

        return Response(
            OrganizationSerializer(
                invitation.organization, context={"request": request}
            ).data,
            status=status.HTTP_200_OK,
        )
