#!/usr/bin/env python3
"""Validate FinTrack feature audit matrix and generate parity findings."""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[1]
MATRIX_PATH = ROOT / "docs/feature-audit/feature-matrix.json"
REPORT_PATH = ROOT / "docs/feature-audit/parity-report.md"
SCHEMA_PATH = ROOT / "apps/web/schema/pft.yaml"
ROUTERS_PATH = ROOT / "apps/api/pft/routers.py"
FINANCE_ROUTERS_PATH = ROOT / "apps/api/pft/finance_routers.py"
VIEWS_PATH = ROOT / "apps/api/pft/views.py"
FINANCE_VIEWS_PATH = ROOT / "apps/api/pft/finance_views.py"
PFT_URLS_PATH = ROOT / "apps/api/pft/urls.py"
APP_URLS_PATH = ROOT / "apps/api/app/urls.py"
ORG_VIEWS_PATH = ROOT / "apps/api/pft/org_views.py"
AUDIT_VIEWS_PATH = ROOT / "apps/api/pft/audit_views.py"
TRANSACTIONS_PAGE_PATH = ROOT / "apps/web/app/pages/transactions/index.tsx"
RECENT_TRANSACTIONS_PATH = ROOT / "apps/web/app/components/recent-transactions.tsx"
WEB_APP_PATH = ROOT / "apps/web/app"
# Orval's output target (orval.config.ts) is app/client/gen/pft, not
# app/client/pft - this path was wrong for long enough to make every parity
# report since claim the generated client was missing entirely.
GENERATED_CLIENT_PATH = ROOT / "apps/web/app/client/gen/pft"

ROW_REQUIRED_FIELDS = {
    "feature_id",
    "module",
    "user_job",
    "status",
    "tier",
    "value_score",
    "effort_score",
    "risk_score",
    "priority_score",
    "acceptance_status",
    "evidence_refs",
    "notes",
}

STATUS_VALUES = {"Implemented", "Partial", "Missing", "Broken"}
TIER_VALUES = {"Required", "AddNext", "Optional"}
ACCEPTANCE_VALUES = {"Accepted", "AtRisk"}

SEVERITY_ORDER = {"P1": 0, "P2": 1, "P3": 2}


@dataclass
class Finding:
    severity: str
    title: str
    detail: str
    evidence: list[str]


def calculate_priority(value_score: int, effort_score: int, risk_score: int) -> float:
    return round(0.5 * value_score + 0.3 * risk_score + 0.2 * (6 - effort_score), 2)


def load_matrix() -> dict:
    return json.loads(MATRIX_PATH.read_text(encoding="utf-8"))


def validate_matrix(matrix: dict) -> tuple[list[str], dict[str, Counter]]:
    errors: list[str] = []
    rows = matrix.get("rows")
    if not isinstance(rows, list):
        return ["Matrix must contain a 'rows' list."], {}

    counts = {
        "status": Counter(),
        "tier": Counter(),
        "acceptance": Counter(),
    }

    for idx, row in enumerate(rows, start=1):
        if not isinstance(row, dict):
            errors.append(f"Row {idx} is not an object.")
            continue

        missing = ROW_REQUIRED_FIELDS - set(row.keys())
        extra = set(row.keys()) - ROW_REQUIRED_FIELDS
        if missing:
            errors.append(f"Row {idx} missing fields: {sorted(missing)}")
        if extra:
            errors.append(f"Row {idx} has unknown fields: {sorted(extra)}")

        status = row.get("status")
        tier = row.get("tier")
        acceptance = row.get("acceptance_status")
        if status not in STATUS_VALUES:
            errors.append(f"Row {idx} has invalid status: {status}")
        if tier not in TIER_VALUES:
            errors.append(f"Row {idx} has invalid tier: {tier}")
        if acceptance not in ACCEPTANCE_VALUES:
            errors.append(f"Row {idx} has invalid acceptance_status: {acceptance}")

        for key in ("value_score", "effort_score", "risk_score"):
            value = row.get(key)
            if not isinstance(value, int) or value < 1 or value > 5:
                errors.append(f"Row {idx} has invalid {key}: {value}")

        priority_score = row.get("priority_score")
        if not isinstance(priority_score, (int, float)):
            errors.append(f"Row {idx} has invalid priority_score: {priority_score}")
        else:
            expected = calculate_priority(
                row.get("value_score", 0),
                row.get("effort_score", 0),
                row.get("risk_score", 0),
            )
            if abs(priority_score - expected) > 0.01:
                feature_id = row.get("feature_id", f"row_{idx}")
                errors.append(
                    f"Row {idx} ({feature_id}) priority_score={priority_score} but expected {expected}."
                )

        evidence_refs = row.get("evidence_refs")
        if not isinstance(evidence_refs, list) or not evidence_refs:
            errors.append(f"Row {idx} evidence_refs must be a non-empty list.")

        if status in STATUS_VALUES:
            counts["status"][status] += 1
        if tier in TIER_VALUES:
            counts["tier"][tier] += 1
        if acceptance in ACCEPTANCE_VALUES:
            counts["acceptance"][acceptance] += 1

    return errors, counts


