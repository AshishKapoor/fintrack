import base64
import csv
import io
import json
import uuid
import zipfile
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from decimal import Decimal
from xml.sax.saxutils import escape as xml_escape
import xml.etree.ElementTree as ET

from django.db import transaction
from django.db.models import Sum
from django.db.models.functions import ExtractMonth, ExtractYear
from django.utils import timezone

from .models import (
    Account,
    BudgetFile,
    BudgetMonth,
    CategoryV2,
    EncryptedBackupBundle,
    EnvelopeAssignment,
    ExportJob,
    ImportJob,
    LedgerPosting,
    LedgerTransaction,
    SavedReport,
    ScheduledTransaction,
    Tag,
    TransactionEvent,
    TransactionRule,
)


@dataclass
class ImportedRow:
    transaction_date: date
    payee: str
    memo: str
    amount: Decimal


def month_bounds(year: int, month: int):
    start = date(year, month, 1)
    if month == 12:
        end = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        end = date(year, month + 1, 1) - timedelta(days=1)
    return start, end


def account_balances(budget_file: BudgetFile, as_of: date | None = None):
    postings = LedgerPosting.objects.filter(account__budget_file=budget_file)
    if as_of is not None:
        postings = postings.filter(transaction__transaction_date__lte=as_of)

    totals_by_account = {
        row["account_id"]: row["total"] or Decimal("0.00")
        for row in postings.values("account_id").annotate(total=Sum("amount"))
    }

    result = []
    for account in budget_file.accounts.all().order_by("id"):
        delta = totals_by_account.get(account.id, Decimal("0.00"))
        balance = account.opening_balance + delta
        result.append(
            {
                "account_id": account.id,
                "name": account.name,
                "type": account.type,
                "opening_balance": str(account.opening_balance),
                "delta": str(delta),
                "balance": str(balance),
            }
        )
    return result


def compute_net_worth(budget_file: BudgetFile, as_of: date | None = None):
    balances = account_balances(budget_file, as_of)
    total = Decimal("0.00")
    for row in balances:
        value = Decimal(row["balance"])
        if row["type"] in {Account.TYPE_CREDIT, Account.TYPE_LIABILITY}:
            total -= abs(value)
        else:
            total += value
    return {
        "type": "net_worth",
        "as_of": as_of.isoformat() if as_of else None,
        "total": str(total),
        "accounts": balances,
    }


def compute_cash_flow(budget_file: BudgetFile, start_date: date, end_date: date):
    category_rows = (
        LedgerPosting.objects.filter(
            transaction__budget_file=budget_file,
            transaction__transaction_date__gte=start_date,
            transaction__transaction_date__lte=end_date,
            category__isnull=False,
        )
        .values("category__kind")
        .annotate(total=Sum("amount"))
    )

    income = Decimal("0.00")
    expenses = Decimal("0.00")
    for row in category_rows:
        total = row["total"] or Decimal("0.00")
        if row["category__kind"] == CategoryV2.KIND_INCOME:
            income += abs(total)
        else:
            expenses += abs(total)

    return {
        "type": "cash_flow",
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "income": str(income),
        "expenses": str(expenses),
        "net": str(income - expenses),
    }


def compute_spending_trends(budget_file: BudgetFile, start_date: date, end_date: date):
    rows = (
        LedgerPosting.objects.filter(
            transaction__budget_file=budget_file,
            transaction__transaction_date__gte=start_date,
            transaction__transaction_date__lte=end_date,
            category__kind=CategoryV2.KIND_EXPENSE,
        )
        .annotate(year=ExtractYear("transaction__transaction_date"))
        .annotate(month=ExtractMonth("transaction__transaction_date"))
        .values("year", "month", "category__id", "category__name")
        .annotate(total=Sum("amount"))
        .order_by("year", "month", "category__name")
    )

    return {
        "type": "spending_trends",
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "rows": [
            {
                "year": row["year"],
                "month": row["month"],
                "category_id": row["category__id"],
                "category": row["category__name"],
                "amount": str(row["total"] or Decimal("0.00")),
            }
            for row in rows
        ],
    }


