"""Membership-based tenancy helpers.

The single place that answers "which budget files can this user see, and can
they write?". Finance viewsets and serializers route through here so the rule
cannot drift per-endpoint - the failure mode ARCHITECTURE.md warns about.

Access rules:
- read:  any membership in the budget file's organization
- write: membership with a write role (owner / admin / member; not viewer)

Budget files whose organization is still NULL (pre-backfill rows in the middle
of an upgrade) fall back to the legacy owner check.
"""

from django.db.models import Q

from .models import BudgetFile, Membership


def budget_file_q(user, *, write: bool = False, prefix: str = "budget_file") -> Q:
    """A Q filtering <prefix> to budget files the user may access.

    Pass prefix="pk" when the queryset IS BudgetFile - the lookups then target
    the model's own columns instead of a relation.
    """
    roles = Membership.WRITE_ROLES if write else None
    membership = Membership.objects.filter(user=user)
    if roles is not None:
        membership = membership.filter(role__in=roles)
    org_ids = membership.values_list("organization_id", flat=True)

    path = "" if prefix == "pk" else f"{prefix}__"
    return Q(**{f"{path}organization_id__in": org_ids}) | Q(
        **{f"{path}organization__isnull": True, f"{path}user": user}
    )


def accessible_budget_files(user, *, write: bool = False):
    return BudgetFile.objects.filter(
        budget_file_q(user, write=write, prefix="pk")
    ).distinct()


def can_access(user, budget_file: BudgetFile, *, write: bool = False) -> bool:
    if budget_file.organization_id is None:
        return budget_file.user_id == user.id
    membership = Membership.objects.filter(
        user=user, organization_id=budget_file.organization_id
    ).first()
    if membership is None:
        return False
    if write:
        return membership.role in Membership.WRITE_ROLES
    return True


def can_access_organization(user, organization, *, write: bool = False) -> bool:
    membership = Membership.objects.filter(
        user=user, organization=organization
    ).first()
    if membership is None:
        return False
    if write:
        return membership.role in Membership.WRITE_ROLES
    return True


def personal_organization(user):
    membership = (
        Membership.objects.filter(user=user, organization__personal=True)
        .select_related("organization")
        .first()
    )
    return membership.organization if membership else None