def extract_schema_endpoints() -> set[str]:
    endpoints: set[str] = set()
    pattern = re.compile(r"^\s{2}(/api/[^:]+):\s*$")
    for line in SCHEMA_PATH.read_text(encoding="utf-8").splitlines():
        match = pattern.match(line)
        if match:
            endpoints.add(match.group(1))
    return endpoints


# `router.register(` may wrap across lines, so allow whitespace before the prefix.
REGISTER_RE = re.compile(r'router\.register\(\s*"([^"]+)"\s*,\s*(\w+)')


def _iter_action_call_args(source: str) -> Iterable[tuple[int, str]]:
    """Yield (start_pos, args) for every `@action(...)` call.

    A plain "up to the first )" regex breaks the moment url_path is itself a
    raw-string regex with a named group, e.g. org_views.py's
    `url_path=r"members/(?P<membership_id>\\d+)"` - its own closing paren
    looks like the end of the @action(...) call to a naive pattern, silently
    truncating (and usually invalidating) everything captured after it.
    Track paren depth instead so nested parens do not end the call early.
    """
    for match in re.finditer(r"@action\(", source):
        start = match.end()
        depth = 1
        i = start
        while i < len(source) and depth > 0:
            if source[i] == "(":
                depth += 1
            elif source[i] == ")":
                depth -= 1
            i += 1
        yield match.start(), source[start : i - 1]


def _actions_for(source: str) -> dict[str, list[tuple[bool, str]]]:
    """Collect @action routes per viewset, tolerating multi-line decorators."""
    actions: dict[str, list[tuple[bool, str]]] = {}
    class_positions = [
        (match.start(), match.group(1)) for match in re.finditer(r"^class (\w+)\(", source, re.M)
    ]

    for start, args in _iter_action_call_args(source):
        # url_path is sometimes a raw string (r"...") so it can embed a regex
        # named group for a nested resource id, e.g.
        # url_path=r"members/(?P<membership_id>\d+)" (org_views.py). Without
        # the optional `r`, this was silently skipped entirely; without the
        # named-group substitution below, it would be captured verbatim
        # instead of as the {membership_id} placeholder drf-spectacular
        # actually emits into the schema.
        url_match = re.search(r'url_path=r?"([^"]+)"', args)
        if not url_match:
            continue
        owner = None
        for position, name in class_positions:
            if position < start:
                owner = name
            else:
                break
        if owner is None:
            continue
        url_path = re.sub(r"\(\?P<(\w+)>[^)]*\)", r"{\1}", url_match.group(1))
        actions.setdefault(owner, []).append(("detail=True" in args, url_path))

    return actions


def _register_router(endpoints: set[str], source: str, prefix: str, actions_source: str) -> None:
    actions = _actions_for(actions_source)
    for resource, viewset in REGISTER_RE.findall(source):
        endpoints.add(f"{prefix}/{resource}/")
        endpoints.add(f"{prefix}/{resource}/{{id}}/")
        for detail, url_path in actions.get(viewset, []):
            if detail:
                endpoints.add(f"{prefix}/{resource}/{{id}}/{url_path}/")
            else:
                endpoints.add(f"{prefix}/{resource}/{url_path}/")


