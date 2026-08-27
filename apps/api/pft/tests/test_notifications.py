"""Notifications engine: channel senders, dedupe, triggers, and the API.

See pft/notifications.py for the design (one send_notification() entry point,
a NotificationLog row per (user, kind, dedupe_key) to make re-running a beat
task safe) and pft/tasks.py for the three Celery beat wrappers this exercises
directly, the same split test_scheduled_transaction_scheduler.py uses for
materialize_due_scheduled_transactions.
"""

from datetime import date, timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core import mail
from django.db import IntegrityError
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from pft.models import (
    Account,
    BudgetFile,
    BudgetMonth,
    Category,
    EnvelopeAssignment,
    LedgerPosting,
    LedgerTransaction,
    NotificationLog,
    NotificationPreference,
    ScheduledTransaction,
)
from pft.notifications import (
    check_budget_threshold_alerts,
    is_safe_outbound_url,
    send_email,
    send_notification,
    send_ntfy,
    send_scheduled_transaction_reminders,
    send_test_notification,
    send_webhook,
    send_weekly_digest,
)
from pft.tasks import (
    check_budget_threshold_alerts_task,
    send_scheduled_transaction_reminders_task,
    send_weekly_digest_task,
)

User = get_user_model()


def _make_user(email, **prefs):
    user = User.objects.create_user(email=email, username=email, password="StrongPass123!")
    if prefs:
        NotificationPreference.objects.create(user=user, **prefs)
    return user


class IsSafeOutboundUrlTests(TestCase):
    """Literal IPs resolve without a real DNS query, so these are deterministic offline."""

    def test_rejects_non_http_scheme(self):
        self.assertFalse(is_safe_outbound_url("ftp://example.com/x"))

    def test_rejects_missing_hostname(self):
        self.assertFalse(is_safe_outbound_url("http:///no-host"))

    def test_rejects_loopback(self):
        self.assertFalse(is_safe_outbound_url("http://127.0.0.1/x"))
        self.assertFalse(is_safe_outbound_url("http://[::1]/x"))

    def test_rejects_private_ranges(self):
        self.assertFalse(is_safe_outbound_url("http://10.0.0.5/x"))
        self.assertFalse(is_safe_outbound_url("http://192.168.1.1/x"))

    def test_rejects_link_local_including_cloud_metadata(self):
        self.assertFalse(is_safe_outbound_url("http://169.254.169.254/latest/meta-data/"))

    def test_accepts_a_public_address(self):
        self.assertTrue(is_safe_outbound_url("http://8.8.8.8/x"))


