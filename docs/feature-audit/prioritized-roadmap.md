# Prioritized Roadmap (Budgeting Core)

This roadmap is derived directly from `feature-matrix.json` using the agreed Value-Effort-Risk model.

## Priority Order (Top Work)

| Rank | Feature ID | Tier | Score | Status |
|---|---|---|---:|---|
| 1 | `api_ui_contract_integrity` | Required | 4.8 | Implemented |
| 2 | `pagination_end_to_end` | Required | 4.8 | Implemented |
| 3 | `transaction_crud` | Required | 4.6 | Implemented |
| 4 | `automated_test_suite` | Required | 4.6 | Implemented |
| 5 | `auth_jwt_flow` | Required | 4.5 | Implemented |
| 6 | `category_crud` | Required | 4.5 | Implemented |
| 7 | `transaction_filter_sort_date` | Required | 4.3 | Implemented |
| 8 | `budget_crud_monthly` | Required | 4.3 | Implemented |
| 9 | `data_export_csv_json` | AddNext | 4.0 | Implemented |
| 10 | `budget_progress_tracking` | Required | 3.8 | Partial |

## Required Core (Must Stabilize First)

- `api_ui_contract_integrity`: completed in Phase 1; maintain via audit script and keep schema/client in sync.
- `pagination_end_to_end`: completed in Phase 1 and verified by API pagination smoke tests.
- `transaction_crud`: completed and validated by create/update/delete API smoke coverage.
- `automated_test_suite`: Docker-runnable backend smoke suite added; frontend smoke coverage remains future work.
- `auth_jwt_flow`: JWT obtain/refresh and protected-route behavior validated.
- `category_crud`: retain as baseline; keep accepted with regression coverage.
- `transaction_filter_sort_date`: server-side search/ordering and date filters completed and validated.
- `budget_crud_monthly`: create and same-month upsert behavior validated.
- `budget_progress_tracking`: validate current-month calculations and edge cases.
- `dashboard_metrics_overview`: unify range filtering between summary cards/charts/recent activity.
- `profile_password_management`: update/password success paths validated.
- `responsive_theme_currency`: maintain as accepted non-blocking baseline.

## Phase 1 Completed

- Schema now matches active backend route surface (`/api/token/*`, `/api/v1/{register,me,profile,categories,transactions,budgets}`).
- Generated API client compatibility files are present under `web/app/client/gen/pft`.
- Transactions pagination now sends `page` query parameter via `useV1TransactionsList({ page: currentPage })`.

## Phase 2 Completed

- Transactions export now supports CSV and JSON from current filtered results.
- Initial backend smoke test suite added for registration, category/transaction/budget flows, and profile/password updates.

## Phase 3 Completed (In Progress Gate)

- Added deterministic queryset ordering for categories, transactions, and budgets to support stable pagination.
- Added server-side transaction `search_fields` and `ordering_fields`.
- Added Docker-runnable test commands (`make bootstrap`, `make test-api`, `make test-api-all`).
- Expanded smoke tests to cover JWT obtain/refresh, protected route auth, filtering, ordering, pagination, and CRUD/update paths.

## Add Next (After Core Is Reliable)

- `data_export_csv_json`: optional future enhancement is backend-generated export files; current client-side export is available.
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
