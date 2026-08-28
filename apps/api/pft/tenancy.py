"""Membership-based tenancy helpers.

The single place that answers "which budget files can this user see, and can
they write?". Finance viewsets and serializers route through here so the rule
cannot drift per-endpoint - the failure mode ARCHITECTURE.md warns about.

Access rules:
- read:  any membership in the budget file's organization
- write: membership with a write role (owner / admin / member; not viewer)

There is no owner-of-the-file fallback any more. `BudgetFile.organization` was
nullable through the expand phase of the user->organization move, and this
module fell back to `budget_file.user` for rows that had not been backfilled;
migration `0019` backfilled the stragglers, made the column NOT NULL and
dropped `BudgetFile.user`, so membership is now the only path in.
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
    return Q(**{f"{path}organization_id__in": org_ids})


def accessible_budget_files(user, *, write: bool = False):
    return BudgetFile.objects.filter(
        budget_file_q(user, write=write, prefix="pk")
    ).distinct()


def can_access(user, budget_file: BudgetFile, *, write: bool = False) -> bool:
    membership = Membership.objects.filter(
        user=user, organization_id=budget_file.organization_id
    ).first()
    if membership is None:
        return False
    if write:
        return membership.role in Membership.WRITE_ROLES
    return True


def can_access_organization(user, organization, *, write: bool = False) -> bool:
    membership = Membership.objects.filter(user=user, organization=organization).first()
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


def default_budget_file(user, organization):
    """The budget file `user` opens by default in `organization`.

    Their explicit choice if they have made one and it still lives in that
    organization (a file can be deleted, or the membership can predate any
    choice), otherwise the organization's oldest file. Returns None for an
    organization with no files yet - the caller decides whether to create one.
    """
    membership = Membership.objects.filter(user=user, organization=organization).first()
    if membership is None:
        return None

    chosen = membership.default_budget_file
    if chosen is not None and chosen.organization_id == organization.id:
        return chosen

    return BudgetFile.objects.filter(organization=organization).order_by("id").first()


def set_default_budget_file(user, budget_file: BudgetFile) -> bool:
    """Record `budget_file` as `user`'s default in its organization.

    Returns False when the user has no membership there, which the caller
    should treat the same as a permission failure.
    """
    membership = Membership.objects.filter(
        user=user, organization_id=budget_file.organization_id
    ).first()
    if membership is None:
        return False

    membership.default_budget_file = budget_file
    membership.save(update_fields=["default_budget_file"])
    return True
