# The last of the three BudgetFile.user -> organization migrations; 0019 added
# Membership.default_budget_file, 0020 filled it in, and 0019 has the note on
# why they are separate.
#
#   - `organization` becomes NOT NULL, so membership is the only way in and
#     tenancy.py can drop its owner fallback.
#   - `user` becomes `created_by`, nullable and SET_NULL. The old column was
#     ON DELETE CASCADE, which meant the person who first created a shared
#     workspace's budget file destroyed the whole workspace's books by closing
#     their own account. pft/signals.py now deletes an organization only once
#     no members are left in it.
#   - `is_default` goes: 0020 moved every value onto Membership.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("pft", "0020_budgetfile_carry_defaults"),
    ]

    operations = [
        migrations.AlterField(
            model_name="budgetfile",
            name="organization",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="budget_files",
                to="pft.organization",
            ),
        ),
        # The constraint names both `user` and `is_default`, so it goes first.
        migrations.RemoveConstraint(
            model_name="budgetfile",
            name="unique_default_budget_file_per_user_org",
        ),
        migrations.RenameField(
            model_name="budgetfile", old_name="user", new_name="created_by"
        ),
        migrations.AlterField(
            model_name="budgetfile",
            name="created_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="created_budget_files",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.RemoveField(model_name="budgetfile", name="is_default"),
    ]