def run_report(budget_file: BudgetFile, payload: dict):
    report_type = payload.get("report_type", SavedReport.TYPE_CUSTOM)

    start_date_value = payload.get("start_date")
    end_date_value = payload.get("end_date")
    today = timezone.now().date()

    if start_date_value:
        start_date = date.fromisoformat(start_date_value)
    else:
        start_date = date(today.year, today.month, 1)

    if end_date_value:
        end_date = date.fromisoformat(end_date_value)
    else:
        end_date = today

    if report_type == SavedReport.TYPE_NET_WORTH:
        as_of = date.fromisoformat(payload.get("as_of")) if payload.get("as_of") else end_date
        return compute_net_worth(budget_file, as_of)

    if report_type == SavedReport.TYPE_CASH_FLOW:
        return compute_cash_flow(budget_file, start_date, end_date)

    if report_type == SavedReport.TYPE_SPENDING:
        return compute_spending_trends(budget_file, start_date, end_date)

    group_by = payload.get("group_by", "category")
    queryset = LedgerPosting.objects.filter(
        transaction__budget_file=budget_file,
        transaction__transaction_date__gte=start_date,
        transaction__transaction_date__lte=end_date,
        category__isnull=False,
    )

    if group_by == "month":
        rows = (
            queryset.annotate(year=ExtractYear("transaction__transaction_date"))
            .annotate(month=ExtractMonth("transaction__transaction_date"))
            .values("year", "month")
            .annotate(total=Sum("amount"))
            .order_by("year", "month")
        )
        return {
            "type": "custom",
            "group_by": "month",
            "rows": [
                {
                    "year": row["year"],
                    "month": row["month"],
                    "amount": str(row["total"] or Decimal("0.00")),
                }
                for row in rows
            ],
        }

    rows = (
        queryset.values("category__id", "category__name")
        .annotate(total=Sum("amount"))
        .order_by("category__name")
    )
    return {
        "type": "custom",
        "group_by": "category",
        "rows": [
            {
                "category_id": row["category__id"],
                "category": row["category__name"],
                "amount": str(row["total"] or Decimal("0.00")),
            }
            for row in rows
        ],
    }


def build_envelope_snapshot(budget_file: BudgetFile, year: int, month: int):
    budget_month = BudgetMonth.objects.get(budget_file=budget_file, year=year, month=month)
    start_date, end_date = month_bounds(year, month)

    assigned_total = (
        budget_month.assignments.aggregate(total=Sum("assigned_amount")).get("total")
        or Decimal("0.00")
    )

    cash_account_types = {Account.TYPE_CHECKING, Account.TYPE_SAVINGS, Account.TYPE_CASH}
    cash_accounts = budget_file.accounts.filter(type__in=cash_account_types)
    account_ids = list(cash_accounts.values_list("id", flat=True))
    cash_delta = (
        LedgerPosting.objects.filter(
            account_id__in=account_ids,
            transaction__transaction_date__lte=end_date,
        ).aggregate(total=Sum("amount")).get("total")
        or Decimal("0.00")
    )
    opening = cash_accounts.aggregate(total=Sum("opening_balance")).get("total") or Decimal("0.00")
    cash_on_hand = opening + cash_delta

    spent_by_category = {
        row["category_id"]: row["total"] or Decimal("0.00")
        for row in LedgerPosting.objects.filter(
            transaction__budget_file=budget_file,
            transaction__transaction_date__gte=start_date,
            transaction__transaction_date__lte=end_date,
            category__kind=CategoryV2.KIND_EXPENSE,
        )
        .values("category_id")
        .annotate(total=Sum("amount"))
    }

    assignments = []
    overspent_total = Decimal("0.00")
    for item in budget_month.assignments.select_related("category"):
        assigned = item.assigned_amount + item.carryover_amount
        spent = spent_by_category.get(item.category_id, Decimal("0.00"))
        remaining = assigned - spent
        overspent = abs(remaining) if remaining < 0 else Decimal("0.00")
        overspent_total += overspent
        assignments.append(
            {
                "category_id": item.category_id,
                "category": item.category.name,
                "assigned": str(item.assigned_amount),
                "carryover": str(item.carryover_amount),
                "spent": str(spent),
                "remaining": str(remaining),
                "overspent": str(overspent),
                "goal_type": item.goal_type,
                "goal_value": str(item.goal_value) if item.goal_value is not None else None,
                "priority": item.priority,
            }
        )

    available_to_budget = cash_on_hand - assigned_total - overspent_total

    return {
        "budget_month_id": budget_month.id,
        "year": year,
        "month": month,
        "cash_on_hand": str(cash_on_hand),
        "assigned_total": str(assigned_total),
        "overspent_total": str(overspent_total),
        "available_to_budget": str(available_to_budget),
        "assignments": assignments,
    }


