# FinTrack Feature Audit

This directory is the source of truth for feature status, prioritization, and readiness checks for the budgeting core roadmap.

## Artifacts

- `feature-row.schema.json`: contract for every audit row.
- `feature-matrix.json`: scored feature inventory and tiering.
- `prioritized-roadmap.md`: implementation order by tier and priority.
- `parity-report.md`: current API/UI contract and implementation mismatches.
- `test-plan.md`: smoke, parity, and reliability validation scenarios.

## Scoring Model

- `priority_score = 0.5 * value_score + 0.3 * risk_score + 0.2 * (6 - effort_score)`
- `value_score`: user value impact (1-5, higher is better)
- `risk_score`: risk reduction impact (1-5, higher is better)
- `effort_score`: implementation effort (1-5, lower is better)

## Status Rules

- `status`:
  - `Implemented`: behavior is present across API, data, and UX
  - `Partial`: behavior exists but has meaningful gaps
  - `Missing`: behavior does not exist
  - `Broken`: behavior exists but currently fails contract or expected UX
- `acceptance_status`:
  - `Accepted`: UX + API + data behavior verified
  - `AtRisk`: any one of UX/API/data is incomplete or inconsistent

## Validation

Run:

```bash
python3 scripts/feature_audit.py
```

The script validates matrix shape/scoring and regenerates the parity report summary from the current codebase.
