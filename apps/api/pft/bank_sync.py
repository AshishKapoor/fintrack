"""The bank sync provider contract - see ROADMAP.md Phase 2.

`BankSyncProvider` is the interface a provider plugin implements; everything
provider-agnostic (turning fetched transactions into ledger rows, reusing the
existing import dedup and rules pipeline) lives here once, in
`ingest_transactions`/`sync_connection`, so a provider only has to answer
"what accounts does this connection see" and "what transactions happened on
one of them" - the same shape as parse_import_rows in finance_services.py,
just pulled instead of pasted.

Adding a provider (see docs/bank-sync.md): implement BankSyncProvider,
register it in PROVIDERS below, and add its choice to
SyncConnection.PROVIDER_CHOICES.
"""

import abc
import logging
from dataclasses import dataclass, field
from datetime import date, timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from .models import (
    LedgerPosting,
    LedgerTransaction,
    SyncConnection,
    SyncConnectionAccount,
    TransactionEvent,
)

logger = logging.getLogger(__name__)

# How far to re-fetch past the last successful sync. Providers report
# transactions by date, not a true append-only cursor, and a transaction can
# still be "pending" (or simply not yet posted by the bank) on the day it
# first appears - re-covering a small trailing window on every run is what
# lets it get picked up once it settles, at the cost of re-fetching (not
# re-creating: match_key still dedupes it) a handful of already-seen rows
# each time.
SYNC_OVERLAP_DAYS = 5

# First-ever sync of a newly-mapped account: how far back to look. GoCardless's
# free tier and most SimpleFIN bridges cap how much transaction history is
# available at all, so asking for more than this just wastes a call.
INITIAL_SYNC_DAYS = 90


class BankSyncError(Exception):
    """Raised by a provider (or the shared ingest path) for any failure the
    caller should surface as a connection error rather than a crash."""


@dataclass
class ProviderInstitution:
    id: str
    name: str
    logo: str = ""


@dataclass
class ProviderAccount:
    external_id: str
    name: str
    currency_code: str
    iban: str = ""
    raw: dict = field(default_factory=dict)


@dataclass
class ProviderTransaction:
    external_id: str
    transaction_date: date
    # Signed the same way a LedgerPosting.amount on the account leg is:
    # positive = money in, negative = money out.
    amount: Decimal
    payee: str = ""
    memo: str = ""


class BankSyncProvider(abc.ABC):
    key: str
    label: str

    def is_configured(self) -> bool:
        """Whether this provider has whatever instance-wide setup it needs
        (e.g. GoCardless's GOCARDLESS_SECRET_ID/KEY). SimpleFIN needs none,
        so it is always available."""
        return True

    def list_institutions(self, *, country: str) -> list[ProviderInstitution]:
        """Institutions a user could pick from. Providers with no such concept
        (SimpleFIN links whatever bridge the user already set up) return []."""
        return []

    @abc.abstractmethod
    def start_link(self, connection: SyncConnection, params: dict) -> dict:
        """Begin linking. `params` is caller-supplied (e.g. {institution_id}
        for GoCardless, {setup_token} for SimpleFIN). Returns a dict relayed
        straight back to the API caller, e.g. {"redirect_url": ...} for a
        provider that needs the user to authenticate at their bank, or
        {"status": "active"} for one that doesn't."""

    def finish_link(self, connection: SyncConnection, params: dict) -> None:
        """Complete linking after the user returns from an external redirect.
        A no-op for providers whose start_link already finishes the job."""
        return None

    @abc.abstractmethod
    def list_accounts(self, connection: SyncConnection) -> list[ProviderAccount]: ...

    @abc.abstractmethod
    def fetch_transactions(
        self,
        connection: SyncConnection,
        linked_account: SyncConnectionAccount,
        *,
        since: date | None,
    ) -> list[ProviderTransaction]: ...

    def disconnect(self, connection: SyncConnection) -> None:
        """Best-effort external revoke. Failures are logged, not raised - the
        local connection is deleted either way (see finance_views.py)."""
        return None


def get_provider(key: str) -> BankSyncProvider:
    from . import bank_sync_gocardless, bank_sync_simplefin

    providers = {
        SyncConnection.PROVIDER_GOCARDLESS: bank_sync_gocardless.provider,
        SyncConnection.PROVIDER_SIMPLEFIN: bank_sync_simplefin.provider,
    }
    try:
        return providers[key]
    except KeyError as exc:
        raise BankSyncError(f"Unknown bank sync provider: {key}") from exc


def list_providers() -> list[BankSyncProvider]:
    return [
        get_provider(SyncConnection.PROVIDER_GOCARDLESS),
        get_provider(SyncConnection.PROVIDER_SIMPLEFIN),
    ]