def extract_backend_endpoints() -> set[str]:
    endpoints: set[str] = set()

    app_urls = APP_URLS_PATH.read_text(encoding="utf-8")
    # Skip include() mounts: they are prefixes, not endpoints. The resources
    # behind them are picked up from the routers below.
    for match in re.finditer(r'path\(\s*"([^"]+)"\s*,\s*(?P<target>[^,)]+)', app_urls):
        path_value = match.group(1)
        if "include(" in match.group("target"):
            continue
        if path_value.startswith("api/"):
            endpoints.add("/" + path_value)

    _register_router(
        endpoints,
        ROUTERS_PATH.read_text(encoding="utf-8"),
        "/api/v1",
        VIEWS_PATH.read_text(encoding="utf-8"),
    )

    # The finance domain mounts 16 more resources under /api/v1/finance/, each
    # with its own @action routes. Omitting this file was why the parity report
    # reported PASS while the entire API the UI calls was undocumented.
    _register_router(
        endpoints,
        FINANCE_ROUTERS_PATH.read_text(encoding="utf-8"),
        "/api/v1/finance",
        FINANCE_VIEWS_PATH.read_text(encoding="utf-8"),
    )

    pft_urls = PFT_URLS_PATH.read_text(encoding="utf-8")

    # pft/urls.py registers a *second* DefaultRouter (org_router, for
    # OrganizationViewSet/AuditLogViewSet) rather than adding it to
    # pft/routers.py's router - REGISTER_RE matches "router.register(" as a
    # substring, so it already finds "org_router.register(" fine, but nothing
    # ever called _register_router with this file before now, so
    # /api/v1/orgs/* and /api/v1/audit-log/* always reported as schema-only.
    _register_router(
        endpoints,
        pft_urls,
        "/api/v1",
        ORG_VIEWS_PATH.read_text(encoding="utf-8") + AUDIT_VIEWS_PATH.read_text(encoding="utf-8"),
    )

    # \s* (not a literal '"') between path( and the string: change-password's
    # line wraps its arguments, which a same-line-only pattern silently skips.
    for match in re.finditer(r'path\(\s*"([^"]+)"', pft_urls):
        path_value = match.group(1)
        if path_value and path_value != "":
            endpoints.add(f"/api/v1/{path_value}")

    filtered = {
        endpoint
        for endpoint in endpoints
        if endpoint.startswith("/api/token/") or endpoint.startswith("/api/v1/")
    }
    return filtered


def find_generated_import_files() -> list[str]:
    files: list[str] = []
    for path in WEB_APP_PATH.rglob("*"):
        if path.suffix not in {".ts", ".tsx"}:
            continue
        text = path.read_text(encoding="utf-8")
        if "@/client/gen/pft" in text:
            files.append(str(path.relative_to(ROOT)))
    return sorted(files)


def get_line(path: Path, pattern: str) -> int | None:
    regex = re.compile(pattern)
    for idx, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if regex.search(line):
            return idx
    return None


