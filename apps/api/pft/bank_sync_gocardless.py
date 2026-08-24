"""GoCardless Bank Account Data - the reference bank sync provider (EU/UK,
free tier for a reasonable number of connections). API docs:
https://developer.gocardless.com/bank-account-data/overview

Unlike a per-user webhook URL, GOCARDLESS_SECRET_ID/SECRET_KEY are
instance-wide: the self-hoster registers their own free GoCardless developer
account and puts the pair in .env (see docs/self-hosting.md#bank-sync), the
same shape as EMAIL_HOST for outbound mail. Every SyncConnection on the
instance authenticates through that one pair; what's per-connection is the
requisition (one bank login) it creates.

Linking is redirect-based ("open banking" style): start_link creates an end
user agreement and a requisition and hands back the bank's own consent page
URL; the user authenticates there and GoCardless redirects them back to
FINTRACK_FRONTEND_URL, at which point the frontend calls finish_link to
confirm the requisition reached status LN (linked) and discover accounts.
"""

import json
import logging
import urllib.error
import urllib.request
from datetime import date
from decimal import Decimal

from django.conf import settings
from django.core.cache import cache

from .bank_sync import (
    BankSyncError,
    BankSyncProvider,
    ProviderAccount,
    ProviderInstitution,
    ProviderTransaction,
)
from .crypto import encrypt_json
from .models import SyncConnection
from .notifications import is_safe_outbound_url

logger = logging.getLogger(__name__)

HTTP_TIMEOUT_SECONDS = 20
TOKEN_CACHE_KEY = "gocardless:access_token"
# Requested, not guaranteed - GoCardless caps this per institution/agreement.
MAX_HISTORICAL_DAYS = 730
ACCESS_VALID_DAYS = 90


def _base_url() -> str:
    return settings.GOCARDLESS_API_BASE_URL.rstrip("/")


def _request(method: str, path: str, *, token: str | None = None, body: dict | None = None) -> dict:
    url = f"{_base_url()}{path}"
    if not is_safe_outbound_url(url):
        raise BankSyncError("GOCARDLESS_API_BASE_URL is not a safe outbound target.")

    headers = {"Accept": "application/json"}
    data = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode("utf-8")
    if token:
        headers["Authorization"] = f"Bearer {token}"

    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=HTTP_TIMEOUT_SECONDS) as response:
            raw = response.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")[:500]
        raise BankSyncError(f"GoCardless {method} {path} failed ({exc.code}): {detail}") from exc
    except (urllib.error.URLError, OSError, ValueError) as exc:
        raise BankSyncError(f"GoCardless {method} {path} failed: {exc}") from exc


def _get_access_token() -> str:
    cached = cache.get(TOKEN_CACHE_KEY)
    if cached:
        return cached

    if not settings.GOCARDLESS_SECRET_ID or not settings.GOCARDLESS_SECRET_KEY:
        raise BankSyncError(
            "GoCardless is not configured on this instance "
            "(GOCARDLESS_SECRET_ID/GOCARDLESS_SECRET_KEY are unset)."
        )

    payload = _request(
        "POST",
        "/token/new/",
        body={
            "secret_id": settings.GOCARDLESS_SECRET_ID,
            "secret_key": settings.GOCARDLESS_SECRET_KEY,
        },
    )
    token = payload.get("access")
    expires_in = int(payload.get("access_expires") or 3600)
    if not token:
        raise BankSyncError("GoCardless did not return an access token.")
    # Refresh a little early so a token never expires mid-request.
    cache.set(TOKEN_CACHE_KEY, token, timeout=max(expires_in - 60, 60))
    return token


def _redirect_url(connection: SyncConnection) -> str:
    frontend = settings.FINTRACK_FRONTEND_URL.rstrip("/")
    return f"{frontend}/bank-sync/callback?connection={connection.id}"


