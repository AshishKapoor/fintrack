"""Background tasks for the heavy job types.

Each task is a thin wrapper: the business logic stays in finance_services, and
job state lives on the ImportJob/ExportJob rows (which the UI polls), not in a
Celery result backend. Failures mark the row failed with the error message
instead of leaving it stuck in a running state forever.
"""

import logging

from celery import shared_task

from .models import ExportJob, ImportJob

logger = logging.getLogger(__name__)


@shared_task
def run_export_job_task(export_job_id: int) -> None:
    from .finance_services import run_export_job

    try:
        export_job = ExportJob.objects.get(pk=export_job_id)
    except ExportJob.DoesNotExist:
        logger.warning("export job %s vanished before the worker saw it", export_job_id)
        return

    # run_export_job manages RUNNING/COMPLETED/FAILED itself.
    run_export_job(export_job)


@shared_task
def execute_import_job_task(import_job_id: int) -> None:
    from .finance_services import execute_import_job

    try:
        import_job = ImportJob.objects.get(pk=import_job_id)
    except ImportJob.DoesNotExist:
        logger.warning("import job %s vanished before the worker saw it", import_job_id)
        return

    try:
        execute_import_job(import_job)
    except Exception as exc:
        logger.exception("import job %s failed", import_job_id)
        import_job.status = ImportJob.STATUS_FAILED
        import_job.error_message = str(exc)[:2000]
        import_job.save(update_fields=["status", "error_message", "updated_at"])
        raise


@shared_task
def prune_finance_jobs_task() -> None:
    """Periodic wrapper around `manage.py prune_finance_jobs`.

    Scheduled via CELERY_BEAT_SCHEDULE (see app/settings/base.py) so plaintext
    import/export payloads do not linger in the database indefinitely waiting
    for someone to run the management command by hand - see SECURITY.md.
    """
    from django.core.management import call_command

    call_command("prune_finance_jobs")


@shared_task
def reset_demo_data_task() -> None:
    """Rebuild the public demo account from scratch.

    Only ever scheduled when FINTRACK_DEMO_MODE is on (see
    CELERY_BEAT_SCHEDULE in app/settings/base.py) - the same "reset hourly"
    behaviour ROADMAP.md's demo instance item calls for, so a visitor who
    wanders in after someone else has been clicking around still sees the
    same deterministic seed data rather than an accumulating mess.
    """
    from django.conf import settings
    from django.core.management import call_command

    call_command(
        "seed_demo",
        "--reset",
        f"--email={settings.FINTRACK_DEMO_EMAIL}",
        f"--password={settings.FINTRACK_DEMO_PASSWORD}",
    )
