# API/UI Parity Report

Generated on `2026-08-12` by `scripts/feature_audit.py`.

## Matrix Validation

- Required features tracked: **12**
- Required features currently Broken: **0**
- Status counts: `{'Implemented': 13, 'Missing': 11, 'Partial': 1}`
- Tier counts: `{'Required': 12, 'AddNext': 5, 'Optional': 8}`
- Acceptance counts: `{'Accepted': 13, 'AtRisk': 12}`

Matrix validation errors:
- None

## Required Gate

- Gate status: **PASS**
- Rule: all `Required` rows must be `Accepted` and none may be `Broken`.
- Violations:
- None

## Parity Findings

| Severity | Finding | Detail | Evidence |
|---|---|---|---|
| P2 | Backend routes missing from OpenAPI schema | 31 active endpoints are not represented in schema. | `api/pft/routers.py`<br>`api/pft/urls.py`<br>`web/schema/pft.yaml` |


## Schema Endpoints Not in Active Backend

- None


## Active Backend Endpoints Missing From Schema

- `/api/v1/finance/`
- `/api/v1/finance/accounts/`
- `/api/v1/finance/accounts/{id}/`
- `/api/v1/finance/backups/`
- `/api/v1/finance/backups/{id}/`
- `/api/v1/finance/budget-files/`
- `/api/v1/finance/budget-files/{id}/`
- `/api/v1/finance/budget-months/`
- `/api/v1/finance/budget-months/{id}/`
- `/api/v1/finance/categories/`
- `/api/v1/finance/categories/{id}/`
- `/api/v1/finance/category-groups/`
- `/api/v1/finance/category-groups/{id}/`
- `/api/v1/finance/envelope-assignments/`
- `/api/v1/finance/envelope-assignments/{id}/`
- `/api/v1/finance/exports/`
- `/api/v1/finance/exports/{id}/`
- `/api/v1/finance/imports/`
- `/api/v1/finance/imports/{id}/`
- `/api/v1/finance/payees/`
- `/api/v1/finance/payees/{id}/`
- `/api/v1/finance/postings/`
- `/api/v1/finance/postings/{id}/`
- `/api/v1/finance/reports/`
- `/api/v1/finance/reports/{id}/`
- `/api/v1/finance/rules/`
- `/api/v1/finance/rules/{id}/`
- `/api/v1/finance/tags/`
- `/api/v1/finance/tags/{id}/`
- `/api/v1/finance/transactions/`
- `/api/v1/finance/transactions/{id}/`

