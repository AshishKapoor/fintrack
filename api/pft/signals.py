from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .models import Category

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
