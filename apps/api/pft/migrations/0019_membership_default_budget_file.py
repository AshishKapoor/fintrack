# First of three migrations finishing the BudgetFile.user -> organization move
# (ROADMAP.md Phase 4): add Membership.default_budget_file. 0020 fills it in,
# 0021 drops what it replaces.
#
# It is alone in here for a reason. Django's schema editor defers an FK's
# CREATE INDEX to the end of the migration, and Postgres refuses DDL on a
# table that has pending deferred trigger events - which Django's DEFERRABLE
# INITIALLY DEFERRED foreign keys queue on every insert. Put the backfill in
# this migration and the deferred CREATE INDEX fails on any database that
# actually has memberships in it:
#
#   cannot CREATE INDEX "pft_membership" because it has pending trigger events
#
# A fresh test database has no rows, so nothing but a real upgrade - or the
# migration test next to this one - would ever have shown it.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("pft", "0018_rename_categoryv2_to_category"),
    ]

    operations = [
        migrations.AddField(
            model_name="membership",
            name="default_budget_file",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="+",
                to="pft.budgetfile",
            ),
        ),
    ]