def build_findings() -> tuple[list[Finding], set[str], set[str]]:
    findings: list[Finding] = []

    schema_endpoints = extract_schema_endpoints()
    backend_endpoints = extract_backend_endpoints()
    stale_schema_endpoints = sorted(schema_endpoints - backend_endpoints)
    missing_from_schema = sorted(backend_endpoints - schema_endpoints)

    if stale_schema_endpoints:
        findings.append(
            Finding(
                severity="P1",
                title="Stale OpenAPI surface vs active backend routes",
                detail=(
                    f"{len(stale_schema_endpoints)} schema endpoints are not backed by current routes."
                ),
                evidence=[
                    "web/schema/pft.yaml",
                    "api/pft/routers.py",
                    "api/pft/urls.py",
                ],
            )
        )

    if missing_from_schema:
        findings.append(
            Finding(
                severity="P2",
                title="Backend routes missing from OpenAPI schema",
                detail=(
                    f"{len(missing_from_schema)} active endpoints are not represented in schema."
                ),
                evidence=[
                    "api/pft/routers.py",
                    "api/pft/urls.py",
                    "web/schema/pft.yaml",
                ],
            )
        )

    generated_import_files = find_generated_import_files()
    if generated_import_files and not GENERATED_CLIENT_PATH.exists():
        findings.append(
            Finding(
                severity="P1",
                title="Generated API client imports exist but generated artifacts are missing",
                detail=(
                    "Frontend imports '@/client/gen/pft/*' while web/app/client/gen/pft "
                    "is absent in the repository."
                ),
                evidence=generated_import_files[:5] + ["web/orval.config.ts", "web/.gitignore"],
            )
        )

    transactions_page = TRANSACTIONS_PAGE_PATH.read_text(encoding="utf-8")
    if "currentPage" in transactions_page and "useV1TransactionsList()" in transactions_page:
        findings.append(
            Finding(
                severity="P1",
                title="Transaction pagination state is not wired to API paging",
                detail="UI maintains currentPage, but API list hook is called with no page parameter.",
                evidence=[
                    "web/app/pages/transactions/index.tsx",
                    "web/schema/pft.yaml",
                ],
            )
        )

    has_download_icon = "<Download" in transactions_page
    has_export_action = (
        "exportTransactions(" in transactions_page
        or "Export CSV" in transactions_page
        or "Export JSON" in transactions_page
        or "onClick={() => export" in transactions_page
    )
    if has_download_icon and not has_export_action:
        findings.append(
            Finding(
                severity="P2",
                title="Download control has no export action bound",
                detail="Transactions page shows export icon button with no onClick/export implementation.",
                evidence=["web/app/pages/transactions/index.tsx", "README.md"],
            )
        )

    recent_transactions = RECENT_TRANSACTIONS_PATH.read_text(encoding="utf-8")
    schema_text = SCHEMA_PATH.read_text(encoding="utf-8")
    if (
        ("transaction.category.name" in recent_transactions or "transaction?.category?.name" in recent_transactions)
        and "Transaction:\n      type: object" in schema_text
        and "category:\n          type: integer" in schema_text
    ):
        findings.append(
            Finding(
                severity="P2",
                title="Recent transaction UI assumes nested category object",
                detail="UI reads transaction.category.name while schema models category as integer id.",
                evidence=["web/app/components/recent-transactions.tsx", "web/schema/pft.yaml"],
            )
        )

    dashboard_line = get_line(ROOT / "apps/web/app/pages/dashboard/index.tsx", r"useV1TransactionsList\(\s*{")
    overview_line = get_line(ROOT / "apps/web/app/components/overview.tsx", r"useV1TransactionsList\(")
    if dashboard_line and overview_line:
        findings.append(
            Finding(
                severity="P2",
                title="Dashboard data sourcing is split between local filtering and API filtering",
                detail="Summary cards and chart can diverge when list paging/filters differ.",
                evidence=[
                    f"web/app/pages/dashboard/index.tsx:{dashboard_line}",
                    f"web/app/components/overview.tsx:{overview_line}",
                ],
            )
        )

    api_tests = [p for p in (ROOT / "apps/api/pft/tests").rglob("*.py") if p.name != "__init__.py"]
    web_tests = [p for p in (ROOT / "apps/web/app").rglob("*.test.tsx")] + [
        p for p in (ROOT / "apps/web/app").rglob("*.test.ts")
    ]
    web_tests += [p for p in (ROOT / "apps/web/app").rglob("*.spec.tsx")]
    web_tests += [p for p in (ROOT / "apps/web/app").rglob("*.spec.ts")]
    if not api_tests and not web_tests:
        findings.append(
            Finding(
                severity="P2",
                title="Automated regression tests are missing for core flows",
                detail="No meaningful API/UI test files found for budgeting core features.",
                evidence=["api/pft/tests/__init__.py", "README.md"],
            )
        )

    findings.sort(key=lambda item: SEVERITY_ORDER.get(item.severity, 99))
    return findings, set(stale_schema_endpoints), set(missing_from_schema)


