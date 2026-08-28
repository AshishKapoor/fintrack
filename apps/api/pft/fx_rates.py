"""Daily ECB reference rates via frankfurter.app - ROADMAP.md Phase 2's "Real
multi-currency" item. See FxRate's docstring for why only EUR-based pairs are
stored; convert_amount triangulates through EUR for everything else.

Conversion (convert_amount) only ever reads FxRate rows already in the
database - nothing in a balance/net-worth request makes a network call, so a
slow or down frankfurter.app can never add latency or fail a normal API
request. fetch_and_store_rates is what actually populates the table: a daily
Celery beat tick (tasks.sync_fx_rates_task), a `manage.py sync_fx_rates`
management command for bare-metal installs without a beat process, and a
manual "sync now" API action for a fresh instance that would otherwise wait
for tomorrow's beat tick - the same pattern as notifications' send-test
action.
"""

import logging
import urllib.error
import urllib.request
from datetime import date as date_cls
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.utils import timezone

from .models import FxRate
from .notifications import is_safe_outbound_url

logger = logging.getLogger(__name__)

HTTP_TIMEOUT_SECONDS = 10


class FxRateError(Exception):
    pass


def _fetch(path: str) -> dict:
    import json

    # Read fresh (not cached at import time) so both a real .env change and
    # Django's test-only override_settings take effect immediately.
    url = f"{settings.FRANKFURTER_BASE_URL}{path}"
    # FRANKFURTER_BASE_URL is instance config, not per-request user input, but
    # guarding it costs nothing and matches bank_sync_gocardless/simplefin's
    # own outbound requests - defense in depth against a bad override.
    if not is_safe_outbound_url(url):
        raise FxRateError("FRANKFURTER_BASE_URL is not a safe outbound target.")
    request = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=HTTP_TIMEOUT_SECONDS) as response:
            return json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, OSError, ValueError) as exc:
        raise FxRateError(f"Could not reach frankfurter.app: {exc}") from exc


def fetch_and_store_rates(*, as_of: date_cls | None = None) -> int:
    """Fetch EUR-based rates for `as_of` (default: latest) and upsert FxRate rows.

    Returns the number of currencies stored. frankfurter.app has no rates on
    weekends/ECB holidays and instead returns the most recent prior business
    day's date and figures - rows are stored under the date it actually
    reports, not the one asked for, so repeated calls converge instead of
    creating a new row every time.
    """
    path = f"/{as_of.isoformat()}" if as_of else "/latest"
    payload = _fetch(f"{path}?from=EUR")
    try:
        rate_date = date_cls.fromisoformat(payload["date"])
        rates = payload["rates"]
    except (KeyError, TypeError, ValueError) as exc:
        raise FxRateError(
            f"Unexpected response from frankfurter.app: {payload}"
        ) from exc

    stored = 0
    for currency_code, value in rates.items():
        try:
            rate = Decimal(str(value))
        except InvalidOperation:
            continue
        FxRate.objects.update_or_create(
            rate_date=rate_date,
            currency_code=currency_code.upper(),
            defaults={"rate": rate},
        )
        stored += 1

    # EUR itself is implicit (never returned by the API) but every lookup
    # should be able to go through one path, including EUR->EUR.
    FxRate.objects.update_or_create(
        rate_date=rate_date, currency_code="EUR", defaults={"rate": Decimal("1")}
    )
    return stored + 1


def _nearest_rate(currency_code: str, as_of: date_cls) -> FxRate | None:
    return (
        FxRate.objects.filter(currency_code=currency_code.upper(), rate_date__lte=as_of)
        .order_by("-rate_date")
        .first()
    )


def convert_amount(
    amount: Decimal,
    from_currency: str,
    to_currency: str,
    *,
    as_of: date_cls | None = None,
) -> Decimal | None:
    """Convert `amount` using the nearest stored rate on or before `as_of`.

    Returns None - never a wrong number - if a needed rate has not been
    fetched yet (a brand-new instance before its first sync, or a currency
    frankfurter.app does not quote); callers show the native amount only in
    that case rather than a converted figure that looks precise but isn't.
    """
    from_currency = (from_currency or "").upper()
    to_currency = (to_currency or "").upper()
    if not from_currency or not to_currency or from_currency == to_currency:
        return amount

    as_of = as_of or timezone.now().date()
    precision = Decimal("0.0001")

    if from_currency == "EUR":
        to_rate = _nearest_rate(to_currency, as_of)
        return (amount * to_rate.rate).quantize(precision) if to_rate else None

    from_rate = _nearest_rate(from_currency, as_of)
    if not from_rate:
        return None
    in_eur = amount / from_rate.rate

    if to_currency == "EUR":
        return in_eur.quantize(precision)

    to_rate = _nearest_rate(to_currency, as_of)
    return (in_eur * to_rate.rate).quantize(precision) if to_rate else None


def has_any_rates() -> bool:
    return FxRate.objects.exists()