def ingest_transactions(
    linked_account: SyncConnectionAccount, rows: list[ProviderTransaction]
) -> dict:
    """Turn fetched provider rows into ledger transactions.

    Mirrors finance_services.execute_import_job's shape - two postings (one
    account leg, one bucket category leg), a match_key existence check for
    dedup, a TransactionEvent per row - with one deliberate difference: the
    match_key is built from the provider's own stable transaction id
    (`sync:<provider>:<external_account_id>:<external_id>`) rather than a
    content hash of date+amount+payee+memo. A provider id is strictly more
    reliable - two genuinely separate $5 coffees on the same day must both be
    kept, and a content hash cannot tell them apart, but the provider always
    can. Rules (finance_services.apply_rules) run per created transaction,
    same as a manual "apply rules" action - see ROADMAP.md Phase 2's "reuses
    the existing import dedup (match_key) and rules pipeline" goal.
    """
    from .finance_services import _import_category_for_amount, apply_rules

    account = linked_account.account
    if account is None:
        raise BankSyncError(
            f"{linked_account.display_name or linked_account.external_account_id} "
            "is not linked to a FinTrack account yet."
        )

    budget_file = account.budget_file
    created = 0
    skipped = 0

    with transaction.atomic():
        for row in rows:
            match_key = (
                f"sync:{linked_account.connection.provider}:"
                f"{linked_account.external_account_id}:{row.external_id}"
            )
            if LedgerTransaction.objects.filter(
                budget_file=budget_file, match_key=match_key
            ).exists():
                skipped += 1
                continue

            category = _import_category_for_amount(budget_file, row.amount)
            payee_obj = None
            if row.payee:
                payee_obj, _ = budget_file.payees.get_or_create(name=row.payee[:120])

            tx = LedgerTransaction.objects.create(
                budget_file=budget_file,
                transaction_date=row.transaction_date,
                payee=payee_obj,
                memo=row.memo[:2000],
                source_type=LedgerTransaction.SOURCE_SYNC,
                imported=True,
                match_key=match_key,
            )
            LedgerPosting.objects.bulk_create(
                [
                    LedgerPosting(
                        transaction=tx, account=account, amount=row.amount, sort_order=0
                    ),
                    LedgerPosting(
                        transaction=tx,
                        category=category,
                        amount=-row.amount,
                        sort_order=1,
                    ),
                ]
            )
            TransactionEvent.objects.create(
                budget_file=budget_file,
                transaction=tx,
                operation=TransactionEvent.OP_IMPORT,
                payload={"sync_connection_id": linked_account.connection_id},
            )
            apply_rules(tx)
            created += 1

    return {"created": created, "skipped": skipped}


def sync_connection(connection: SyncConnection) -> dict:
    """Sync every mapped account on one connection. Never raises for a single
    account's failure - see materialize_due_scheduled_transactions'
    on_error="skip" for the same "one bad row must not block the rest"
    reasoning, here applied within one connection's own accounts rather than
    across tenants."""
    provider = get_provider(connection.provider)
    totals = {"accounts_synced": 0, "created": 0, "skipped": 0, "errors": []}

    linked_accounts = connection.linked_accounts.filter(
        account__isnull=False
    ).select_related("account", "connection")

    for linked in linked_accounts:
        since = None
        if linked.last_synced_at:
            since = linked.last_synced_at.date() - timedelta(days=SYNC_OVERLAP_DAYS)
        else:
            since = timezone.now().date() - timedelta(days=INITIAL_SYNC_DAYS)

        try:
            provider_rows = provider.fetch_transactions(connection, linked, since=since)
            result = ingest_transactions(linked, provider_rows)
        except BankSyncError as exc:
            label = linked.display_name or linked.external_account_id
            totals["errors"].append(f"{label}: {exc}")
            logger.warning(
                "bank sync failed for connection %s account %s: %s",
                connection.id,
                linked.id,
                exc,
            )
            continue

        totals["created"] += result["created"]
        totals["skipped"] += result["skipped"]
        totals["accounts_synced"] += 1
        linked.last_synced_at = timezone.now()
        linked.save(update_fields=["last_synced_at", "updated_at"])

    connection.last_synced_at = timezone.now()
    if totals["errors"] and totals["accounts_synced"] == 0:
        connection.status = SyncConnection.STATUS_ERROR
        connection.last_error = "; ".join(totals["errors"])[:2000]
    else:
        connection.status = SyncConnection.STATUS_ACTIVE
        connection.last_error = "; ".join(totals["errors"])[:2000] if totals["errors"] else ""
    connection.save(
        update_fields=["status", "last_error", "last_synced_at", "updated_at"]
    )
    return totals
