# Finish the BudgetFile.user -> organization move (ROADMAP.md Phase 4).
#
# Migration 0007 was the expand phase: it added `BudgetFile.organization` as a
# nullable column and backfilled existing rows to their owner's personal
# organization. `user` stayed, tenancy.py kept an owner fallback for rows the
# backfill might have missed, and the pair has been carried since.
#
# The data half of the contract phase. 0019 added the column this fills in;
# 0021 drops the columns it replaces. See 0019 for why the three are separate.
#
#   1. Backfill any budget file still missing an organization. 0007 covered
#      everything that existed then, but a NULL could have been written since
#      by anything constructing a BudgetFile without one.
#   2. Move `is_default` off BudgetFile onto Membership.default_budget_file.
#      Which file you land in is a property of *you*, not of the file: on
#      BudgetFile it meant "the default among the files this user created in
#      this org", and BudgetFileViewSet.set_default cleared the flag across
#      every file the caller could see - so in a shared workspace one member
#      picking a default changed it for everybody, and across their own
#      workspaces too.

from django.db import migrations


def adopt_orphan_budget_files(apps, schema_editor):
    """Give every organization-less budget file an organization.

    Its owner's personal organization, creating one if they somehow have none
    (a user row predating the organizations feature, or one whose signup
    signal did not fire). Files with no owner either are left for the NOT NULL
    to reject rather than being silently attached somewhere arbitrary.
    """
    BudgetFile = apps.get_model("pft", "BudgetFile")
    Organization = apps.get_model("pft", "Organization")
    Membership = apps.get_model("pft", "Membership")

    orphans = BudgetFile.objects.filter(organization__isnull=True).select_related(
        "user"
    )
    personal_by_user = {}

    for budget_file in orphans.iterator():
        user_id = budget_file.user_id
        if user_id is None:
            continue

        organization = personal_by_user.get(user_id)
        if organization is None:
            membership = (
                Membership.objects.filter(
                    user_id=user_id, organization__personal=True
                )
                .select_related("organization")
                .first()
            )
            if membership is not None:
                organization = membership.organization
            else:
                organization = Organization.objects.create(
                    name=f"{budget_file.user.email}'s space", personal=True
                )
                Membership.objects.create(
                    organization=organization, user_id=user_id, role="owner"
                )
            personal_by_user[user_id] = organization

        budget_file.organization = organization
        budget_file.save(update_fields=["organization"])


def carry_defaults_onto_memberships(apps, schema_editor):
    """Turn each `BudgetFile.is_default` row into its owner's membership choice.

    The old flag belonged to the file's creator, so that is whose membership
    inherits it. Anyone else in a shared workspace simply has no explicit
    choice yet, and `tenancy.default_budget_file` falls back to the oldest file
    for them - which is what the old per-org flag effectively gave them anyway.
    """
    BudgetFile = apps.get_model("pft", "BudgetFile")
    Membership = apps.get_model("pft", "Membership")

    for budget_file in (
        BudgetFile.objects.filter(is_default=True).order_by("id").iterator()
    ):
        Membership.objects.filter(
            user_id=budget_file.user_id, organization_id=budget_file.organization_id
        ).update(default_budget_file=budget_file)


def restore_defaults_onto_budget_files(apps, schema_editor):
    BudgetFile = apps.get_model("pft", "BudgetFile")
    Membership = apps.get_model("pft", "Membership")

    for membership in (
        Membership.objects.exclude(default_budget_file__isnull=True)
        .order_by("id")
        .iterator()
    ):
        BudgetFile.objects.filter(id=membership.default_budget_file_id).update(
            is_default=True
        )


class Migration(migrations.Migration):
    dependencies = [
        ("pft", "0019_membership_default_budget_file"),
    ]

    operations = [
        migrations.RunPython(adopt_orphan_budget_files, migrations.RunPython.noop),
        migrations.RunPython(
            carry_defaults_onto_memberships, restore_defaults_onto_budget_files
        ),
    ]
