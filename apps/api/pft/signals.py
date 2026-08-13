from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import (
    Account,
    BudgetFile,
    Category,
    CategoryGroupV2,
    CategoryV2,
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
def create_default_categories(sender, instance, created, **kwargs):
    """
    Signal to create default categories for new users
    """
    if created:
        categories_to_create = []

        for name in DEFAULT_INCOME_CATEGORIES:
            categories_to_create.append(
                Category(name=name, type="income", user=instance)
            )

        for name in DEFAULT_EXPENSE_CATEGORIES:
            categories_to_create.append(
                Category(name=name, type="expense", user=instance)
            )

        Category.objects.bulk_create(categories_to_create)

        organization = Organization.objects.create(
            name=f"{instance.email}'s space", personal=True
        )
        Membership.objects.create(
            organization=organization, user=instance, role=Membership.ROLE_OWNER
        )

        BudgetFile.objects.create(
            user=instance,
            organization=organization,
            name="Primary Budget",
            is_default=True,
        )


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
    )
    income_group = CategoryGroupV2.objects.create(
        budget_file=instance, name="Income", sort_order=0
    )
    expense_group = CategoryGroupV2.objects.create(
        budget_file=instance, name="Expenses", sort_order=1
    )
    CategoryV2.objects.bulk_create(
        [
            CategoryV2(
                budget_file=instance,
                group=income_group,
                name=name,
                kind=CategoryV2.KIND_INCOME,
            )
            for name in DEFAULT_INCOME_CATEGORIES
        ]
        + [
            CategoryV2(
                budget_file=instance,
                group=expense_group,
                name=name,
                kind=CategoryV2.KIND_EXPENSE,
            )
            for name in DEFAULT_EXPENSE_CATEGORIES
        ]
    )
