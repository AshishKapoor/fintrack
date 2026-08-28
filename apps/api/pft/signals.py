from django.contrib.auth import get_user_model
from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver

from .models import (
    Account,
    BudgetFile,
    Category,
    CategoryGroup,
    Membership,
    Organization,
)

User = get_user_model()

DEFAULT_INCOME_CATEGORIES = [
    "Salary",
    "Freelance",
    "Business",
    "Investments",
    "Bonus",
]

DEFAULT_EXPENSE_CATEGORIES = [
    "Housing",
    "Groceries",
    "Transportation",
    "Utilities",
    "Entertainment",
]


@receiver(post_save, sender=User)
def create_personal_workspace(sender, instance, created, **kwargs):
    """Give every new user a personal workspace with a budget file in it.

    The budget file's own post_save seeds it (accounts, groups, categories),
    so this stays about tenancy: an organization, the owner membership, and
    one file to land in.
    """
    if created:
        organization = Organization.objects.create(
            name=f"{instance.email}'s space", personal=True
        )
        membership = Membership.objects.create(
            organization=organization, user=instance, role=Membership.ROLE_OWNER
        )

        membership.default_budget_file = BudgetFile.objects.create(
            organization=organization,
            created_by=instance,
            name="Primary Budget",
        )
        membership.save(update_fields=["default_budget_file"])


@receiver(post_save, sender=BudgetFile)
def seed_budget_file_defaults(sender, instance, created, **kwargs):
    """Every new budget file starts usable.

    Shared workspaces create budget files long after signup, so the seeding
    lives here rather than on the User signal: a Cash account, the two groups
    and the standard category set - the same as a fresh personal file.
    """
    if not created:
        return

    Account.objects.create(
        budget_file=instance,
        name="Cash",
        type=Account.TYPE_CHECKING,
        currency_code=instance.currency_code,
    )
    income_group = CategoryGroup.objects.create(
        budget_file=instance, name="Income", sort_order=0
    )
    expense_group = CategoryGroup.objects.create(
        budget_file=instance, name="Expenses", sort_order=1
    )
    Category.objects.bulk_create(
        [
            Category(
                budget_file=instance,
                group=income_group,
                name=name,
                kind=Category.KIND_INCOME,
            )
            for name in DEFAULT_INCOME_CATEGORIES
        ]
        + [
            Category(
                budget_file=instance,
                group=expense_group,
                name=name,
                kind=Category.KIND_EXPENSE,
            )
            for name in DEFAULT_EXPENSE_CATEGORIES
        ]
    )


@receiver(pre_delete, sender=User)
def delete_organizations_left_with_no_members(sender, instance, **kwargs):
    """Take a user's workspaces with them when nobody else is left in one.

    Budget files hang off `Organization`, not off a user, so deleting a user
    no longer cascades into their books - `created_by` is SET_NULL by design,
    otherwise the person who first created a shared workspace's file could
    delete everyone's data by closing their own account.

    That leaves the opposite hole: their personal workspace, and any shared one
    where they were the last member, would survive with no member able to reach
    it. This closes it. Runs pre_delete so the membership rows are still there
    to count.
    """
    organization_ids = list(
        Membership.objects.filter(user=instance).values_list(
            "organization_id", flat=True
        )
    )
    if not organization_ids:
        return

    abandoned = [
        organization_id
        for organization_id in organization_ids
        if not Membership.objects.filter(organization_id=organization_id)
        .exclude(user=instance)
        .exists()
    ]
    if abandoned:
        Organization.objects.filter(id__in=abandoned).delete()