class ChannelSenderTests(TestCase):
    def setUp(self):
        self.user = _make_user("sender@example.com")

    def test_send_email_respects_enabled_flag(self):
        preference = NotificationPreference.objects.create(user=self.user, email_enabled=False)
        self.assertFalse(send_email(preference, "Subject", "Body"))
        self.assertEqual(len(mail.outbox), 0)

    def test_send_email_delivers_when_enabled(self):
        preference = NotificationPreference.objects.create(user=self.user, email_enabled=True)
        self.assertTrue(send_email(preference, "Subject", "Body"))
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [self.user.email])
        self.assertEqual(mail.outbox[0].subject, "Subject")

    def test_send_ntfy_requires_topic(self):
        preference = NotificationPreference.objects.create(
            user=self.user, ntfy_enabled=True, ntfy_topic=""
        )
        self.assertFalse(send_ntfy(preference, "Subject", "Body"))

    @patch("pft.notifications.urllib.request.urlopen")
    def test_send_ntfy_posts_to_server_topic(self, mock_urlopen):
        # A literal IP, not a real hostname: is_safe_outbound_url resolves it
        # without a DNS query, so this test is deterministic without network
        # access. urlopen itself is mocked too, so nothing is actually sent.
        preference = NotificationPreference.objects.create(
            user=self.user,
            ntfy_enabled=True,
            ntfy_server_url="https://8.8.8.8",
            ntfy_topic="my-topic",
        )
        self.assertTrue(send_ntfy(preference, "Subject", "Body"))
        request = mock_urlopen.call_args[0][0]
        self.assertEqual(request.full_url, "https://8.8.8.8/my-topic")
        self.assertEqual(request.get_header("Title"), "Subject")

    @patch("pft.notifications.urllib.request.urlopen", side_effect=OSError("boom"))
    def test_send_ntfy_failure_is_swallowed(self, _mock_urlopen):
        preference = NotificationPreference.objects.create(
            user=self.user, ntfy_enabled=True, ntfy_topic="my-topic"
        )
        self.assertFalse(send_ntfy(preference, "Subject", "Body"))

    def test_send_ntfy_rejects_unsafe_server_url(self):
        preference = NotificationPreference.objects.create(
            user=self.user,
            ntfy_enabled=True,
            ntfy_server_url="http://169.254.169.254",
            ntfy_topic="my-topic",
        )
        self.assertFalse(send_ntfy(preference, "Subject", "Body"))

    @patch("pft.notifications.urllib.request.urlopen")
    def test_send_webhook_posts_json_payload(self, mock_urlopen):
        # See test_send_ntfy_posts_to_server_topic on why this is a literal IP.
        preference = NotificationPreference.objects.create(
            user=self.user, webhook_enabled=True, webhook_url="https://8.8.8.8/hook"
        )
        self.assertTrue(send_webhook(preference, "Subject", "Body", extra={"foo": "bar"}))
        request = mock_urlopen.call_args[0][0]
        self.assertEqual(request.full_url, "https://8.8.8.8/hook")
        self.assertIn(b'"foo": "bar"', request.data)

    def test_send_webhook_rejects_unsafe_url(self):
        preference = NotificationPreference.objects.create(
            user=self.user, webhook_enabled=True, webhook_url="http://192.168.0.1/hook"
        )
        self.assertFalse(send_webhook(preference, "Subject", "Body"))


class SendNotificationDedupeTests(TestCase):
    def setUp(self):
        self.user = _make_user("dedupe@example.com")
        self.preference = NotificationPreference.objects.create(
            user=self.user, email_enabled=True
        )

    def test_first_call_sends_and_logs(self):
        sent = send_notification(
            self.preference,
            kind=NotificationLog.KIND_BUDGET_THRESHOLD,
            dedupe_key="k1",
            subject="Subject",
            body="Body",
        )
        self.assertTrue(sent)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(NotificationLog.objects.count(), 1)

    def test_repeat_call_with_same_key_is_a_noop(self):
        send_notification(
            self.preference,
            kind=NotificationLog.KIND_BUDGET_THRESHOLD,
            dedupe_key="k1",
            subject="Subject",
            body="Body",
        )
        sent_again = send_notification(
            self.preference,
            kind=NotificationLog.KIND_BUDGET_THRESHOLD,
            dedupe_key="k1",
            subject="Subject",
            body="Body",
        )
        self.assertFalse(sent_again)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(NotificationLog.objects.count(), 1)

    def test_different_dedupe_key_sends_again(self):
        send_notification(
            self.preference,
            kind=NotificationLog.KIND_BUDGET_THRESHOLD,
            dedupe_key="k1",
            subject="Subject",
            body="Body",
        )
        sent = send_notification(
            self.preference,
            kind=NotificationLog.KIND_BUDGET_THRESHOLD,
            dedupe_key="k2",
            subject="Subject",
            body="Body",
        )
        self.assertTrue(sent)
        self.assertEqual(len(mail.outbox), 2)

    def test_send_test_notification_bypasses_dedupe(self):
        send_test_notification(self.preference)
        send_test_notification(self.preference)
        self.assertEqual(len(mail.outbox), 2)
        self.assertEqual(NotificationLog.objects.count(), 0)


