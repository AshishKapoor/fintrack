# Retire the flat /api/v1/{transactions,categories,budgets} resources.
#
# These predate the double-entry ledger and were never kept in sync with it:
# both were seeded on signup, both were live, and nothing reconciled them
# (ARCHITECTURE.md said so out loud). The ledger is the one being kept.
#
# Dropping the tables outright would silently destroy data for anyone who
# scripted against the flat API - the web app never used it, but the published
# SDKs exposed it, which is exactly the audience that would have. So the drop
# is preceded by a one-way carry-over into the ledger:
#
#   Transaction -> LedgerTransaction + two balanced LedgerPostings
#   Budget      -> BudgetMonth + EnvelopeAssignment
#   Category    -> CategoryV2 (only where a legacy row is actually referenced)
#
# Carried-over rows are stamped with match_key "legacy:<pk>" so a re-run is a
# no-op and so the provenance survives in the database, not just in this file.
#
# The reverse is a genuine no-op, not a reconstruction: this migration is not
# losslessly reversible and pretending otherwise would be worse than saying so.
# `migrate pft 0016` restores the tables (empty) without deleting anything the
# forward pass wrote.

from decimal import Decimal

from django.db import migrations

# Same seed lists as pft/signals.py. Duplicated rather than imported because a
# migration must not depend on application code that will keep changing.
DEFAULT_INCOME_CATEGORIES = ["Salary", "Freelance", "Business", "Investments", "Bonus"]
DEFAULT_EXPENSE_CATEGORIES = [
    "Housing",
    "Groceries",
    "Transportation",
    "Utilities",
    "Entertainment",
]

UNCATEGORIZED = "Uncategorized"


def _budget_file_for(apps, user_id, cache):
    """The budget file a user's legacy rows land in.

    Their default file if they have one, otherwise their oldest. Users with no
    budget file at all (possible only for rows orphaned by a partial upgrade)
    are skipped rather than having one invented for them.
    """
    if user_id in cache:
        return cache[user_id]

    BudgetFile = apps.get_model("pft", "BudgetFile")
    budget_file = (
        BudgetFile.objects.filter(user_id=user_id, is_default=True)
        .order_by("id")
        .first()
        or BudgetFile.objects.filter(user_id=user_id).order_by("id").first()
    )
    cache[user_id] = budget_file
    return budget_file


def _account_for(apps, budget_file, cache):
    """The account the money side of a carried-over transaction posts to.

    The flat model had no accounts at all, so there is nothing to map from:
    everything lands on the file's Cash account, which the budget-file seeding
    signal creates. Falling back to the oldest account, then to creating one,
    keeps this working on files whose Cash account was renamed or deleted.
    """
    if budget_file.id in cache:
        return cache[budget_file.id]

    Account = apps.get_model("pft", "Account")
    account = (
        Account.objects.filter(
            budget_file_id=budget_file.id, name="Cash", is_archived=False
        )
        .order_by("id")
        .first()
        or Account.objects.filter(budget_file_id=budget_file.id, is_archived=False)
        .order_by("id")
        .first()
    )
    if account is None:
        account = Account.objects.create(
            budget_file_id=budget_file.id,
            name="Cash",
            type="checking",
            currency_code=budget_file.currency_code,
        )
    cache[budget_file.id] = account
    return account


def _group_for(apps, budget_file, kind, cache):
    key = (budget_file.id, kind)
    if key in cache:
        return cache[key]

    CategoryGroupV2 = apps.get_model("pft", "CategoryGroupV2")
    name = "Income" if kind == "income" else "Expenses"
    group = (
        CategoryGroupV2.objects.filter(budget_file_id=budget_file.id, name=name)
        .order_by("id")
        .first()
    )
    if group is None:
        group = CategoryGroupV2.objects.create(
            budget_file_id=budget_file.id,
            name=name,
            sort_order=0 if kind == "income" else 1,
        )
    cache[key] = group
    return group


def _category_for(apps, budget_file, legacy_name, kind, cache):
    """Find or create the ledger category a legacy category name maps to.

    Matched case-insensitively on name alone, not (name, kind): CategoryV2's
    uniqueness constraint is per (budget_file, name), so a legacy "Bonus"
    marked income and a ledger "Bonus" marked expense are still one category.
    Whichever exists wins; the kind is only used when creating.
    """
    lookup = (legacy_name or UNCATEGORIZED).strip() or UNCATEGORIZED
    key = (budget_file.id, lookup.lower())
    if key in cache:
        return cache[key]

    CategoryV2 = apps.get_model("pft", "CategoryV2")
    category = (
        CategoryV2.objects.filter(budget_file_id=budget_file.id, name__iexact=lookup)
        .order_by("id")
        .first()
    )
    if category is None:
        category = CategoryV2.objects.create(
            budget_file_id=budget_file.id,
            group=_group_for(apps, budget_file, kind, cache),
            name=lookup,
            kind=kind,
        )
    cache[key] = category
    return category


