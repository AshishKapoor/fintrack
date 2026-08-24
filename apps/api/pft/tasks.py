"""Background tasks for the heavy job types.

Each task is a thin wrapper: the business logic stays in finance_services, and
job state lives on the ImportJob/ExportJob rows (which the UI polls), not in a
Celery result backend. Failures mark the row failed with the error message
instead of leaving it stuck in a running state forever.
"""

import logging

from celery import shared_task

from .models import ExportJob, ImportJob, ScheduledTransaction, SyncConnection

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
def materialize_due_scheduled_transactions_task() -> None:
    """Materialize every active scheduled transaction that has come due.

    Scheduled hourly via CELERY_BEAT_SCHEDULE (see app/settings/base.py) so
    recurring transactions post themselves - the "Run Due" button in
    Rules & Recurring becomes a manual override rather than the only way
    this happens. It stays available for deployments that never run a beat
    process at all (e.g. the Render one-click deploy, see render.yaml).

    Runs across every tenant's schedules in one pass, so a single budget
    file with a broken template (on_error="skip") is logged and skipped
    rather than blocking materialization for everyone else.
    """
    from .finance_services import materialize_due_scheduled_transactions

    created_ids, errors = materialize_due_scheduled_transactions(
        ScheduledTransaction.objects.all(), on_error="skip"
    )
    if created_ids:
        logger.info("materialized %d due scheduled transaction(s)", len(created_ids))
    if errors:
        logger.warning(
            "%d scheduled transaction(s) failed to materialize this run", len(errors)
        )


@shared_task
def check_budget_threshold_alerts_task() -> None:
    """Alert every user whose envelope spending crossed their own threshold.

    Scheduled daily via CELERY_BEAT_SCHEDULE. See
    notifications.check_budget_threshold_alerts for the per-category math and
    NotificationLog for why running this daily (rather than, say, hourly)
    cannot double-send an alert.
    """
    from .notifications import check_budget_threshold_alerts

    sent, errors = check_budget_threshold_alerts()
    if sent:
        logger.info("sent %d budget threshold alert(s)", sent)
    if errors:
        logger.warning("%d notification preference(s) failed this run", len(errors))


@shared_task
def send_scheduled_transaction_reminders_task() -> None:
    """Remind every user about schedules due in their configured lead time.

    Scheduled daily via CELERY_BEAT_SCHEDULE, independently of
    materialize_due_scheduled_transactions_task - a reminder fires *before*
    the transaction posts, materialization happens *when* it's due.
    """
    from .notifications import send_scheduled_transaction_reminders

    sent, errors = send_scheduled_transaction_reminders()
    if sent:
        logger.info("sent %d scheduled transaction reminder(s)", sent)
    if errors:
        logger.warning("%d notification preference(s) failed this run", len(errors))


@shared_task
def send_weekly_digest_task() -> None:
    """A Monday-morning spend/income/upcoming-bills summary for opted-in users.

    Scheduled weekly (Mondays) via CELERY_BEAT_SCHEDULE.
    """
    from .notifications import send_weekly_digest

    sent, errors = send_weekly_digest()
    if sent:
        logger.info("sent %d weekly digest(s)", sent)
    if errors:
        logger.warning("%d notification preference(s) failed this run", len(errors))


@shared_task
def sync_bank_connection_task(connection_id: int) -> None:
    """Sync one connection now - the worker side of SyncConnectionViewSet.sync."""
    from .bank_sync import sync_connection

    try:
        connection = SyncConnection.objects.get(pk=connection_id)
    except SyncConnection.DoesNotExist:
        logger.warning("sync connection %s vanished before the worker saw it", connection_id)
        return

    result = sync_connection(connection)
    logger.info(
        "bank sync connection %s: %d created, %d skipped, %d account(s) failed",
        connection_id,
        result["created"],
        result["skipped"],
        len(result["errors"]),
    )


@shared_task
def sync_bank_connections_task() -> None:
    """Sync every active bank connection on the instance.

    Scheduled via CELERY_BEAT_SCHEDULE at a deliberately modest cadence
    (every 6 hours, not hourly like scheduled transactions): GoCardless's
    free tier caps how many times a day each linked account may be polled,
    and neither provider's data changes fast enough for hourly to matter.
    One connection's failure (a revoked bank consent, an expired token) is
    logged and skipped rather than blocking the rest - materialize_due_
    scheduled_transactions_task's on_error="skip" reasoning, here applied
    across connections instead of budget files.
    """
    from .bank_sync import sync_connection

    connections = SyncConnection.objects.filter(status=SyncConnection.STATUS_ACTIVE)
    synced = 0
    failed = 0
    for connection in connections:
        try:
            sync_connection(connection)
            synced += 1
        except Exception:
            failed += 1
            logger.exception("bank sync failed for connection %s", connection.id)
    if synced or failed:
        logger.info("bank sync sweep: %d connection(s) synced, %d failed", synced, failed)


@shared_task
def sync_fx_rates_task() -> None:
    """Refresh today's ECB reference rates. Scheduled daily via
    CELERY_BEAT_SCHEDULE, after the ECB's ~16:00 CET publish time. See
    pft/fx_rates.py - conversion only ever reads what this has already
    stored, so a failed fetch here just means yesterday's rate keeps being
    used as the nearest one available until the next successful run.
    """
    from .fx_rates import FxRateError, fetch_and_store_rates

    try:
        stored = fetch_and_store_rates()
        logger.info("fetched FX rates for %d currencies", stored)
    except FxRateError as exc:
        logger.warning("FX rate sync failed: %s", exc)


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