def copy_budget_month_from_previous(budget_month: BudgetMonth):
    current_date = date(budget_month.year, budget_month.month, 1)
    previous_date = current_date - timedelta(days=1)
    previous = BudgetMonth.objects.filter(
        budget_file=budget_month.budget_file,
        year=previous_date.year,
        month=previous_date.month,
    ).first()
    if not previous:
        return 0

    created = 0
    for item in previous.assignments.all():
        _, was_created = EnvelopeAssignment.objects.update_or_create(
            budget_month=budget_month,
            category=item.category,
            defaults={
                "assigned_amount": item.assigned_amount,
                "carryover_amount": item.carryover_amount,
                "goal_type": item.goal_type,
                "goal_value": item.goal_value,
                "goal_date": item.goal_date,
                "goal_schedule": item.goal_schedule,
                "priority": item.priority,
                "notes_md": item.notes_md,
            },
        )
        if was_created:
            created += 1
    return created


def zero_budget_month(budget_month: BudgetMonth):
    return budget_month.assignments.update(assigned_amount=Decimal("0.00"))


def apply_three_month_average(budget_month: BudgetMonth):
    anchor = date(budget_month.year, budget_month.month, 1)
    periods = []
    for offset in [1, 2, 3]:
        d = anchor - timedelta(days=offset * 31)
        periods.append((d.year, d.month))

    changed = 0
    for assignment in budget_month.assignments.select_related("category"):
        totals = (
            LedgerPosting.objects.filter(
                transaction__budget_file=budget_month.budget_file,
                transaction__transaction_date__year__in=[x[0] for x in periods],
                transaction__transaction_date__month__in=[x[1] for x in periods],
                category=assignment.category,
            ).aggregate(total=Sum("amount"))
        )
        total = totals.get("total") or Decimal("0.00")
        avg = total / Decimal("3")
        assignment.assigned_amount = abs(avg.quantize(Decimal("0.01")))
        assignment.save(update_fields=["assigned_amount", "updated_at"])
        changed += 1
    return changed


def _normalize_rows_for_export(queryset):
    rows = []
    for ledger_tx in queryset:
        tag_names = ", ".join(ledger_tx.tags.values_list("name", flat=True))
        for posting in ledger_tx.postings.all().order_by("sort_order", "id"):
            rows.append(
                {
                    "transaction_id": str(ledger_tx.id),
                    "transaction_date": ledger_tx.transaction_date.isoformat(),
                    "payee": ledger_tx.payee.name if ledger_tx.payee else "",
                    "memo": ledger_tx.memo,
                    "source_type": ledger_tx.source_type,
                    "cleared": str(ledger_tx.cleared).lower(),
                    "imported": str(ledger_tx.imported).lower(),
                    "match_key": ledger_tx.match_key,
                    "tags": tag_names,
                    "posting_amount": str(posting.amount),
                    "posting_memo": posting.memo,
                    "account": posting.account.name if posting.account else "",
                    "category": posting.category.name if posting.category else "",
                }
            )
    return rows