class NotificationPreferenceModelTests(TestCase):
    def setUp(self):
        self.user = _make_user("constraints@example.com")

    def test_budget_alert_threshold_out_of_range_is_rejected_by_the_database(self):
        preference = NotificationPreference(user=self.user, budget_alert_threshold=0)
        with self.assertRaises(IntegrityError):
            preference.save()

    def test_notification_log_unique_constraint_prevents_duplicate_rows(self):
        NotificationLog.objects.create(
            user=self.user, kind=NotificationLog.KIND_WEEKLY_DIGEST, dedupe_key="2026-W10"
        )
        with self.assertRaises(IntegrityError):
            NotificationLog.objects.create(
                user=self.user, kind=NotificationLog.KIND_WEEKLY_DIGEST, dedupe_key="2026-W10"
            )


class BudgetThresholdTriggerTests(TestCase):
    def setUp(self):
        self.user = _make_user("threshold@example.com", email_enabled=True, budget_alert_threshold=80)
        self.budget_file = BudgetFile.objects.get(user=self.user, is_default=True)
        self.account = Account.objects.get(budget_file=self.budget_file, name="Cash")
        self.category = Category.objects.filter(
            budget_file=self.budget_file, kind=Category.KIND_EXPENSE
        ).first()
        self.budget_month = BudgetMonth.objects.create(
            budget_file=self.budget_file, year=2026, month=3
        )
        EnvelopeAssignment.objects.create(
            budget_month=self.budget_month, category=self.category, assigned_amount="100.00"
        )

    def _spend(self, amount):
        tx = LedgerTransaction.objects.create(
            budget_file=self.budget_file, transaction_date=date(2026, 3, 15)
        )
        LedgerPosting.objects.create(transaction=tx, account=self.account, amount=f"-{amount}")
        LedgerPosting.objects.create(transaction=tx, category=self.category, amount=amount)

    @patch("pft.notifications.timezone.now")
    def test_alert_fires_once_spend_crosses_threshold(self, mock_now):
        from django.utils import timezone as tz

        mock_now.return_value = tz.make_aware(tz.datetime(2026, 3, 20))
        self._spend("85.00")

        sent, errors = check_budget_threshold_alerts()

        self.assertEqual(errors, [])
        self.assertEqual(sent, 1)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("85%", mail.outbox[0].subject)

    @patch("pft.notifications.timezone.now")
    def test_no_alert_below_threshold(self, mock_now):
        from django.utils import timezone as tz

        mock_now.return_value = tz.make_aware(tz.datetime(2026, 3, 20))
        self._spend("50.00")

        sent, errors = check_budget_threshold_alerts()

        self.assertEqual((sent, errors), (0, []))
        self.assertEqual(len(mail.outbox), 0)

    @patch("pft.notifications.timezone.now")
    def test_rerunning_does_not_resend_the_same_months_alert(self, mock_now):
        from django.utils import timezone as tz

        mock_now.return_value = tz.make_aware(tz.datetime(2026, 3, 20))
        self._spend("85.00")

        check_budget_threshold_alerts()
        sent_again, _errors = check_budget_threshold_alerts()

        self.assertEqual(sent_again, 0)
        self.assertEqual(len(mail.outbox), 1)

    @patch("pft.notifications.timezone.now")
    def test_skips_categories_with_no_budget_month_this_period(self, mock_now):
        from django.utils import timezone as tz

        # No BudgetMonth exists for April - build_envelope_snapshot's DoesNotExist
        # must be caught, not raised.
        mock_now.return_value = tz.make_aware(tz.datetime(2026, 4, 20))

        sent, errors = check_budget_threshold_alerts()

        self.assertEqual((sent, errors), (0, []))

    @patch("pft.notifications.timezone.now")
    def test_task_wrapper_runs_without_error(self, mock_now):
        from django.utils import timezone as tz

        mock_now.return_value = tz.make_aware(tz.datetime(2026, 3, 20))
        self._spend("85.00")

        check_budget_threshold_alerts_task()  # must not raise

        self.assertEqual(len(mail.outbox), 1)


