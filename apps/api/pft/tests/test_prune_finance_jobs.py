"""Tests for `manage.py prune_finance_jobs` and its Celery beat wrapper.

Neither had any coverage before this: the command has existed since the
import/export feature shipped, and the periodic task is new (see
CELERY_BEAT_SCHEDULE in app/settings/base.py) - it runs unattended once a
day, so a silent regression here would go unnoticed for a long time.
"""

from datetime import timedelta
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from pft.models import AuditLog, ExportJob, ImportJob, Organization
from pft.tasks import prune_finance_jobs_task
from pft.tests.helpers import personal_budget_file

User = get_user_model()


class PruneFinanceJobsCommandTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="prune-user@example.com",
            username="prune-user@example.com",
            password="StrongPass123!",
        )
        self.budget_file = personal_budget_file(self.user)

    def _backdated_import(self, days_old, payload="account,amount\nCash,12.34"):
        job = ImportJob.objects.create(
            budget_file=self.budget_file,
            requested_by=self.user,
            format=ImportJob.FORMAT_CSV,
            status=ImportJob.STATUS_COMPLETED,
            source_payload=payload,
        )
        # created_at is auto_now_add - only .update() can backdate it.
        ImportJob.objects.filter(pk=job.pk).update(
            created_at=timezone.now() - timedelta(days=days_old)
        )
        return job

    def _backdated_export(self, days_old, content="date,amount\n2026-01-01,1.00"):
        job = ExportJob.objects.create(
            budget_file=self.budget_file,
            requested_by=self.user,
            format=ExportJob.FORMAT_CSV,
            status=ExportJob.STATUS_COMPLETED,
            content_text=content,
        )
        ExportJob.objects.filter(pk=job.pk).update(
            created_at=timezone.now() - timedelta(days=days_old)
        )
        return job

    def test_clears_payloads_older_than_the_retention_window(self):
        old_import = self._backdated_import(days_old=45)
        recent_import = self._backdated_import(days_old=1)
        old_export = self._backdated_export(days_old=45)
        recent_export = self._backdated_export(days_old=1)

        call_command("prune_finance_jobs", "--days", "30", stdout=StringIO())

        old_import.refresh_from_db()
        recent_import.refresh_from_db()
        old_export.refresh_from_db()
        recent_export.refresh_from_db()

        self.assertEqual(old_import.source_payload, "")
        self.assertNotEqual(recent_import.source_payload, "")
        self.assertEqual(old_export.content_text, "")
        self.assertNotEqual(recent_export.content_text, "")

    def test_rows_survive_the_prune_only_their_payload_is_cleared(self):
        # Pruning is meant to remove plaintext financial data, not history:
        # the job row (and its metadata) stays, just emptied.
        job = self._backdated_import(days_old=45)

        call_command("prune_finance_jobs", "--days", "30", stdout=StringIO())

        self.assertTrue(ImportJob.objects.filter(pk=job.pk).exists())

    def test_dry_run_reports_but_does_not_write(self):
        job = self._backdated_import(days_old=45)

        out = StringIO()
        call_command("prune_finance_jobs", "--days", "30", "--dry-run", stdout=out)

        job.refresh_from_db()
        self.assertNotEqual(job.source_payload, "")
        self.assertIn("Would clear 1 import payload", out.getvalue())

    def test_default_retention_window_comes_from_settings(self):
        # No --days passed: falls back to settings.FINTRACK_JOB_RETENTION_DAYS
        # (30 by default), so a job just past that boundary is cleared...
        just_over = self._backdated_import(days_old=31)
        # ...and one just inside it is not.
        just_under = self._backdated_import(days_old=29)

        call_command("prune_finance_jobs", stdout=StringIO())

        just_over.refresh_from_db()
        just_under.refresh_from_db()
        self.assertEqual(just_over.source_payload, "")
        self.assertNotEqual(just_under.source_payload, "")

    def test_audit_log_is_floored_at_a_year_regardless_of_days(self):
        organization = Organization.objects.filter(memberships__user=self.user).first()
        recent_enough = AuditLog.objects.create(
            organization=organization,
            actor=self.user,
            actor_email=self.user.email,
            action=AuditLog.ACTION_CREATED,
            entity_type="Payee",
            entity_id="1",
            summary="Created Payee Test",
        )
        AuditLog.objects.filter(pk=recent_enough.pk).update(
            created_at=timezone.now() - timedelta(days=45)
        )
        long_gone = AuditLog.objects.create(
            organization=organization,
            actor=self.user,
            actor_email=self.user.email,
            action=AuditLog.ACTION_CREATED,
            entity_type="Payee",
            entity_id="2",
            summary="Created Payee Ancient",
        )
        AuditLog.objects.filter(pk=long_gone.pk).update(
            created_at=timezone.now() - timedelta(days=400)
        )

        # --days 30 would delete both by the job-payload rule, but audit
        # history has its own 365-day floor (see the command's docstring).
        call_command("prune_finance_jobs", "--days", "30", stdout=StringIO())

        self.assertTrue(AuditLog.objects.filter(pk=recent_enough.pk).exists())
        self.assertFalse(AuditLog.objects.filter(pk=long_gone.pk).exists())

    def test_no_stale_jobs_is_a_quiet_success(self):
        out = StringIO()
        call_command("prune_finance_jobs", stdout=out)
        self.assertIn(
            "Cleared 0 import payload(s) and 0 export payload(s)", out.getvalue()
        )


class PruneFinanceJobsTaskTests(TestCase):
    """The Celery beat wrapper - see CELERY_BEAT_SCHEDULE in settings/base.py."""

    def test_task_invokes_the_management_command(self):
        user = User.objects.create_user(
            email="prune-task-user@example.com",
            username="prune-task-user@example.com",
            password="StrongPass123!",
        )
        budget_file = personal_budget_file(user)
        job = ImportJob.objects.create(
            budget_file=budget_file,
            requested_by=user,
            format=ImportJob.FORMAT_CSV,
            status=ImportJob.STATUS_COMPLETED,
            source_payload="account,amount\nCash,1.00",
        )
        ImportJob.objects.filter(pk=job.pk).update(
            created_at=timezone.now() - timedelta(days=400)
        )

        prune_finance_jobs_task()

        job.refresh_from_db()
        self.assertEqual(job.source_payload, "")