def carry_legacy_data_into_the_ledger(apps, schema_editor):
    Transaction = apps.get_model("pft", "Transaction")
    Budget = apps.get_model("pft", "Budget")
    LedgerTransaction = apps.get_model("pft", "LedgerTransaction")
    LedgerPosting = apps.get_model("pft", "LedgerPosting")
    BudgetMonth = apps.get_model("pft", "BudgetMonth")
    EnvelopeAssignment = apps.get_model("pft", "EnvelopeAssignment")

    budget_files = {}
    accounts = {}
    categories = {}

    already_carried = set(
        LedgerTransaction.objects.filter(match_key__startswith="legacy:").values_list(
            "match_key", flat=True
        )
    )

    for legacy in (
        Transaction.objects.select_related("category").order_by("id").iterator()
    ):
        match_key = f"legacy:{legacy.id}"
        if match_key in already_carried:
            continue

        budget_file = _budget_file_for(apps, legacy.user_id, budget_files)
        if budget_file is None:
            continue

        kind = "income" if legacy.type == "income" else "expense"
        category = _category_for(
            apps,
            budget_file,
            legacy.category.name if legacy.category_id else UNCATEGORIZED,
            kind,
            categories,
        )
        account = _account_for(apps, budget_file, accounts)

        # Sign convention (apps/web/app/lib/ledger.ts buildSplitPostings):
        # expense debits the account and credits the category; income is the
        # mirror image. Magnitude is taken as absolute so a legacy row that
        # stored an expense as a negative number does not double-negate.
        magnitude = abs(Decimal(legacy.amount))
        account_amount = magnitude if kind == "income" else -magnitude

        ledger_transaction = LedgerTransaction.objects.create(
            budget_file_id=budget_file.id,
            transaction_date=legacy.transaction_date,
            memo=legacy.title or "",
            source_type="import",
            imported=True,
            match_key=match_key,
        )
        # auto_now_add/auto_now overwrite anything passed to create(), so the
        # original timestamps have to be written back with a queryset update,
        # which bypasses pre_save. Without this every carried-over row claims
        # it was created on upgrade day.
        LedgerTransaction.objects.filter(pk=ledger_transaction.id).update(
            created_at=legacy.created_at, updated_at=legacy.updated_at
        )
        LedgerPosting.objects.bulk_create(
            [
                LedgerPosting(
                    transaction_id=ledger_transaction.id,
                    account_id=account.id,
                    amount=account_amount,
                    sort_order=0,
                ),
                LedgerPosting(
                    transaction_id=ledger_transaction.id,
                    category_id=category.id,
                    amount=-account_amount,
                    sort_order=1,
                ),
            ]
        )

    for legacy in Budget.objects.select_related("category").order_by("id").iterator():
        budget_file = _budget_file_for(apps, legacy.user_id, budget_files)
        if budget_file is None:
            continue

        category = _category_for(
            apps,
            budget_file,
            legacy.category.name if legacy.category_id else UNCATEGORIZED,
            legacy.category.type if legacy.category_id else "expense",
            categories,
        )
        budget_month, _ = BudgetMonth.objects.get_or_create(
            budget_file_id=budget_file.id, year=legacy.year, month=legacy.month
        )
        # A ledger assignment already in place was made deliberately through
        # the envelope UI; a legacy limit is at best a stale echo of it, so it
        # does not get to overwrite one.
        EnvelopeAssignment.objects.get_or_create(
            budget_month_id=budget_month.id,
            category_id=category.id,
            defaults={"assigned_amount": Decimal(legacy.amount_limit)},
        )


class Migration(migrations.Migration):
    dependencies = [
        ("pft", "0016_aicategorizationsettings"),
    ]

    operations = [
        migrations.RunPython(
            carry_legacy_data_into_the_ledger, migrations.RunPython.noop
        ),
        # Clear Budget's unique_together before its fields go, so reversing
        # this migration can rebuild the table: the reverse of DeleteModel
        # recreates the model from the state at that point, and a Meta that
        # still names removed fields makes that state unbuildable.
        migrations.AlterUniqueTogether(name="budget", unique_together=set()),
        migrations.RemoveField(model_name="budget", name="category"),
        migrations.RemoveField(model_name="budget", name="user"),
        migrations.RemoveField(model_name="transaction", name="category"),
        migrations.RemoveField(model_name="transaction", name="user"),
        migrations.RemoveField(model_name="category", name="user"),
        migrations.DeleteModel(name="Budget"),
        migrations.DeleteModel(name="Transaction"),
        migrations.DeleteModel(name="Category"),
    ]