def _format_list(items: Iterable[str]) -> str:
    sorted_items = sorted(items)
    if not sorted_items:
        return "- None\n"
    return "".join(f"- `{item}`\n" for item in sorted_items)


def render_report(
    matrix_errors: list[str],
    counts: dict[str, Counter],
    findings: list[Finding],
    stale_schema_endpoints: set[str],
    missing_from_schema: set[str],
    gate_violations: list[str],
) -> str:
    required_count = counts.get("tier", Counter()).get("Required", 0)
    broken_required = 0

    matrix = load_matrix()
    for row in matrix.get("rows", []):
        if row.get("tier") == "Required" and row.get("status") == "Broken":
            broken_required += 1

    findings_table = ""
    if findings:
        findings_table += "| Severity | Finding | Detail | Evidence |\n"
        findings_table += "|---|---|---|---|\n"
        for finding in findings:
            evidence = "<br>".join(f"`{item}`" for item in finding.evidence)
            findings_table += (
                f"| {finding.severity} | {finding.title} | {finding.detail} | {evidence} |\n"
            )
    else:
        findings_table = "No parity findings.\n"

    matrix_error_block = ""
    if matrix_errors:
        matrix_error_block = "\n".join(f"- {err}" for err in matrix_errors)
    else:
        matrix_error_block = "- None"

    if gate_violations:
        gate_status = "FAIL"
        gate_block = "\n".join(f"- {item}" for item in gate_violations)
    else:
        gate_status = "PASS"
        gate_block = "- None"

    return f"""# API/UI Parity Report

Generated on `{date.today().isoformat()}` by `scripts/feature_audit.py`.

## Matrix Validation

- Required features tracked: **{required_count}**
- Required features currently Broken: **{broken_required}**
- Status counts: `{dict(counts.get("status", Counter()))}`
- Tier counts: `{dict(counts.get("tier", Counter()))}`
- Acceptance counts: `{dict(counts.get("acceptance", Counter()))}`

Matrix validation errors:
{matrix_error_block}

## Required Gate

- Gate status: **{gate_status}**
- Rule: all `Required` rows must be `Accepted` and none may be `Broken`.
- Violations:
{gate_block}

## Parity Findings

{findings_table}

## Schema Endpoints Not in Active Backend

{_format_list(stale_schema_endpoints)}

## Active Backend Endpoints Missing From Schema

{_format_list(missing_from_schema)}
"""


def evaluate_gate(matrix: dict) -> list[str]:
    violations: list[str] = []
    for row in matrix.get("rows", []):
        if row.get("tier") != "Required":
            continue
        feature_id = row.get("feature_id", "unknown_feature")
        status = row.get("status")
        acceptance = row.get("acceptance_status")
        if status == "Broken":
            violations.append(f"{feature_id}: status is Broken")
        if acceptance != "Accepted":
            violations.append(f"{feature_id}: acceptance_status is {acceptance}")
    return violations


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate FinTrack feature audit and parity.")
    parser.add_argument(
        "--report",
        default=str(REPORT_PATH),
        help="Output markdown report path.",
    )
    parser.add_argument(
        "--enforce-gate",
        action="store_true",
        help="Return non-zero when Required gate is failing.",
    )
    args = parser.parse_args()

    matrix = load_matrix()
    matrix_errors, counts = validate_matrix(matrix)
    findings, stale_schema_endpoints, missing_from_schema = build_findings()
    gate_violations = evaluate_gate(matrix)
    report = render_report(
        matrix_errors,
        counts,
        findings,
        stale_schema_endpoints,
        missing_from_schema,
        gate_violations,
    )

    report_path = Path(args.report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(report, encoding="utf-8")

    print(f"Report written to {report_path.relative_to(ROOT)}")
    print(f"Findings: {len(findings)}")
    print(f"Matrix errors: {len(matrix_errors)}")
    print(f"Gate violations: {len(gate_violations)}")
    if matrix_errors:
        for error in matrix_errors:
            print(f"- {error}")
    if args.enforce_gate and gate_violations:
        return 2
    return 1 if matrix_errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
