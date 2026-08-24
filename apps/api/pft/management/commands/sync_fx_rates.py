from django.core.management.base import BaseCommand, CommandError

from pft.fx_rates import FxRateError, fetch_and_store_rates


class Command(BaseCommand):
    help = (
        "Fetch today's ECB reference rates from frankfurter.app and store them. "
        "A beat process runs this daily (see CELERY_BEAT_SCHEDULE in "
        "app/settings/base.py); bare-metal installs without one should cron this "
        "instead - see docs/self-hosting.md#real-multi-currency."
    )

    def handle(self, *args, **options):
        try:
            stored = fetch_and_store_rates()
        except FxRateError as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write(self.style.SUCCESS(f"Stored FX rates for {stored} currencies."))
