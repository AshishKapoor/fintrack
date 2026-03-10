# Prioritized Roadmap (Budgeting Core)

This roadmap is derived directly from `feature-matrix.json` using the agreed Value-Effort-Risk model.

## Priority Order (Top Work)

| Rank | Feature ID | Tier | Score | Status |
|---|---|---|---:|---|
| 1 | `api_ui_contract_integrity` | Required | 4.8 | Implemented |
| 2 | `pagination_end_to_end` | Required | 4.8 | Implemented |
| 3 | `transaction_crud` | Required | 4.6 | Implemented |
| 4 | `automated_test_suite` | Required | 4.6 | Partial |
| 5 | `auth_jwt_flow` | Required | 4.5 | Partial |
| 6 | `category_crud` | Required | 4.5 | Implemented |
| 7 | `transaction_filter_sort_date` | Required | 4.3 | Partial |
| 8 | `budget_crud_monthly` | Required | 4.3 | Implemented |
| 9 | `data_export_csv_json` | AddNext | 4.0 | Implemented |
| 10 | `budget_progress_tracking` | Required | 3.8 | Partial |

## Required Core (Must Stabilize First)

- `api_ui_contract_integrity`: completed in Phase 1; maintain via audit script and keep schema/client in sync.
- `pagination_end_to_end`: completed in Phase 1; add regression tests for next/previous behavior.
- `transaction_crud`: harden list/detail shape handling and ensure mutations refresh correct lists.
- `automated_test_suite`: add backend API tests and frontend smoke tests for critical flows.
- `auth_jwt_flow`: verify token refresh/logout edge cases and tighten session handling behavior.
- `category_crud`: retain as baseline; keep accepted with regression coverage.
- `transaction_filter_sort_date`: align server/query filtering and client controls.
- `budget_crud_monthly`: keep current flow, add validation coverage for update/create behavior.
- `budget_progress_tracking`: validate current-month calculations and edge cases.
- `dashboard_metrics_overview`: unify range filtering between summary cards/charts/recent activity.
- `profile_password_management`: keep behavior, add negative-path and validation tests.
- `responsive_theme_currency`: maintain as accepted non-blocking baseline.

## Phase 1 Completed

- Schema now matches active backend route surface (`/api/token/*`, `/api/v1/{register,me,profile,categories,transactions,budgets}`).
- Generated API client compatibility files are present under `web/app/client/gen/pft`.
- Transactions pagination now sends `page` query parameter via `useV1TransactionsList({ page: currentPage })`.

## Phase 2 Completed

- Transactions export now supports CSV and JSON from current filtered results.
- Initial backend smoke test suite added for registration, category/transaction/budget flows, and profile/password updates.

## Add Next (After Core Is Reliable)

- `data_export_csv_json`: implement real CSV/JSON export endpoints and connect the Transactions download action.
- `data_import_csv_bank`: add CSV import pipeline and validation-driven import UX.
- `account_delete_flow`: implement API + confirmation UX for account deletion.
- `budget_alerts_notifications`: add threshold rules and in-app alert surfaces.
- `recurring_transactions`: add recurrence model fields, schedule logic, and UI.

## Optional Nice-to-Have (Deferred)

- `pwa_offline_support`
- `savings_goals`
- `subscriptions_tracking`
- `debt_tracking`
- `bill_reminders`
- `investments_portfolio`
- `native_mobile_apps`
- `advanced_analytics_reports`

## Exit Criteria for Core Phase

- Every `Required` feature row has `acceptance_status = Accepted`.
- No `Required` feature remains `Broken`.
- Contract parity report has no P1/P2 mismatches for active modules.
