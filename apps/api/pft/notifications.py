"""Outbound notifications: email, ntfy, webhook - and the three triggers.

`send_notification()` is the one entry point every trigger goes through. It
fans out to whichever channels the recipient enabled and records a
NotificationLog row so a periodic sweep never re-sends the same alert - see
the model's docstring for why that matters and how the DB constraint backs
it.

Channel sends are best-effort and never raise: a broken webhook URL must not
stop a user's email from going out, and must not wedge a beat task partway
through every other user's alerts (the same on_error="skip" principle as
materialize_due_scheduled_transactions_task). A failed channel is simply
logged - there is no retry queue. For alerts like these (as opposed to, say,
a password reset email) an occasional missed send because SMTP hiccuped is a
better failure mode than a duplicate one because a naive retry fired twice.
"""

import ipaddress
import json
import logging
import smtplib
import socket
import urllib.error
import urllib.request
from datetime import timedelta
from decimal import Decimal
from urllib.parse import urlsplit

from django.conf import settings
from django.core.mail import send_mail
from django.db.models import Sum
from django.utils import timezone

from .models import (
    BudgetMonth,
    CategoryV2,
    LedgerPosting,
    NotificationLog,
    NotificationPreference,
    ScheduledTransaction,
)
from .tenancy import accessible_budget_files

logger = logging.getLogger(__name__)

HTTP_TIMEOUT_SECONDS = 10


def is_safe_outbound_url(url: str) -> bool:
    """Reject URLs that could point the server at its own internal network.

    ntfy server URLs and webhook URLs are both user-supplied addresses the
    *server* makes a request to, on a schedule the user doesn't control
    (a beat task, not their own browser) - the classic SSRF shape, and worth
    guarding against even in a single-tenant deployment, since self-hosting
    is the primary use case and a FinTrack instance often shares a private
    network with other, less guarded services. Best-effort, not bulletproof:
    the hostname is re-resolved (and re-checked) immediately before every
    send in send_ntfy/send_webhook rather than trusted from validation time,
    but a DNS answer can still change in the window between that check and
    the connection itself. Good enough against casual misconfiguration and
    most real SSRF attempts; not a substitute for network-level egress
    controls if that matters for your deployment.
    """
    try:
        parts = urlsplit(url)
    except ValueError:
        return False
    if parts.scheme not in ("http", "https") or not parts.hostname:
        return False
    try:
        infos = socket.getaddrinfo(parts.hostname, None)
    except socket.gaierror:
        return False
    if not infos:
        return False
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
        ):
            return False
    return True


def send_email(preference: NotificationPreference, subject: str, body: str) -> bool:
    if not preference.email_enabled or not preference.user.email:
        return False
    try:
        send_mail(
            subject,
            body,
            settings.DEFAULT_FROM_EMAIL,
            [preference.user.email],
            fail_silently=False,
        )
        return True
    except (smtplib.SMTPException, OSError, ValueError) as exc:
        logger.warning("email notification to user %s failed: %s", preference.user_id, exc)
        return False


