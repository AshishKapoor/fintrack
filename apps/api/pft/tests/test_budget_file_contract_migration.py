"""Migrations 0019-0021, run against rows rather than an empty schema.

The BudgetFile.user -> organization contract touches every existing install
exactly once, and two of its failure modes are invisible on a fresh database:

- Postgres refuses DDL on a table with pending deferred trigger events, and
  Django's foreign keys are DEFERRABLE INITIALLY DEFERRED. Backfilling
  memberships and altering pft_membership in one migration raises
  "cannot CREATE INDEX ... because it has pending trigger events" - but only
  when there is something to backfill. That is why this is three migrations.
- The backfill itself only runs when there is data to back-fill.

So this seeds the 0018 schema, migrates forward for real, and looks at what
came out.
"""

from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase


class BudgetFileContractMigrationTests(TransactionTestCase):
    BEFORE = "0018_rename_categoryv2_to_category"
    AFTER = "0021_budgetfile_drop_user_column"

    def _migrate(self, target):
        executor = MigrationExecutor(connection)
        executor.loader.build_graph()
        executor.migrate([("pft", target)])
        executor.loader.build_graph()
        return executor.loader.project_state([("pft", target)]).apps

    def tearDown(self):
        self._migrate(self.AFTER)

    def test_upgrade_backfills_organizations_and_carries_defaults(self):
        old = self._migrate(self.BEFORE)
        User = old.get_model("pft", "User")
        Organization = old.get_model("pft", "Organization")
        Membership = old.get_model("pft", "Membership")
        BudgetFile = old.get_model("pft", "BudgetFile")

        # The ordinary case: a personal workspace with two files, the second
        # flagged default.
        alice = User.objects.create(
            email="alice@migration.test", username="alice@migration.test", password="x"
        )
        organization = Organization.objects.create(name="alice space", personal=True)
        Membership.objects.create(organization=organization, user=alice, role="owner")
        BudgetFile.objects.create(
            user=alice, organization=organization, name="One", is_default=False
        )
        chosen = BudgetFile.objects.create(
            user=alice, organization=organization, name="Two", is_default=True
        )

        # The awkward case 0007's backfill could have missed: a budget file
        # with no organization, whose owner has no personal workspace either.
        bob = User.objects.create(
            email="bob@migration.test", username="bob@migration.test", password="x"
        )
        orphan = BudgetFile.objects.create(
            user=bob, organization=None, name="Orphan", is_default=True
        )

        new = self._migrate(self.AFTER)
        BudgetFile = new.get_model("pft", "BudgetFile")
        Membership = new.get_model("pft", "Membership")
        Organization = new.get_model("pft", "Organization")

        # Nothing is left without an organization - the NOT NULL would have
        # refused to apply otherwise, but assert the adoption was sane, not
        # merely non-null.
        adopted = BudgetFile.objects.get(pk=orphan.pk)
        self.assertTrue(adopted.organization.personal)
        self.assertEqual(adopted.created_by_id, bob.id)
        self.assertTrue(
            Membership.objects.filter(
                user_id=bob.id, organization=adopted.organization, role="owner"
            ).exists()
        )
        self.assertEqual(
            Organization.objects.filter(memberships__user_id=bob.id).count(), 1
        )

        # The old flag became its owner's membership choice.
        self.assertEqual(
            Membership.objects.get(
                user_id=alice.id, organization_id=organization.id
            ).default_budget_file_id,
            chosen.pk,
        )

        # created_by carries the old user column's value rather than being
        # dropped and re-added empty.
        self.assertEqual(BudgetFile.objects.get(pk=chosen.pk).created_by_id, alice.id)

        field_names = {field.name for field in BudgetFile._meta.get_fields()}
        self.assertNotIn("is_default", field_names)
        self.assertNotIn("user", field_names)