class ScheduledReminderTriggerTests(TestCase):
    def setUp(self):
        self.user = _make_user(
            "reminder@example.com", email_enabled=True, reminder_days_before=2
        )
        self.budget_file = BudgetFile.objects.get(user=self.user, is_default=True)
        self.account = Account.objects.get(budget_file=self.budget_file, name="Cash")
        self.category = Category.objects.filter(
            budget_file=self.budget_file, kind=Category.KIND_EXPENSE
        ).first()

    def _schedule(self, next_run_date):
        return ScheduledTransaction.objects.create(
            budget_file=self.budget_file,
            name="Rent",
            is_active=True,
            start_date=next_run_date,
            next_run_date=next_run_date,
            frequency=ScheduledTransaction.FREQ_MONTHLY,
            transaction_template={
                "postings": [
                    {"account_id": self.account.id, "amount": "-25.00"},
                    {"category_id": self.category.id, "amount": "25.00"},
                ]
            },
        )

    @patch("pft.notifications.timezone.now")
    def test_reminds_exactly_lead_time_before_due(self, mock_now):
        from django.utils import timezone as tz

        mock_now.return_value = tz.make_aware(tz.datetime(2026, 3, 10))
        self._schedule(date(2026, 3, 12))

        sent, errors = send_scheduled_transaction_reminders()

        self.assertEqual(errors, [])
        self.assertEqual(sent, 1)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Rent", mail.outbox[0].subject)

    @patch("pft.notifications.timezone.now")
    def test_does_not_remind_outside_the_lead_time(self, mock_now):
        from django.utils import timezone as tz

        mock_now.return_value = tz.make_aware(tz.datetime(2026, 3, 10))
        self._schedule(date(2026, 3, 20))

        sent, _errors = send_scheduled_transaction_reminders()

        self.assertEqual(sent, 0)

    @patch("pft.notifications.timezone.now")
    def test_ignores_inactive_schedules(self, mock_now):
        from django.utils import timezone as tz

        mock_now.return_value = tz.make_aware(tz.datetime(2026, 3, 10))
        schedule = self._schedule(date(2026, 3, 12))
        schedule.is_active = False
        schedule.save(update_fields=["is_active"])

        sent, _errors = send_scheduled_transaction_reminders()

        self.assertEqual(sent, 0)

    @patch("pft.notifications.timezone.now")
    def test_task_wrapper_runs_without_error(self, mock_now):
        from django.utils import timezone as tz

        mock_now.return_value = tz.make_aware(tz.datetime(2026, 3, 10))
        self._schedule(date(2026, 3, 12))

        send_scheduled_transaction_reminders_task()  # must not raise
        self.assertEqual(len(mail.outbox), 1)