class GoCardlessProvider(BankSyncProvider):
    key = SyncConnection.PROVIDER_GOCARDLESS
    label = "GoCardless Bank Account Data"

    def is_configured(self) -> bool:
        return bool(settings.GOCARDLESS_SECRET_ID and settings.GOCARDLESS_SECRET_KEY)

    def list_institutions(self, *, country: str) -> list[ProviderInstitution]:
        if not country:
            raise BankSyncError("country is required to list institutions.")
        cache_key = f"gocardless:institutions:{country.upper()}"
        cached = cache.get(cache_key)
        if cached is not None:
            return [ProviderInstitution(**row) for row in cached]

        token = _get_access_token()
        rows = _request(
            "GET", f"/institutions/?country={country.lower()}", token=token
        )
        if not isinstance(rows, list):
            raise BankSyncError("Unexpected response listing institutions.")
        institutions = [
            ProviderInstitution(
                id=row["id"], name=row.get("name", row["id"]), logo=row.get("logo", "")
            )
            for row in rows
        ]
        cache.set(
            cache_key,
            [inst.__dict__ for inst in institutions],
            timeout=3600,
        )
        return institutions

    def start_link(self, connection: SyncConnection, params: dict) -> dict:
        institution_id = (params or {}).get("institution_id")
        if not institution_id:
            raise BankSyncError("institution_id is required to start a GoCardless link.")

        token = _get_access_token()
        agreement = _request(
            "POST",
            "/agreements/enduser/",
            token=token,
            body={
                "institution_id": institution_id,
                "max_historical_days": MAX_HISTORICAL_DAYS,
                "access_valid_for_days": ACCESS_VALID_DAYS,
                "access_scope": ["balances", "details", "transactions"],
            },
        )
        requisition = _request(
            "POST",
            "/requisitions/",
            token=token,
            body={
                "redirect": _redirect_url(connection),
                "institution_id": institution_id,
                "reference": str(connection.id),
                "agreement": agreement["id"],
                "user_language": "EN",
            },
        )

        connection.external_reference = requisition["id"]
        connection.settings = {**(connection.settings or {}), "institution_id": institution_id}
        connection.secret_data = encrypt_json(
            {"requisition_id": requisition["id"], "agreement_id": agreement["id"]}
        )
        connection.save(
            update_fields=["external_reference", "settings", "secret_data", "updated_at"]
        )
        return {"redirect_url": requisition["link"]}

    def finish_link(self, connection: SyncConnection, params: dict) -> None:
        token = _get_access_token()
        requisition = _request(
            "GET", f"/requisitions/{connection.external_reference}/", token=token
        )
        status = requisition.get("status")
        if status != "LN":
            raise BankSyncError(
                f"Bank did not finish linking (requisition status: {status or 'unknown'})."
            )
        connection.status = SyncConnection.STATUS_ACTIVE
        connection.last_error = ""
        connection.save(update_fields=["status", "last_error", "updated_at"])

    def list_accounts(self, connection: SyncConnection) -> list[ProviderAccount]:
        token = _get_access_token()
        requisition = _request(
            "GET", f"/requisitions/{connection.external_reference}/", token=token
        )
        accounts = []
        for account_id in requisition.get("accounts", []):
            details = _request(
                "GET", f"/accounts/{account_id}/details/", token=token
            ).get("account", {})
            name = (
                details.get("name")
                or details.get("ownerName")
                or details.get("iban")
                or account_id
            )
            accounts.append(
                ProviderAccount(
                    external_id=account_id,
                    name=name,
                    currency_code=(details.get("currency") or "EUR").upper(),
                    iban=details.get("iban", ""),
                    raw=details,
                )
            )
        return accounts

    def fetch_transactions(self, connection, linked_account, *, since: date | None):
        token = _get_access_token()
        path = f"/accounts/{linked_account.external_account_id}/transactions/"
        if since:
            path += f"?date_from={since.isoformat()}"
        payload = _request("GET", path, token=token)
        booked = (payload.get("transactions") or {}).get("booked") or []

        rows = []
        for entry in booked:
            external_id = (
                entry.get("transactionId")
                or entry.get("internalTransactionId")
                or _fallback_id(entry)
            )
            posted = entry.get("bookingDate") or entry.get("valueDate")
            amount_info = entry.get("transactionAmount") or {}
            if not external_id or not posted or amount_info.get("amount") is None:
                continue

            payee = entry.get("creditorName") or entry.get("debtorName") or ""
            memo = entry.get("remittanceInformationUnstructured") or ""
            if not memo:
                lines = entry.get("remittanceInformationUnstructuredArray") or []
                memo = " ".join(lines)

            rows.append(
                ProviderTransaction(
                    external_id=external_id,
                    transaction_date=date.fromisoformat(posted[:10]),
                    # GoCardless already signs this (negative = debit).
                    amount=Decimal(str(amount_info["amount"])),
                    payee=payee,
                    memo=memo,
                )
            )
        return rows

    def disconnect(self, connection: SyncConnection) -> None:
        if not connection.external_reference:
            return
        try:
            token = _get_access_token()
            _request(
                "DELETE",
                f"/requisitions/{connection.external_reference}/",
                token=token,
            )
        except BankSyncError as exc:
            logger.warning(
                "failed to revoke GoCardless requisition for connection %s: %s",
                connection.id,
                exc,
            )


def _fallback_id(entry: dict) -> str:
    """Some institutions omit transactionId. A hash of the fields GoCardless
    does guarantee is stable across repeated fetches of the same statement,
    which is all match_key-based dedup needs."""
    import hashlib

    basis = json.dumps(entry, sort_keys=True)
    return "h" + hashlib.sha256(basis.encode("utf-8")).hexdigest()[:32]


provider = GoCardlessProvider()
