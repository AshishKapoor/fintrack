"""SimpleFIN Bridge (US/CA) - a community-contribution target against the
adapter interface, per ROADMAP.md, and the reference implementation for
"needs no instance-wide config" providers.

Protocol: https://www.simplefin.org/protocol.html. A user gets a one-time
base64 "setup token" from their SimpleFIN bridge (e.g. their bank's SimpleFIN
app, or a self-hosted bridge), which decodes to a claim URL. POSTing to that
URL (no body) returns the durable "access URL" - an HTTPS URL with the actual
credential embedded as Basic-auth userinfo - which is what every subsequent
accounts/transactions call authenticates with. There is no separate
connection-level id or refresh step: the access URL *is* the connection, so
start_link both claims it and activates the connection in one call, and
finish_link is a no-op.

Because the claim URL and access URL both come from user-supplied input (the
setup token), both are treated as untrusted outbound targets - the same SSRF
concern notifications.py guards ntfy/webhook URLs against, and worth taking
just as seriously here: a crafted token could otherwise point this server's
own credentialed request at its private network.
"""

import base64
import binascii
import json
import logging
import urllib.error
import urllib.request
from datetime import date, timedelta
from decimal import Decimal
from urllib.parse import urlsplit, urlunsplit

from django.utils import timezone

from .bank_sync import (
    INITIAL_SYNC_DAYS,
    BankSyncError,
    BankSyncProvider,
    ProviderAccount,
    ProviderTransaction,
)
from .crypto import decrypt_json, encrypt_json
from .models import SyncConnection
from .notifications import is_safe_outbound_url

logger = logging.getLogger(__name__)

HTTP_TIMEOUT_SECONDS = 20


def _split_auth(url: str) -> tuple[str, dict]:
    """Pull Basic-auth userinfo out of a URL into a header, since
    urllib.request does not send it automatically from the URL alone."""
    parts = urlsplit(url)
    if not parts.username:
        return url, {}
    netloc = parts.hostname or ""
    if parts.port:
        netloc += f":{parts.port}"
    clean_url = urlunsplit((parts.scheme, netloc, parts.path, parts.query, parts.fragment))
    token = base64.b64encode(
        f"{parts.username}:{parts.password or ''}".encode()
    ).decode("ascii")
    return clean_url, {"Authorization": f"Basic {token}"}


def _request(url: str, *, method: str = "GET") -> bytes:
    if not is_safe_outbound_url(url):
        raise BankSyncError("That SimpleFIN URL is not a safe outbound target.")

    clean_url, auth_headers = _split_auth(url)
    request = urllib.request.Request(
        clean_url, headers={"Accept": "application/json", **auth_headers}, method=method
    )
    try:
        with urllib.request.urlopen(request, timeout=HTTP_TIMEOUT_SECONDS) as response:
            return response.read()
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")[:500]
        raise BankSyncError(f"SimpleFIN request failed ({exc.code}): {detail}") from exc
    except (urllib.error.URLError, OSError) as exc:
        raise BankSyncError(f"SimpleFIN request failed: {exc}") from exc


def _claim_access_url(setup_token: str) -> str:
    try:
        claim_url = base64.b64decode(setup_token.strip(), validate=True).decode("utf-8")
    except (binascii.Error, ValueError, UnicodeDecodeError) as exc:
        raise BankSyncError("That does not look like a valid SimpleFIN setup token.") from exc

    if not claim_url.startswith(("http://", "https://")):
        raise BankSyncError("That does not look like a valid SimpleFIN setup token.")

    access_url = _request(claim_url, method="POST").decode("utf-8").strip()
    if not access_url.startswith(("http://", "https://")):
        raise BankSyncError("SimpleFIN did not return a usable access URL.")
    return access_url


def _access_url(connection: SyncConnection) -> str:
    secret = decrypt_json(connection.secret_data)
    access_url = secret.get("access_url")
    if not access_url:
        raise BankSyncError("This connection has no stored SimpleFIN access URL.")
    return access_url


class SimpleFinProvider(BankSyncProvider):
    key = SyncConnection.PROVIDER_SIMPLEFIN
    label = "SimpleFIN Bridge"

    def start_link(self, connection: SyncConnection, params: dict) -> dict:
        setup_token = (params or {}).get("setup_token")
        if not setup_token:
            raise BankSyncError("setup_token is required to connect a SimpleFIN bridge.")

        access_url = _claim_access_url(setup_token)
        connection.secret_data = encrypt_json({"access_url": access_url})
        connection.institution_name = connection.institution_name or "SimpleFIN Bridge"
        connection.status = SyncConnection.STATUS_ACTIVE
        connection.last_error = ""
        connection.save(
            update_fields=[
                "secret_data",
                "institution_name",
                "status",
                "last_error",
                "updated_at",
            ]
        )
        return {"status": "active"}

    def list_accounts(self, connection: SyncConnection) -> list[ProviderAccount]:
        access_url = _access_url(connection)
        payload = json.loads(_request(f"{access_url}/accounts?balances-only=1"))
        accounts = []
        for row in payload.get("accounts", []):
            org = row.get("org") or {}
            name = row.get("name") or org.get("name") or row["id"]
            accounts.append(
                ProviderAccount(
                    external_id=row["id"],
                    name=name,
                    currency_code=(row.get("currency") or "USD").upper(),
                    raw=row,
                )
            )
        errors = payload.get("errors") or []
        if errors and not accounts:
            raise BankSyncError("; ".join(errors)[:500])
        return accounts

    def fetch_transactions(self, connection, linked_account, *, since: date | None):
        access_url = _access_url(connection)
        start = since or (timezone.now().date() - timedelta(days=INITIAL_SYNC_DAYS))
        start_epoch = int(
            timezone.make_aware(
                timezone.datetime(start.year, start.month, start.day)
            ).timestamp()
        )
        url = (
            f"{access_url}/accounts?start-date={start_epoch}"
            f"&account={linked_account.external_account_id}"
        )
        payload = json.loads(_request(url))

        rows = []
        for account in payload.get("accounts", []):
            if account.get("id") != linked_account.external_account_id:
                continue
            for tx in account.get("transactions", []):
                posted = tx.get("posted") or tx.get("transacted_at")
                if posted is None or tx.get("amount") is None:
                    continue
                payee = tx.get("payee") or tx.get("description") or ""
                memo = tx.get("memo") or (
                    tx.get("description") if tx.get("payee") else ""
                ) or ""
                rows.append(
                    ProviderTransaction(
                        external_id=str(tx["id"]),
                        transaction_date=timezone.datetime.fromtimestamp(
                            int(posted), tz=timezone.get_default_timezone()
                        ).date(),
                        amount=Decimal(str(tx["amount"])),
                        payee=payee,
                        memo=memo,
                    )
                )
        return rows


provider = SimpleFinProvider()
