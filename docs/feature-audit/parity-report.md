# API/UI Parity Report

Generated on `2026-03-10` by `scripts/feature_audit.py`.

## Matrix Validation

- Required features tracked: **12**
- Required features currently Broken: **0**
- Status counts: `{'Implemented': 11, 'Partial': 3, 'Missing': 11}`
- Tier counts: `{'Required': 12, 'AddNext': 5, 'Optional': 8}`
- Acceptance counts: `{'Accepted': 11, 'AtRisk': 14}`

Matrix validation errors:
- None

## Required Gate

- Gate status: **FAIL**
- Rule: all `Required` rows must be `Accepted` and none may be `Broken`.
- Violations:
- budget_progress_tracking: acceptance_status is AtRisk
- dashboard_metrics_overview: acceptance_status is AtRisk

## Parity Findings

No parity findings.


## Schema Endpoints Not in Active Backend

- None


## Active Backend Endpoints Missing From Schema

- None

