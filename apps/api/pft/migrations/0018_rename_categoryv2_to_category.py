# Drop the "V2" suffix from the ledger's category models.
#
# CategoryV2/CategoryGroupV2 were named around the flat Category model they
# were introduced alongside. That model is gone as of 0017, so the suffix is
# now nothing but an accident of history - one baked into the public OpenAPI
# schema, and therefore into every generated client. ROADMAP.md Phase 4 calls
# for fixing it before external consumers multiply.
#
# RenameModel, deliberately, not create-and-copy: it renames the table in
# place, so no category row or foreign key is touched. (Django's autodetector
# proposes CreateModel + DeleteModel here unless told these are renames, which
# would silently drop every category and cascade to every posting.)
#
# The table `pft_category` is free precisely because 0017 dropped the flat
# model that used to hold it, which is why these two migrations have to land
# in this order.

import django.db.models.deletion
from django.db import migrations, models

# AuditLog.entity_type stores `type(entity).__name__`, so rows written before
# this migration say "CategoryV2". It is a machine-readable discriminator
# paired with entity_id - not narrative - and leaving it alone would mean
# filtering the audit log by "Category" silently hides every entry older than
# this release. So the discriminator is rewritten; the human-readable
# `summary` is not, since that IS narrative and says what the system called
# the thing at the time.
RENAMED_ENTITY_TYPES = {
    "CategoryV2": "Category",
    "CategoryGroupV2": "CategoryGroup",
}


def rename_audit_entity_types(apps, schema_editor):
    AuditLog = apps.get_model("pft", "AuditLog")
    for old, new in RENAMED_ENTITY_TYPES.items():
        AuditLog.objects.filter(entity_type=old).update(entity_type=new)


def restore_audit_entity_types(apps, schema_editor):
    AuditLog = apps.get_model("pft", "AuditLog")
    for old, new in RENAMED_ENTITY_TYPES.items():
        AuditLog.objects.filter(entity_type=new).update(entity_type=old)


class Migration(migrations.Migration):
    dependencies = [
        ("pft", "0017_retire_legacy_flat_api"),
    ]

    operations = [
        # The constraint names the old model, so it has to go before the
        # rename and come back after it.
        migrations.RemoveConstraint(
            model_name="categoryv2",
            name="unique_category_v2_name_per_budget_file",
        ),
        # Category before CategoryGroup, and it matters. RenameModel repoints
        # the renamed model's *related* objects, so whichever rename runs
        # second must find the first one under the name the state already has.
        # Category.group points at CategoryGroup, so renaming Category first
        # leaves CategoryGroupV2's rename looking up `pft.category` - which
        # exists. The other order works forwards but dies on the way back,
        # because unapply runs these in reverse.
        migrations.RenameModel(old_name="CategoryV2", new_name="Category"),
        migrations.RenameModel(old_name="CategoryGroupV2", new_name="CategoryGroup"),
        # related_name only - no database effect, but the state has to match
        # the model or every later autodetector run proposes it again.
        migrations.AlterField(
            model_name="category",
            name="budget_file",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="categories",
                to="pft.budgetfile",
            ),
        ),
        migrations.AddConstraint(
            model_name="category",
            constraint=models.UniqueConstraint(
                fields=("budget_file", "name"),
                name="unique_category_name_per_budget_file",
            ),
        ),
        migrations.RunPython(rename_audit_entity_types, restore_audit_entity_types),
    ]
