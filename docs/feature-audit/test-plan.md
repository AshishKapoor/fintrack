# Test Plan (Budgeting Core)

## Functional Smoke Scenarios

1. Auth and session lifecycle
- Register with valid email/password.
- Login, access protected routes, refresh token, logout.
- Verify unauthorized access redirects to login.

2. Category CRUD
- Create income and expense categories.
- Update name/type.
- Delete category and verify list consistency.

3. Transaction CRUD and filters
- Create, edit, delete income and expense transactions.
- Filter by type/date/search and verify counts.
- Validate sort modes and date picker behavior.

4. Budget create/update/progress
- Create budgets for expense categories in current month.
- Update existing budget limit (same month/category/year).
- Verify progress and over-budget indicators.

5. Dashboard metrics
- Validate totals for selected date range.
- Verify previous-period comparison fields.
- Cross-check chart values against transaction data.

6. Profile and password
- Update profile fields.
- Change password with valid and invalid combinations.

## Contract Parity Checks

1. Route list vs schema
- Active backend routes from `api/pft/routers.py`, `api/pft/urls.py`, and `api/app/urls.py` must match active OpenAPI module surface.

2. Frontend calls vs generated client
- If frontend imports `@/client/gen/pft/*`, generated client directory must exist and compile.

3. Schema model shape vs UI assumptions
- UI must not assume nested objects where schema defines primitive ids.

## Reliability Checks

1. Pagination correctness
- Next/Previous controls must query the requested API page.

2. Error handling
- Validate user-facing errors for 400/401/403/404/network paths.

3. Empty/loading states
- Verify empty placeholders and spinners across dashboard, categories, transactions, budgets.

4. Stale data refresh behavior
- After create/update/delete, lists and dependent widgets must refresh consistently.

5. Auth refresh race handling
- Verify queued requests during refresh complete correctly.

## Execution Commands

```bash
python3 scripts/feature_audit.py
cd api && make test
cd web && pnpm lint
```

## Final Validation Gate

- Every `Required` feature in `feature-matrix.json` has `acceptance_status = Accepted`.
- No `Required` feature has `status = Broken`.
- No P1 mismatches remain in `parity-report.md`.