class WeeklyDigestTriggerTests(TestCase):
    def setUp(self):
        self.user = _make_user("digest@example.com", email_enabled=True, weekly_digest_enabled=True)
        self.budget_file = BudgetFile.objects.get(user=self.user, is_default=True)
        self.account = Account.objects.get(budget_file=self.budget_file, name="Cash")
        self.category = Category.objects.filter(
            budget_file=self.budget_file, kind=Category.KIND_EXPENSE
        ).first()

    @patch("pft.notifications.timezone.now")
    def test_digest_summarises_the_last_seven_days(self, mock_now):
        from django.utils import timezone as tz

        today = date(2026, 3, 20)
        mock_now.return_value = tz.make_aware(tz.datetime(2026, 3, 20))

        tx = LedgerTransaction.objects.create(
            budget_file=self.budget_file, transaction_date=today - timedelta(days=2)
        )
        LedgerPosting.objects.create(transaction=tx, account=self.account, amount="-40.00")
        LedgerPosting.objects.create(transaction=tx, category=self.category, amount="40.00")

        sent, errors = send_weekly_digest()

        self.assertEqual(errors, [])
        self.assertEqual(sent, 1)
        self.assertIn("40.00", mail.outbox[0].subject)

    @patch("pft.notifications.timezone.now")
    def test_rerunning_the_same_week_does_not_resend(self, mock_now):
        from django.utils import timezone as tz

        mock_now.return_value = tz.make_aware(tz.datetime(2026, 3, 20))

        send_weekly_digest()
        sent_again, _errors = send_weekly_digest()

        self.assertEqual(sent_again, 0)
        self.assertEqual(len(mail.outbox), 1)

    @patch("pft.notifications.timezone.now")
    def test_task_wrapper_runs_without_error(self, mock_now):
        from django.utils import timezone as tz

        mock_now.return_value = tz.make_aware(tz.datetime(2026, 3, 20))

        send_weekly_digest_task()  # must not raise
        self.assertEqual(len(mail.outbox), 1)


class NotificationPreferenceAPITests(APITestCase):
    def setUp(self):
        self.user = _make_user("api-user@example.com")
        self.client.force_authenticate(user=self.user)

    def test_get_creates_default_preferences_on_first_access(self):
        self.assertFalse(NotificationPreference.objects.filter(user=self.user).exists())

        response = self.client.get("/api/v1/notifications/preferences/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(NotificationPreference.objects.filter(user=self.user).exists())
        self.assertEqual(response.data["budget_alert_threshold"], 90)

    def test_patch_updates_preferences(self):
        response = self.client.patch(
            "/api/v1/notifications/preferences/",
            {"email_enabled": True, "budget_alert_threshold": 75},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        preference = NotificationPreference.objects.get(user=self.user)
        self.assertTrue(preference.email_enabled)
        self.assertEqual(preference.budget_alert_threshold, 75)

    def test_patch_rejects_threshold_out_of_range(self):
        response = self.client.patch(
            "/api/v1/notifications/preferences/",
            {"budget_alert_threshold": 150},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_rejects_enabling_ntfy_without_a_topic(self):
        response = self.client.patch(
            "/api/v1/notifications/preferences/", {"ntfy_enabled": True}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("ntfy_topic", response.data)

    def test_patch_rejects_enabling_ntfy_against_an_already_saved_empty_topic(self):
        NotificationPreference.objects.create(user=self.user, ntfy_topic="")
        response = self.client.patch(
            "/api/v1/notifications/preferences/", {"ntfy_enabled": True}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_rejects_enabling_webhook_without_a_url(self):
        response = self.client.patch(
            "/api/v1/notifications/preferences/", {"webhook_enabled": True}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("webhook_url", response.data)

    def test_patch_rejects_unsafe_webhook_url(self):
        response = self.client.patch(
            "/api/v1/notifications/preferences/",
            {"webhook_enabled": True, "webhook_url": "http://169.254.169.254/hook"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("webhook_url", response.data)

    def test_unauthenticated_request_is_rejected(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/v1/notifications/preferences/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class NotificationTestSendAPITests(APITestCase):
    def setUp(self):
        self.user = _make_user("test-send@example.com")
        self.client.force_authenticate(user=self.user)

    def test_no_channel_enabled_returns_400(self):
        response = self.client.post("/api/v1/notifications/test/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_sends_on_every_enabled_channel(self):
        NotificationPreference.objects.create(user=self.user, email_enabled=True)

        response = self.client.post("/api/v1/notifications/test/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["attempted_channels"], ["email"])
        self.assertEqual(len(mail.outbox), 1)

    def test_test_send_does_not_create_a_notification_log_row(self):
        NotificationPreference.objects.create(user=self.user, email_enabled=True)
        self.client.post("/api/v1/notifications/test/")
        self.assertEqual(NotificationLog.objects.count(), 0)