def _csv_content(rows: list[dict]):
    if not rows:
        return ""
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    writer.writerows(rows)
    return output.getvalue()


def _xlsx_col_name(idx: int):
    name = ""
    while idx > 0:
        idx, rem = divmod(idx - 1, 26)
        name = chr(65 + rem) + name
    return name


def _xlsx_sheet_xml(headers: list[str], rows: list[list[str]]):
    all_rows = [headers, *rows]
    lines = [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
        "<sheetData>",
    ]

    for row_index, row in enumerate(all_rows, start=1):
        lines.append(f'<row r="{row_index}">')
        for col_index, value in enumerate(row, start=1):
            cell_ref = f"{_xlsx_col_name(col_index)}{row_index}"
            escaped = xml_escape(str(value or ""))
            lines.append(f'<c r="{cell_ref}" t="inlineStr"><is><t>{escaped}</t></is></c>')
        lines.append("</row>")

    lines.extend(["</sheetData>", "</worksheet>"])
    return "".join(lines)


def _xlsx_content(rows: list[dict]):
    headers = list(rows[0].keys()) if rows else ["no_data"]
    values = [list(r.values()) for r in rows] if rows else [["no data"]]

    content_types = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/xl/workbook.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        '<Override PartName="/xl/worksheets/sheet1.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        '<Override PartName="/xl/styles.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
        '</Types>'
    )
    rels = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
        'Target="xl/workbook.xml"/>'
        '</Relationships>'
    )
    workbook = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        '<sheets><sheet name="Export" sheetId="1" r:id="rId1"/></sheets>'
        '</workbook>'
    )
    workbook_rels = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" '
        'Target="worksheets/sheet1.xml"/>'
        '<Relationship Id="rId2" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" '
        'Target="styles.xml"/>'
        '</Relationships>'
    )
    styles = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        '<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>'
        '<fills count="1"><fill><patternFill patternType="none"/></fill></fills>'
        '<borders count="1"><border/></borders>'
        '<cellStyleXfs count="1"><xf/></cellStyleXfs>'
        '<cellXfs count="1"><xf xfId="0"/></cellXfs>'
        '</styleSheet>'
    )

    sheet = _xlsx_sheet_xml(headers, values)

    bytes_io = io.BytesIO()
    with zipfile.ZipFile(bytes_io, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", content_types)
        zf.writestr("_rels/.rels", rels)
        zf.writestr("xl/workbook.xml", workbook)
        zf.writestr("xl/_rels/workbook.xml.rels", workbook_rels)
        zf.writestr("xl/styles.xml", styles)
        zf.writestr("xl/worksheets/sheet1.xml", sheet)

    return bytes_io.getvalue()


def run_export_job(export_job: ExportJob):
    export_job.status = ExportJob.STATUS_RUNNING
    export_job.save(update_fields=["status", "updated_at"])

    try:
        queryset = (
            LedgerTransaction.objects.filter(budget_file=export_job.budget_file)
            .select_related("payee")
            .prefetch_related("postings__account", "postings__category", "tags")
        )

        start_date = export_job.filters.get("start_date")
        end_date = export_job.filters.get("end_date")
        if start_date:
            queryset = queryset.filter(transaction_date__gte=date.fromisoformat(start_date))
        if end_date:
            queryset = queryset.filter(transaction_date__lte=date.fromisoformat(end_date))

        rows = _normalize_rows_for_export(queryset)
        timestamp = timezone.now().strftime("%Y%m%d-%H%M%S")

        if export_job.format == ExportJob.FORMAT_JSON:
            export_job.content_text = json.dumps(rows, indent=2)
            export_job.file_name = f"fintrack-v2-export-{timestamp}.json"
        elif export_job.format == ExportJob.FORMAT_CSV:
            export_job.content_text = _csv_content(rows)
            export_job.file_name = f"fintrack-v2-export-{timestamp}.csv"
        else:
            payload = _xlsx_content(rows)
            export_job.set_binary_content(payload)
            export_job.file_name = f"fintrack-v2-export-{timestamp}.xlsx"

        export_job.status = ExportJob.STATUS_COMPLETED
        export_job.completed_at = timezone.now()
        export_job.error_message = ""
    except Exception as exc:  # pragma: no cover - defensive status update path
        export_job.status = ExportJob.STATUS_FAILED
        export_job.error_message = str(exc)

    export_job.save(
        update_fields=[
            "status",
            "content_text",
            "content_b64",
            "file_name",
            "completed_at",
            "error_message",
            "updated_at",
        ]
    )
    return export_job


def decode_export_job_content(export_job: ExportJob):
    if export_job.format == ExportJob.FORMAT_XLSX:
        return base64.b64decode(export_job.content_b64.encode("ascii"))
    return export_job.content_text.encode("utf-8")


def transaction_matches_rule(ledger_transaction: LedgerTransaction, rule: TransactionRule):
    if not rule.is_active:
        return False

    conditions = rule.conditions or {}
    memo_contains = conditions.get("memo_contains")
    if memo_contains and memo_contains.lower() not in (ledger_transaction.memo or "").lower():
        return False

    payee_contains = conditions.get("payee_contains")
    payee_name = ledger_transaction.payee.name if ledger_transaction.payee else ""
    if payee_contains and payee_contains.lower() not in payee_name.lower():
        return False

    min_abs_amount = conditions.get("min_abs_amount")
    if min_abs_amount is not None:
        account_total = (
            ledger_transaction.postings.filter(account__isnull=False).aggregate(total=Sum("amount")).get("total")
            or Decimal("0.00")
        )
        if abs(account_total) < Decimal(str(min_abs_amount)):
            return False

    return True


def apply_rules(ledger_transaction: LedgerTransaction):
    rules = (
        TransactionRule.objects.filter(
            budget_file=ledger_transaction.budget_file,
            is_active=True,
        )
        .order_by("priority", "id")
    )

    applied_rules = []

    for rule in rules:
        if not transaction_matches_rule(ledger_transaction, rule):
            continue

        actions = rule.actions or {}
        if actions.get("append_memo"):
            suffix = str(actions["append_memo"])
            ledger_transaction.memo = f"{ledger_transaction.memo} {suffix}".strip()

        if "cleared" in actions:
            ledger_transaction.cleared = bool(actions["cleared"])

        if "imported" in actions:
            ledger_transaction.imported = bool(actions["imported"])

        tag_ids = actions.get("tag_ids", [])
        if tag_ids:
            tags = Tag.objects.filter(id__in=tag_ids, budget_file=ledger_transaction.budget_file)
            if tags.exists():
                ledger_transaction.tags.add(*tags)

        applied_rules.append(rule.id)

    if applied_rules:
        ledger_transaction.source_type = LedgerTransaction.SOURCE_RULE
        ledger_transaction.save(update_fields=["memo", "cleared", "imported", "source_type", "updated_at"])
        TransactionEvent.objects.create(
            budget_file=ledger_transaction.budget_file,
            transaction=ledger_transaction,
            operation=TransactionEvent.OP_UPDATE,
            payload={"applied_rules": applied_rules},
        )

    return applied_rules


def _infer_next_date(schedule: ScheduledTransaction):
    base = schedule.next_run_date
    interval = max(schedule.interval, 1)

    if schedule.frequency == ScheduledTransaction.FREQ_DAILY:
        return base + timedelta(days=interval)
    if schedule.frequency == ScheduledTransaction.FREQ_WEEKLY:
        return base + timedelta(weeks=interval)
    if schedule.frequency == ScheduledTransaction.FREQ_YEARLY:
        return date(base.year + interval, base.month, base.day)

    month = base.month - 1 + interval
    year = base.year + month // 12
    month = month % 12 + 1
    day = min(base.day, 28)
    return date(year, month, day)


def _validate_postings_balance(postings: list[dict]):
    total = Decimal("0.00")
    for posting in postings:
        total += Decimal(str(posting["amount"]))
    return total == Decimal("0.00")


def materialize_scheduled_transaction(schedule: ScheduledTransaction):
    template = schedule.transaction_template or {}
    postings = template.get("postings", [])
    if not postings or not _validate_postings_balance(postings):
        raise ValueError("Scheduled transaction template postings must be balanced")

    with transaction.atomic():
        ledger_tx = LedgerTransaction.objects.create(
            budget_file=schedule.budget_file,
            transaction_date=schedule.next_run_date,
            memo=template.get("memo", schedule.name),
            source_type=LedgerTransaction.SOURCE_SCHEDULED,
            cleared=bool(template.get("cleared", False)),
            imported=False,
            transfer_group=uuid.uuid4() if template.get("is_transfer") else None,
        )

        for idx, item in enumerate(postings):
            LedgerPosting.objects.create(
                transaction=ledger_tx,
                account_id=item.get("account_id"),
                category_id=item.get("category_id"),
                amount=Decimal(str(item["amount"])),
                memo=item.get("memo", ""),
                sort_order=idx,
            )

        TransactionEvent.objects.create(
            budget_file=schedule.budget_file,
            transaction=ledger_tx,
            operation=TransactionEvent.OP_CREATE,
            payload={"scheduled_transaction_id": schedule.id},
        )

        schedule.last_run_at = timezone.now()
        schedule.next_run_date = _infer_next_date(schedule)
        schedule.save(update_fields=["last_run_at", "next_run_date", "updated_at"])

    return ledger_tx


def create_backup_bundle(
    budget_file: BudgetFile,
    requested_by,
    *,
    ciphertext: str,
    salt: str,
    nonce: str,
    metadata: dict,
    encryption_algorithm: str = "AES-GCM",
    key_derivation: str = "PBKDF2",
):
    return EncryptedBackupBundle.objects.create(
        budget_file=budget_file,
        requested_by=requested_by,
        ciphertext=ciphertext,
        salt=salt,
        nonce=nonce,
        metadata=metadata or {},
        encryption_algorithm=encryption_algorithm,
        key_derivation=key_derivation,
    )


def _parse_csv_rows(payload: str):
    if not payload.strip():
        return []

    reader = csv.DictReader(io.StringIO(payload))
    rows = []
    for row in reader:
        dt = row.get("date") or row.get("transaction_date")
        if not dt:
            continue
        amount = Decimal(str(row.get("amount", "0")).replace(",", ""))
        rows.append(
            ImportedRow(
                transaction_date=date.fromisoformat(dt),
                payee=(row.get("payee") or row.get("title") or "").strip(),
                memo=(row.get("memo") or "").strip(),
                amount=amount,
            )
        )
    return rows


def _normalize_date(value: str):
    raw = (value or "").strip()
    if not raw:
        return None

    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y/%m/%d"):
        try:
            return date.fromisoformat(datetime.strptime(raw, fmt).date().isoformat())
        except Exception:
            continue
    try:
        return date.fromisoformat(raw)
    except Exception:
        return None


def _normalize_amount(value: str | Decimal | float | int):
    text = str(value or "0").strip()
    text = text.replace(",", "")
    if text.startswith("(") and text.endswith(")"):
        text = f"-{text[1:-1]}"
    return Decimal(text or "0")


def _parse_ynab_rows(payload: str):
    reader = csv.DictReader(io.StringIO(payload))
    rows = []
    for row in reader:
        dt = _normalize_date(row.get("Date", "") or row.get("date", ""))
        if not dt:
            continue

        inflow = _normalize_amount(row.get("Inflow", "0") or row.get("inflow", "0"))
        outflow = _normalize_amount(row.get("Outflow", "0") or row.get("outflow", "0"))
        amount = inflow - outflow

        payee = (
            row.get("Payee")
            or row.get("payee")
            or row.get("Name")
            or row.get("name")
            or ""
        ).strip()
        memo = (row.get("Memo") or row.get("memo") or "").strip()

        rows.append(
            ImportedRow(
                transaction_date=dt,
                payee=payee,
                memo=memo,
                amount=amount,
            )
        )
    return rows


def _parse_qif_rows(payload: str):
    rows = []
    current = {}

    def flush_entry(entry):
        dt = _normalize_date(entry.get("D", ""))
        amount_raw = entry.get("T", "")
        if not dt or not amount_raw:
            return
        rows.append(
            ImportedRow(
                transaction_date=dt,
                payee=entry.get("P", "").strip(),
                memo=entry.get("M", "").strip(),
                amount=_normalize_amount(amount_raw),
            )
        )

    for line in payload.splitlines():
        line = line.strip()
        if not line or line.startswith("!Type:"):
            continue
        if line == "^":
            flush_entry(current)
            current = {}
            continue
        key, value = line[0], line[1:]
        current[key] = value

    if current:
        flush_entry(current)
    return rows


def _find_text_with_suffix(node: ET.Element, suffix: str):
    for child in node.iter():
        tag = child.tag.split("}", 1)[-1]
        if tag == suffix and child.text:
            return child.text.strip()
    return ""


def _parse_camt053_rows(payload: str):
    rows = []
    try:
        root = ET.fromstring(payload)
    except ET.ParseError:
        return rows

    for entry in root.findall(".//{*}Ntry"):
        amount_text = _find_text_with_suffix(entry, "Amt")
        date_text = _find_text_with_suffix(entry, "Dt") or _find_text_with_suffix(entry, "DtTm")
        if not amount_text or not date_text:
            continue

        dt = _normalize_date(date_text[:10])
        if not dt:
            continue

        cdt_dbt = _find_text_with_suffix(entry, "CdtDbtInd").upper()
        amount = _normalize_amount(amount_text)
        if cdt_dbt == "DBIT":
            amount = -abs(amount)
        elif cdt_dbt == "CRDT":
            amount = abs(amount)

        payee = (
            _find_text_with_suffix(entry, "Nm")
            or _find_text_with_suffix(entry, "MsgId")
            or "CAMT Entry"
        )
        memo = _find_text_with_suffix(entry, "Ustrd")
        rows.append(
            ImportedRow(
                transaction_date=dt,
                payee=payee,
                memo=memo,
                amount=amount,
            )
        )

    return rows


def _extract_ofx_tag(text: str, tag: str):
    marker = f"<{tag}>"
    if marker not in text:
        return ""
    return text.split(marker, 1)[1].split("\n", 1)[0].strip().split("<", 1)[0]


def _parse_ofx_like_rows(payload: str):
    rows = []
    for block in payload.split("<STMTTRN>"):
        if "<TRNAMT>" not in block:
            continue
        date_raw = _extract_ofx_tag(block, "DTPOSTED")
        amount_raw = _extract_ofx_tag(block, "TRNAMT")
        payee = _extract_ofx_tag(block, "NAME")
        memo = _extract_ofx_tag(block, "MEMO")
        if not date_raw or not amount_raw:
            continue

        ymd = date_raw[:8]
        rows.append(
            ImportedRow(
                transaction_date=date(int(ymd[:4]), int(ymd[4:6]), int(ymd[6:8])),
                payee=payee,
                memo=memo,
                amount=Decimal(amount_raw),
            )
        )
    return rows


def parse_import_rows(import_job: ImportJob):
    fmt = import_job.format
    payload = import_job.source_payload or ""
    if fmt == ImportJob.FORMAT_CSV:
        return _parse_csv_rows(payload)
    if fmt in {ImportJob.FORMAT_OFX, ImportJob.FORMAT_QFX}:
        return _parse_ofx_like_rows(payload)
    if fmt == ImportJob.FORMAT_QIF:
        return _parse_qif_rows(payload)
    if fmt == ImportJob.FORMAT_CAMT053:
        return _parse_camt053_rows(payload)
    if fmt in {ImportJob.FORMAT_YNAB4, ImportJob.FORMAT_NYNAB}:
        return _parse_ynab_rows(payload)
    return []


def preview_import_job(import_job: ImportJob):
    rows = parse_import_rows(import_job)
    summary = {
        "format": import_job.format,
        "detected_rows": len(rows),
        "sample": [
            {
                "date": row.transaction_date.isoformat(),
                "payee": row.payee,
                "memo": row.memo,
                "amount": str(row.amount),
            }
            for row in rows[:10]
        ],
        "unsupported": False,
    }
    import_job.preview_summary = summary
    import_job.status = ImportJob.STATUS_PREVIEWED
    import_job.save(update_fields=["preview_summary", "status", "updated_at"])
    return summary


def _default_import_account(budget_file: BudgetFile):
    account = budget_file.accounts.filter(is_archived=False).order_by("id").first()
    if account:
        return account
    return Account.objects.create(
        budget_file=budget_file,
        name="Imported Cash",
        type=Account.TYPE_CHECKING,
        opening_balance=Decimal("0.00"),
    )


def _import_category_for_amount(budget_file: BudgetFile, amount: Decimal):
    if amount >= 0:
        name = "Imported Income"
        kind = CategoryV2.KIND_INCOME
    else:
        name = "Imported Expense"
        kind = CategoryV2.KIND_EXPENSE

    category, _ = CategoryV2.objects.get_or_create(
        budget_file=budget_file,
        name=name,
        defaults={"kind": kind},
    )
    return category


def execute_import_job(import_job: ImportJob):
    rows = parse_import_rows(import_job)
    account = _default_import_account(import_job.budget_file)
    created = 0
    skipped = 0

    import_job.status = ImportJob.STATUS_IMPORTING
    import_job.save(update_fields=["status", "updated_at"])

    with transaction.atomic():
        for row in rows:
            match_key = f"{row.transaction_date.isoformat()}|{row.amount}|{row.payee}|{row.memo}".strip()
            if LedgerTransaction.objects.filter(
                budget_file=import_job.budget_file,
                match_key=match_key,
            ).exists():
                skipped += 1
                continue

            category = _import_category_for_amount(import_job.budget_file, row.amount)
            payee_obj = None
            if row.payee:
                payee_obj = import_job.budget_file.payees.filter(name=row.payee).first()
                if not payee_obj:
                    payee_obj = import_job.budget_file.payees.create(name=row.payee)

            tx = LedgerTransaction.objects.create(
                budget_file=import_job.budget_file,
                transaction_date=row.transaction_date,
                payee=payee_obj,
                memo=row.memo,
                source_type=LedgerTransaction.SOURCE_IMPORT,
                imported=True,
                match_key=match_key,
            )

            LedgerPosting.objects.bulk_create(
                [
                    LedgerPosting(
                        transaction=tx,
                        account=account,
                        amount=row.amount,
                        sort_order=0,
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
                budget_file=import_job.budget_file,
                transaction=tx,
                operation=TransactionEvent.OP_IMPORT,
                payload={"import_job_id": import_job.id},
            )
            created += 1

    import_job.status = ImportJob.STATUS_COMPLETED
    import_job.preview_summary = {
        **(import_job.preview_summary or {}),
        "created": created,
        "skipped_duplicates": skipped,
    }
    import_job.save(update_fields=["status", "preview_summary", "updated_at"])

    return {
        "created": created,
        "skipped_duplicates": skipped,
    }
