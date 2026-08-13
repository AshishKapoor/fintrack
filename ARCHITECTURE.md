# Architecture

This document explains how FinTrack is put together and, more usefully, *why it
looks the way it does*. The backend currently carries two overlapping data
models, which is the single most confusing thing about the codebase. That is
explained in full below.

## The shape of the system

```
                  ┌──────────────┐
   browser ──────▶│  nginx (web) │  serves the built SPA
                  │              │  proxies /api/ ──▶ gunicorn (api)
                  └──────────────┘                        │
                                                          ▼
                                                   ┌─────────────┐
                                                   │ PostgreSQL  │
                                                   └─────────────┘
```

- `apps/web/` is a React 19 single-page app built by Vite and served as static files
  by nginx, which also proxies `/api/` to the backend. There is no server-side
  rendering and no Node process at runtime.
- `apps/api/` is Django + Django REST Framework behind gunicorn. Authentication is
  JWT (SimpleJWT); there are no server-side sessions for the API.
- `worker/` is the same image running Celery against Redis. Import execution
  and exports run there; job state lives on the `ImportJob`/`ExportJob` rows,
  which clients poll. With no `REDIS_URL`, tasks run eagerly inline — the test
  suite and bare-metal trials need no broker.
- `apps/landing/` is a separate Next.js marketing site. It is **not** part of the
  self-hosted stack and is not referenced by `docker-compose.yml`.

## The two API surfaces

This is the part worth reading before changing anything.

### `/api/v1/*` — the original flat model

Three models, each owned directly by a user:

| Model | Meaning |
|---|---|
| `Category` | a name plus `income`/`expense`. `user` may be NULL, meaning a global category shared by everyone (readable by all, writable by none). |
| `Transaction` | a single signed amount with a title, type and date. |
| `Budget` | a spending limit for one category in one month/year. |

Simple, and adequate for "track what I spent". It cannot represent a transfer
between two accounts without double-counting, and it has no concept of an
account balance.

### `/api/v1/finance/*` — the double-entry ledger

Added later, this is a proper accounting model. The tenant root is
`BudgetFile` (a user can have several; exactly one is the default):

```
User
 └── BudgetFile                    (currency, is_default)
      ├── Account                  (checking / savings / cash / credit / asset / liability)
      ├── CategoryGroupV2
      │    └── CategoryV2          (income / expense)
      ├── Payee, Tag
      ├── LedgerTransaction        (date, payee, memo, cleared, source_type)
      │    └── LedgerPosting       (amount, and exactly one of account XOR category)
      ├── BudgetMonth              (year, month, envelope or traditional)
      │    └── EnvelopeAssignment  (assigned, carryover, goal)
      ├── ScheduledTransaction     (recurrence + a transaction template)
      ├── TransactionRule          (conditions + actions, JSON)
      ├── SavedReport
      ├── ImportJob, ExportJob, EncryptedBackupBundle
      └── TransactionEvent         (append-only audit log)
```

**The core invariant: the postings of a transaction must sum to zero.** Buying
£10 of groceries is two postings — `-10.00` against your checking account and
`+10.00` against the Food category. A transfer is two *account* postings and no
category, tied together by `transfer_group`.

This is enforced in two places, which is worth knowing:

- `LedgerPosting` has a database `CheckConstraint`
  (`ledger_posting_exactly_one_target`) guaranteeing each posting references an
  account **or** a category, never both and never neither.
- The zero-sum rule is enforced in the serializer
  (`finance_serializers._validate_postings`), not in the database.

Business logic lives in `apps/api/pft/finance_services.py`: balances and net worth,
cash flow, spending trends, envelope snapshots, the rules engine, schedule
materialisation, CSV/XLSX export, and importers for CSV, OFX, QFX, QIF,
CAMT.053 and YNAB. Views stay thin and delegate to it.

### How the two relate

Both are live and routed at the same time. On signup, `pft/signals.py` seeds
**both** trees: the ten legacy `Category` rows *and* a default `BudgetFile`, a
"Cash" account, two category groups and ten `CategoryV2` rows. Nothing keeps
them in sync afterwards.

The web app reads through the legacy shapes but **writes to the finance API**.
That translation lives in one file, `apps/web/app/client/pft/v1/v1.ts`: it resolves
the default budget file and account, maps a `LedgerTransaction` and its postings
back into a flat `Transaction`, and splits a flat write back into balanced
postings.

That file is hand-written and lives next to — not inside — `apps/web/app/client/gen/`,
which is orval's output directory. Do not run `pnpm orval` expecting it to
produce this; it will overwrite it with something that does not compile.

### Where this is going

The ledger model is the one to keep.

`/api/v1/{transactions,categories,budgets}` are **deprecated**. They keep
working, but every response now carries deprecation headers naming the
successor, so anything scripting against them finds out before they are removed:

```http
Deprecation: @1786492800
Link: </api/v1/finance/>; rel="successor-version"
Warning: 299 - "This endpoint is deprecated and will be removed in v1.0.0..."
```

The remaining steps, not yet done:

1. Move the UI onto `/api/v1/finance/*` directly, removing the adapter in
   `apps/web/app/client/pft/v1/v1.ts`.
2. Remove the legacy endpoints and models in `v1.0.0`.
3. Rename `CategoryV2` and `CategoryGroupV2` — the "V2" suffix is an accident of
   history that is currently baked into the public schema.

Until then, when you add a feature: **add it to the finance domain.** The legacy
endpoints are maintained, not extended.

## Request lifecycle

```
Request
  → corsheaders
  → SecurityMiddleware, session, common, CSRF, auth, messages, clickjacking
  → DRF view
      → JWTAuthentication          (Authorization: Bearer <access>)
      → IsAuthenticated
      → ScopedRateThrottle         (login / register / password_change)
      → get_queryset()             ← tenant scoping happens HERE
      → serializer.validate_*()    ← ownership of referenced objects checked HERE
      → finance_services.*         ← business logic
```

### Tenant scoping is per-viewset, and that is the risk

`UserScopedModelViewSet` only sets `permission_classes = [IsAuthenticated]`.
Despite the name, **it does not scope anything.** Every viewset is responsible
for filtering its own queryset:

```python
# /api/v1/*        - the user owns the row directly
Transaction.objects.filter(user=self.request.user)

# /api/v1/finance/* - ownership is reached through the budget file
Account.objects.filter(budget_file__user=self.request.user)
LedgerPosting.objects.filter(transaction__budget_file__user=self.request.user)
EnvelopeAssignment.objects.filter(budget_month__budget_file__user=self.request.user)
```

`LedgerPosting`, `LedgerTransactionTag`, `EnvelopeAssignment` and
`TransactionEvent` have **no user column at all** — they rely entirely on that
FK chain. One missing filter is a cross-tenant leak.

Filtering the queryset is also not sufficient on its own. Any field that
accepts an ID from the request body must be ownership-checked, or a user can
point their own row at somebody else's object. Every past isolation bug in this
codebase was of that shape.

**This is why `apps/api/pft/tests/test_tenant_isolation.py` exists, and why any change
to a queryset, serializer or permission needs a test there.**

## Frontend structure

```
apps/web/app/
├── main.tsx              root: router, SWR config, currency context, analytics
├── app.tsx               route table and layout switch
├── pages/                one directory per route
├── components/           feature components
│   └── ui/               shadcn primitives
├── client/
│   ├── httpPFTClient.ts  axios instance, auth header, 401 refresh-and-retry,
│   │                     error toasts, offline mutation queue
│   ├── pft/              hand-maintained API client (see above)
│   └── gen/              orval output - generated, gitignored
├── lib/                  auth (JWT cookies), finance-client, dates, analytics
├── hooks/                Zustand stores
└── context/              currency provider
```

Data fetching is SWR keyed on URL-ish strings. Note that global revalidation is
switched off in `main.tsx`, so data refreshes on explicit mutation rather than
on focus or reconnect.

`apps/web/app/lib/finance-client.ts` is a *second* hand-written client used by the
reports and rules pages. It duplicates helpers from `client/pft/v1/v1.ts`,
including a separate budget-file cache. Merging the two is a good contribution.

## Authentication

- `POST /api/token/` → `{access, refresh}`. Rate limited.
- Access tokens last 5 minutes, refresh tokens 1 day, and refresh tokens rotate.
- `POST /api/token/refresh/` returns a new pair and blacklists the old refresh
  token.
- `POST /api/token/logout/` blacklists one token, or every session with
  `{"all": true}`. Changing a password blacklists everything.
- The browser stores tokens in cookies written by JavaScript, with
  `SameSite=Strict` and `Secure` on HTTPS. They are **not** HttpOnly, so an XSS
  is an account takeover. Moving the access token into memory with an
  HttpOnly refresh cookie is a known improvement.

## Settings

`apps/api/app/settings/` splits into `base.py`, `dev.py` and `prod.py`. Containers
run `prod` by default; `make dev` selects `dev`. Everything deployment-specific
comes from the environment — see `.env.example` and `SECURITY.md`.

`SECRET_KEY` is required in production. If unset, one is generated and persisted
to `SECRET_KEY_FILE` on first boot so sessions survive a restart; the settings
module refuses to fall back to any known placeholder.

## Migrations

`apps/api/pft/migrations/` is a linear chain. `0002` creates nine models for an
abandoned SaaS direction and `0003` deletes all nine — 240 lines that net to
zero, kept only because rewriting history is not worth it. `0005` creates the
entire finance domain and backfills existing v1 rows into it, marking them with
`match_key="v1-<id>"`.

Migrations are not reversible: the data migrations have no-op reverse functions.

## Testing

```
apps/api/pft/tests/
├── test_api_smoke.py         registration, JWT, CRUD, filtering, pagination
├── test_api_finance_v1.py    ledger, envelopes, reports, import/export, backups
├── test_tenant_isolation.py  user B cannot read or write user A's data
└── test_auth_hardening.py    logout, token revocation, throttling
```

There is no frontend test harness yet. Adding vitest plus one Playwright smoke
path is a genuinely valuable contribution.