def send_ntfy(preference: NotificationPreference, subject: str, body: str) -> bool:
    if not preference.ntfy_enabled or not preference.ntfy_topic:
        return False
    base = preference.ntfy_server_url.rstrip("/")
    url = f"{base}/{preference.ntfy_topic}"
    if not is_safe_outbound_url(url):
        logger.warning("ntfy server URL for user %s is not a safe outbound target", preference.user_id)
        return False
    request = urllib.request.Request(
        url,
        data=body.encode("utf-8"),
        headers={
            # ntfy titles are transported as a raw header value, which must be
            # Latin-1/ASCII - non-ASCII characters fall back to '?' rather than
            # breaking the request.
            "Title": subject.encode("ascii", "replace").decode("ascii"),
            "Content-Type": "text/plain; charset=utf-8",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=HTTP_TIMEOUT_SECONDS):
            pass
        return True
    except (urllib.error.URLError, OSError) as exc:
        logger.warning("ntfy notification to user %s failed: %s", preference.user_id, exc)
        return False


def send_webhook(
    preference: NotificationPreference, subject: str, body: str, *, extra: dict | None = None
) -> bool:
    if not preference.webhook_enabled or not preference.webhook_url:
        return False
    if not is_safe_outbound_url(preference.webhook_url):
        logger.warning("webhook URL for user %s is not a safe outbound target", preference.user_id)
        return False
    payload = json.dumps({"title": subject, "body": body, **(extra or {})}).encode("utf-8")
    request = urllib.request.Request(
        preference.webhook_url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=HTTP_TIMEOUT_SECONDS):
            pass
        return True
    except (urllib.error.URLError, OSError) as exc:
        logger.warning("webhook notification to user %s failed: %s", preference.user_id, exc)
        return False


def send_notification(
    preference: NotificationPreference,
    *,
    kind: str,
    dedupe_key: str,
    subject: str,
    body: str,
    extra: dict | None = None,
) -> bool:
    """Send over every enabled channel, deduped by (user, kind, dedupe_key).

    Returns True the first time this exact key is seen (a send was
    attempted - individual channels may still have failed, see their own
    logging), False on a repeat call for a key already logged.
    """
    _, created = NotificationLog.objects.get_or_create(
        user=preference.user, kind=kind, dedupe_key=dedupe_key
    )
    if not created:
        return False

    send_email(preference, subject, body)
    send_ntfy(preference, subject, body)
    send_webhook(preference, subject, body, extra=extra)
    return True


def send_test_notification(preference: NotificationPreference) -> list[str]:
    """Fire a test message now, bypassing dedupe. Returns the channels attempted."""
    subject = "FinTrack test notification"
    body = "This is a test notification from FinTrack. If you can see this, the channel works."
    attempted = []
    if preference.email_enabled:
        attempted.append("email")
        send_email(preference, subject, body)
    if preference.ntfy_enabled:
        attempted.append("ntfy")
        send_ntfy(preference, subject, body)
    if preference.webhook_enabled:
        attempted.append("webhook")
        send_webhook(preference, subject, body, extra={"test": True})
    return attempted


# --- Triggers ----------------------------------------------------------------
# Each of these is a thin loop over NotificationPreference; the Celery beat
# wrapper for each lives in tasks.py, mirroring materialize_due_scheduled_
# transactions/_task's service-function/task split. Every preference is
# handled inside its own try/except so one user's bad data (or a transient
# failure reaching their channel) never blocks the rest of the sweep.


def check_budget_threshold_alerts() -> tuple[int, list[tuple[int, str]]]:
    """Alert on any envelope category that has crossed its owner's threshold.

    Every budget file the user can access is checked, for the current
    calendar month only - a category with no budget set this month (no
    BudgetMonth row yet) is silently skipped rather than treated as 0%.
    """
    today = timezone.now().date()
    year, month = today.year, today.month
    sent = 0
    errors = []

    from .finance_services import build_envelope_snapshot

    preferences = NotificationPreference.objects.filter(
        budget_alerts_enabled=True
    ).select_related("user")
    for preference in preferences:
        try:
            for budget_file in accessible_budget_files(preference.user):
                try:
                    snapshot = build_envelope_snapshot(budget_file, year, month)
                except BudgetMonth.DoesNotExist:
                    continue
                for row in snapshot["assignments"]:
                    assigned = Decimal(row["assigned"]) + Decimal(row["carryover"])
                    if assigned <= 0:
                        continue
                    spent = Decimal(row["spent"])
                    percent = (spent / assigned) * 100
                    if percent < preference.budget_alert_threshold:
                        continue
                    dedupe_key = f"{budget_file.id}:{year}-{month:02d}:{row['category_id']}"
                    if send_notification(
                        preference,
                        kind=NotificationLog.KIND_BUDGET_THRESHOLD,
                        dedupe_key=dedupe_key,
                        subject=f"Budget alert: {row['category']} is at {percent:.0f}%",
                        body=(
                            f"{row['category']} in \"{budget_file.name}\" has used "
                            f"{spent} of {assigned} ({percent:.0f}%) budgeted for "
                            f"{year}-{month:02d}."
                        ),
                        extra={
                            "budget_file_id": budget_file.id,
                            "category_id": row["category_id"],
                            "percent": float(percent),
                        },
                    ):
                        sent += 1
        except Exception as exc:  # one bad preference must not block the rest
            message = f"Notification preference {preference.id}: {exc}"
            logger.warning(message)
            errors.append((preference.id, message))

    return sent, errors


def send_scheduled_transaction_reminders() -> tuple[int, list[tuple[int, str]]]:
    """Remind about any active schedule due in exactly `reminder_days_before` days.

    Keyed on the schedule's *current* next_run_date, so once it materializes
    and next_run_date advances, the following occurrence gets its own fresh
    reminder rather than being silently skipped as "already sent".
    """
    today = timezone.now().date()
    sent = 0
    errors = []

    preferences = NotificationPreference.objects.filter(
        reminders_enabled=True
    ).select_related("user")
    for preference in preferences:
        try:
            target_date = today + timedelta(days=preference.reminder_days_before)
            schedules = ScheduledTransaction.objects.filter(
                budget_file__in=accessible_budget_files(preference.user),
                is_active=True,
                next_run_date=target_date,
            ).select_related("budget_file")
            for schedule in schedules:
                dedupe_key = f"{schedule.id}:{schedule.next_run_date.isoformat()}"
                if send_notification(
                    preference,
                    kind=NotificationLog.KIND_SCHEDULED_REMINDER,
                    dedupe_key=dedupe_key,
                    subject=f"Upcoming: {schedule.name}",
                    body=(
                        f"\"{schedule.name}\" in \"{schedule.budget_file.name}\" is "
                        f"scheduled to post on {schedule.next_run_date.isoformat()}."
                    ),
                    extra={"scheduled_transaction_id": schedule.id},
                ):
                    sent += 1
        except Exception as exc:
            message = f"Notification preference {preference.id}: {exc}"
            logger.warning(message)
            errors.append((preference.id, message))

    return sent, errors


def send_weekly_digest() -> tuple[int, list[tuple[int, str]]]:
    """A Monday-morning summary: last 7 days of spend/income, next 7 days of bills."""
    today = timezone.now().date()
    week_start = today - timedelta(days=7)
    iso_year, iso_week, _ = today.isocalendar()
    dedupe_key = f"{iso_year}-W{iso_week:02d}"
    sent = 0
    errors = []

    preferences = NotificationPreference.objects.filter(
        weekly_digest_enabled=True
    ).select_related("user")
    for preference in preferences:
        try:
            budget_files = list(accessible_budget_files(preference.user))
            if not budget_files:
                continue

            postings = LedgerPosting.objects.filter(
                transaction__budget_file__in=budget_files,
                transaction__transaction_date__gt=week_start,
                transaction__transaction_date__lte=today,
                category__isnull=False,
            )
            spent = postings.filter(
                category__kind=CategoryV2.KIND_EXPENSE
            ).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
            income = postings.filter(
                category__kind=CategoryV2.KIND_INCOME
            ).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")

            upcoming = list(
                ScheduledTransaction.objects.filter(
                    budget_file__in=budget_files,
                    is_active=True,
                    next_run_date__gt=today,
                    next_run_date__lte=today + timedelta(days=7),
                )
                .order_by("next_run_date")
                .values_list("name", "next_run_date")[:10]
            )

            body_lines = [
                f"Spending in the last 7 days: {spent}",
                f"Income in the last 7 days: {abs(income)}",
            ]
            if upcoming:
                body_lines.append("")
                body_lines.append("Coming up in the next 7 days:")
                body_lines.extend(f"- {name} on {due.isoformat()}" for name, due in upcoming)

            if send_notification(
                preference,
                kind=NotificationLog.KIND_WEEKLY_DIGEST,
                dedupe_key=dedupe_key,
                subject=f"Your week: {spent} spent, {abs(income)} in",
                body="\n".join(body_lines),
                extra={"spent": str(spent), "income": str(abs(income))},
            ):
                sent += 1
        except Exception as exc:
            message = f"Notification preference {preference.id}: {exc}"
            logger.warning(message)
            errors.append((preference.id, message))

    return sent, errors
