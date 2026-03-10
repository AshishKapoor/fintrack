# API/UI Parity Report

Generated on `2026-03-10` by `scripts/feature_audit.py`.

## Matrix Validation

- Required features tracked: **12**
- Required features currently Broken: **0**
- Status counts: `{'Implemented': 7, 'Missing': 12, 'Partial': 5, 'Broken': 1}`
- Tier counts: `{'Required': 12, 'AddNext': 5, 'Optional': 8}`
- Acceptance counts: `{'AtRisk': 23, 'Accepted': 2}`

Matrix validation errors:
- None

## Required Gate

- Gate status: **FAIL**
- Rule: all `Required` rows must be `Accepted` and none may be `Broken`.
- Violations:
- api_ui_contract_integrity: acceptance_status is AtRisk
- pagination_end_to_end: acceptance_status is AtRisk
- transaction_crud: acceptance_status is AtRisk
- automated_test_suite: acceptance_status is AtRisk
- auth_jwt_flow: acceptance_status is AtRisk
- transaction_filter_sort_date: acceptance_status is AtRisk
- budget_crud_monthly: acceptance_status is AtRisk
- budget_progress_tracking: acceptance_status is AtRisk
- dashboard_metrics_overview: acceptance_status is AtRisk
- profile_password_management: acceptance_status is AtRisk

## Parity Findings

| Severity | Finding | Detail | Evidence |
|---|---|---|---|
| P2 | Download control has no export action bound | Transactions page shows export icon button with no onClick/export implementation. | `web/app/pages/transactions/index.tsx`<br>`README.md` |
| P2 | Automated regression tests are missing for core flows | No meaningful API/UI test files found for budgeting core features. | `api/pft/tests/__init__.py`<br>`README.md` |


## Schema Endpoints Not in Active Backend

- None


## Active Backend Endpoints Missing From Schema

- None

