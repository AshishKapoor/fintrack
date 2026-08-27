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
- `beat/` is again the same image, running `celery -A app beat`. It only ever
  submits the periodic tasks in `CELERY_BEAT_SCHEDULE` for `worker` to
  actually run - see `pft/tasks.py`: a daily job-payload prune, an hourly
  scheduled-transaction materialization, and three notification sweeps
  (budget threshold alerts and reminders daily, a digest weekly). Its
  schedule state lives on the same `api_run` volume as the generated
  `SECRET_KEY`, so a restart does not lose track of when a task last fired.
- `apps/landing/` is a separate Next.js marketing site. It is **not** part of the
  self-hosted stack and is not referenced by `docker-compose.yml`.

## The API surface

This is the part worth reading before changing anything.

FinTrack shipped two parallel data models for most of its life: a flat
`Category`/`Transaction`/`Budget` trio owned directly by a user, and the
double-entry ledger under `/api/v1/finance/*`. Both were live, both were seeded
on signup, and nothing kept them in sync. The flat one could not represent a
transfer between two accounts without double-counting and had no concept of an
account balance, so the ledger is the one that was kept. **Migration `0017`
retired the flat models and their endpoints**, carrying any rows they still
held into the ledger first (`Transaction` → a balanced `LedgerTransaction`,
`Budget` → an `EnvelopeAssignment`), stamped `match_key="legacy:<pk>"` so the
provenance survives in the database.

Everything below describes the one surface that remains.

### `/api/v1/finance/*` — the double-entry ledger

The tenant root is
`BudgetFile` (a user can have several; exactly one is the default):

```
User
 └── BudgetFile                    (currency, is_default)
      ├── Account                  (checking / savings / cash / credit / asset / liability, own currency_code)
      ├── CategoryGroup
      │    └── Category            (income / expense)
      ├── Payee, Tag
      ├── LedgerTransaction        (date, payee, memo, cleared, source_type)
      │    └── LedgerPosting       (amount, and exactly one of account XOR category)
      ├── BudgetMonth              (year, month, envelope or traditional)
      │    └── EnvelopeAssignment  (assigned, carryover, goal)
      ├── ScheduledTransaction     (recurrence + a transaction template)
      ├── TransactionRule          (conditions + actions, JSON)
      ├── SavedReport
      ├── ImportJob, ExportJob, EncryptedBackupBundle
      ├── SyncConnection           (bank sync - provider, status, encrypted credentials)
      │    └── SyncConnectionAccount  (one external account, mapped to a local Account)
      └── TransactionEvent         (append-only audit log)

FxRate                             (date, currency, EUR-based rate - not tenant-scoped, shared reference data)
```

**The core invariant: the postings of a transaction must sum to zero.** Buying
£10 of groceries is two postings — `-10.00` against your checking account and
`+10.00` against the Food category. A transfer is two *account* postings and no
category, tied together by `transfer_group`.

This is enforced in three places, which is worth knowing:

- `LedgerPosting` has a database `CheckConstraint`
  (`ledger_posting_exactly_one_target`) guaranteeing each posting references an
  account **or** a category, never both and never neither.
- The zero-sum rule is validated in the serializer
  (`finance_serializers._validate_postings`) so API callers get a clean 400.
- The zero-sum rule is *also* enforced in the database by a deferred
  constraint trigger (migration `0006`): at commit time, any transaction whose
  postings do not sum to zero aborts. Bulk paths, imports, and future bugs
  cannot corrupt the ledger even if they bypass the serializer.

Business logic lives in `apps/api/pft/finance_services.py`: balances and net worth,
cash flow, spending trends, envelope snapshots, the rules engine, schedule
materialisation, CSV/XLSX export, and importers for CSV, OFX, QFX, QIF,
CAMT.053, YNAB, Firefly III and Actual Budget (see
[docs/migrating.md](docs/migrating.md)). Views stay thin and delegate to it.

### Bank sync

`pft/bank_sync.py` defines the provider contract (`BankSyncProvider`) and the
provider-agnostic half of syncing: `ingest_transactions` turns a provider's
fetched rows into ledger transactions the same way `execute_import_job` does
for a file - two postings, a `match_key` existence check for dedup (here
`sync:<provider>:<external_account_id>:<external_id>`, since a provider's own
transaction id is more reliable than the content hash file imports use), then
`apply_rules`. `sync_connection` orchestrates one connection's mapped
accounts; `tasks.sync_bank_connections_task` runs it for every active
connection on a beat schedule (every 6 hours - GoCardless's free tier caps
daily polls per account).

Two providers ship: `pft/bank_sync_gocardless.py` (GoCardless Bank Account
Data, EU/UK, redirect-based linking, instance-wide API credentials) and
`pft/bank_sync_simplefin.py` (SimpleFIN Bridge, US/CA, a user-supplied setup
token claimed once for a durable access URL, no instance-wide config). Both
route every outbound request through `notifications.is_safe_outbound_url` -
the same SSRF guard ntfy/webhook URLs get, worth it here too since SimpleFIN's
claim/access URLs are derived from user-supplied input.

A connection's live credentials (`SyncConnection.secret_data`) are encrypted
at rest with `pft/crypto.py` (Fernet, keyed by `FINTRACK_SYNC_ENCRYPTION_KEY`)
- unlike `EncryptedBackupBundle`'s zero-knowledge client-side encryption, the
server has to read these back unattended on the beat schedule, so this only
protects against a database-only compromise. See
[docs/self-hosting.md#bank-sync](docs/self-hosting.md#bank-sync).

### Multi-currency

Every `Account` has its own `currency_code` (defaulting to its budget file's
at creation time - see `AccountSerializer.validate`). `pft/fx_rates.py` stores
daily ECB reference rates from frankfurter.app, EUR-based only (mirroring how
the ECB actually publishes them); converting between two non-EUR currencies
triangulates through EUR at read time. `finance_services.account_balances`/
`compute_net_worth` convert every account's balance into the budget file's
currency, returning `None` (never a guessed number) for a pair with no rate
fetched yet.

### How the pieces connect

On signup, `pft/signals.py` creates the user's personal `Organization`, their
owner `Membership`, and one default `BudgetFile`. The budget file's own
`post_save` seeds it - a "Cash" account, two category groups and ten
`Category` rows - so a workspace created later gets the same treatment
without duplicating the logic.

The web app talks to the finance API **directly**. The generated orval client
in `apps/web/app/client/gen/` (tracked in git, regenerated with `pnpm orval`,
guarded by a CI diff gate) provides the typed calls, and
`apps/web/app/lib/ledger.ts` supplies the small amount of domain vocabulary on
top: building balanced postings from form input, display helpers, and SWR
invalidation. The old read-legacy/write-finance adapter is gone.

### Where this went

1. ~~Move the UI onto `/api/v1/finance/*` directly~~ — done; the adapter is
   deleted and the UI runs on the generated client.
2. ~~Remove the legacy endpoints and models~~ — done in migration `0017`
   (ROADMAP.md Phase 4). They spent a release announcing themselves with RFC
   9745 `Deprecation`/`Link`/`Warning` headers before being dropped.
3. ~~Rename `CategoryV2` and `CategoryGroupV2`~~ — done in migration `0018`.
   The "V2" suffix existed only to distinguish them from the flat `Category`
   model, so it stopped meaning anything the moment `0017` dropped that model.
   `RenameModel` renames the tables in place; nothing is copied. Old
   `AuditLog.entity_type` values are rewritten to match, so filtering the
   audit log by `Category` still finds pre-rename history (the human-readable
   `summary` is left alone - that records what the system called the thing at
   the time).

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

## Workspaces (organizations)

A `BudgetFile` is owned either by a single user (`organization` is NULL — the
personal case) or by an `Organization`. Membership carries a role:

| Role | Can |
|---|---|
| `viewer` | read everything in the workspace |
| `member` | read and write finance data |
| `admin` | member + manage members and invitations |
| `owner` | admin + delete the workspace |

`Invitation` rows let admins invite by email; accepting creates a
`Membership`. Manager-visible activity is recorded via `pft/audit.py` and
served read-only (with CSV export) at `/api/v1/audit-log/`.

### Tenant scoping: one Q object, used everywhere

All finance querysets are scoped through `pft/tenancy.py`:

```python
# read access: personal files + files in any org you belong to
Account.objects.filter(budget_file_q(request.user))

# write access: viewer role is excluded
LedgerTransaction.objects.filter(budget_file_q(request.user, write=True))

# BudgetFile itself uses prefix="pk"
BudgetFile.objects.filter(budget_file_q(request.user, prefix="pk"))
```

`LedgerPosting`, `LedgerTransactionTag`, `EnvelopeAssignment` and
`TransactionEvent` have **no user column at all** — they rely entirely on the
FK chain to the budget file. One missing filter is a cross-tenant leak, and the
base viewset gates writes so a `viewer` is read-only across the board.

Filtering the queryset is also not sufficient on its own. Any field that
accepts an ID from the request body must be ownership-checked, or a user can
point their own row at somebody else's object. Every past isolation bug in this
codebase was of that shape.

**This is why `apps/api/pft/tests/test_tenant_isolation.py` exists, and why any change
to a queryset, serializer or permission needs a test there.**

## Notifications

`NotificationPreference` is one row per **user**, not per `BudgetFile` -
unlike everything above, "how do I want to be reached" (email / ntfy /
webhook, all off by default) and "what do I want to hear about" (budget
threshold, bill reminders, a weekly digest) are properties of a person, not
of a ledger. It lives on the account surface (`/api/v1/notifications/*`,
next to `/api/v1/profile/`), not the finance one.

The three triggers - `pft/notifications.py`'s `check_budget_threshold_alerts`,
`send_scheduled_transaction_reminders`, `send_weekly_digest` - each iterate
every opted-in preference and fan out across every `BudgetFile` that user can
access (`tenancy.accessible_budget_files`), so a shared workspace's members
each get alerted (or not) according to their own preference, not the
workspace's. Their Celery beat wrappers live in `pft/tasks.py` alongside
`materialize_due_scheduled_transactions_task`, same shape: a thin task,
`on_error`-tolerant business logic underneath, one bad tenant's data cannot
block another's.

Repeat sends are prevented by `NotificationLog`, a row per
`(user, kind, dedupe_key)` with a DB `UniqueConstraint` backing it, the same
"enforce the invariant in the database too" pattern as the ledger's zero-sum
trigger — a sweep that runs twice (or two beat processes running at once)
cannot double-send. `dedupe_key` encodes enough of the condition to be safe
to recompute from scratch every run: `"<budget_file>:<year-month>:<category>"`
for a threshold alert (one per category per month, however many days it
stays over), `"<schedule_id>:<next_run_date>"` for a reminder (the *next*
occurrence gets a fresh key once `next_run_date` advances), an ISO week for
the digest.

Channel sends (`send_email`, `send_ntfy`, `send_webhook`) are best-effort:
logged on failure, never raised, so one broken webhook cannot take down a
person's email alert or block the next tenant's sweep. `is_safe_outbound_url`
guards ntfy server URLs and webhook URLs against pointing the server at its
own private network (loopback/private/link-local/reserved ranges) — an SSRF
concern worth taking seriously specifically because self-hosting is the
primary deployment shape here, often on the same private network as other,
less-guarded services.

## Frontend structure

```
apps/web/app/
├── main.tsx              root: router, SWR config, currency context, analytics
├── i18n.ts               react-i18next setup — see docs/i18n.md
├── app.tsx               route table and layout switch
├── pages/                one directory per route (quick-add is the PWA
│                         quick-capture screen; settings/ reads ?tab= to
│                         land on a specific tab, e.g. from the bell icon;
│                         accounts/ is currency + bank sync management;
│                         bank-sync-callback/ is where a redirect-based
│                         provider like GoCardless lands after the user
│                         authenticates at their bank)
├── components/           feature components (payee-combobox and
│   │                     split-postings-editor are shared by the desktop
│   │                     dialogs, the register's inline row, and quick-add;
│   │                     connect-bank-dialog + map-discovered-accounts are
│   │                     shared by the accounts page and bank-sync-callback)
│   └── ui/               shadcn primitives
├── client/
│   ├── httpPFTClient.ts  axios instance, auth header, 401 refresh-and-retry,
│   │                     error toasts, offline mutation queue
│   └── gen/              orval output — generated, TRACKED in git, guarded by
│                         a CI regen-diff gate
├── lib/                  auth (JWT cookies), ledger.ts (posting builders —
│                         buildSplitPostings handles N category legs, SWR
│                         invalidation), finance-client (thin helpers, incl.
│                         account currency + the balances endpoint),
│                         bank-sync-client, backup, import/export, dates,
│                         analytics
├── e2e/  (../e2e)        Playwright suite — runs against the real stack in CI
├── hooks/                Zustand stores
└── context/              currency + organization providers
```

`public/locales/<lang>/translation.json` are the i18next catalogs (fetched at
runtime, not bundled) and `public/manifest.webmanifest` + `public/sw.js` are
the PWA app shell - both covered in `docs/i18n.md`.

Data fetching is SWR keyed on URL-ish strings. Note that global revalidation is
switched off in `main.tsx`, so data refreshes on explicit mutation rather than
on focus or reconnect.

## Authentication

- `POST /api/token/` → `{access, refresh}`. Rate limited.
- Access tokens last 5 minutes, refresh tokens 1 day, and refresh tokens rotate.
- `POST /api/token/refresh/` returns a new pair and blacklists the old refresh
  token.
- `POST /api/token/logout/` blacklists one token, or every session with
  `{"all": true}`. Changing a password blacklists everything.
- **Transport differs by caller.** The web app sends `X-Use-Refresh-Cookie: 1`
  on all three endpoints above, which does two things: the response omits
  `refresh` from the body, and the refresh token instead arrives as an
  `HttpOnly` cookie (`pft_refresh`, `SameSite=Strict`, `Secure` on HTTPS,
  scoped to `/api/token/`). The access token still comes back in the body as
  always, and the frontend keeps it in memory only - never a cookie or
  localStorage. Page JavaScript therefore never has a persistent copy of
  either token, so an XSS payload cannot exfiltrate one. Once a refresh token
  has arrived via cookie, rotation keeps re-cookying it even without the
  header. Callers that omit the header (the official SDKs, scripts, curl)
  keep getting the plain `{access, refresh}` body - this is purely additive.
  See `pft/auth_cookies.py` and `apps/web/app/lib/auth.ts`.

## Settings

`apps/api/app/settings/` splits into `base.py`, `dev.py` and `prod.py`. Containers
run `prod` by default; `make dev` selects `dev`. Everything deployment-specific
comes from the environment — see `.env.example` and `SECURITY.md`.

`SECRET_KEY` is required in production. If unset, one is generated and persisted
to `SECRET_KEY_FILE` on first boot so sessions survive a restart; the settings
module refuses to fall back to any known placeholder.

The database connects via discrete `DATABASE_NAME`/`USER`/`PASSWORD`/`HOST`/`PORT`
vars by default (`docker-compose.yml`'s path), or a single `DATABASE_URL` if
that's set instead - the shape Render, Railway and Heroku-style platforms hand
out (`database_config_from_env()`, `app/settings/base.py`). See
[docs/one-click-deploy.md](docs/one-click-deploy.md).

## Migrations

`apps/api/pft/migrations/` is a linear chain. `0002` creates nine models for an
abandoned SaaS direction and `0003` deletes all nine — 240 lines that net to
zero, kept only because rewriting history is not worth it. `0005` creates the
entire finance domain and backfills existing v1 rows into it, marking them with
`match_key="v1-<id>"`. `0017` retires the flat models, carrying anything
written through them *after* `0005` ran into the ledger as `legacy:<id>` -
both stamps are checked, so a pre-`0005` row is not carried twice. `0018`
renames `CategoryV2`/`CategoryGroupV2`, which is why it has to come after
`0017` frees up the `pft_category` table name.

Data migrations have no-op reverse functions, so unapplying one restores the
schema but not the rows. Schema operations do reverse: `migrate pft 0016`
works, which is what makes migration 0017's carry-over testable at all
(`test_legacy_api_retirement.py` runs the real migration backwards and
forwards against seeded rows).

## Testing

```
apps/api/pft/tests/
├── test_api_smoke.py         registration, JWT, CRUD, filtering, pagination
├── test_api_finance_v1.py    ledger, envelopes, reports, import/export, backups
├── test_ledger_invariants.py zero-sum DB trigger, Hypothesis property tests
├── test_ledger_filtering.py  server-side search / ordering / pagination
├── test_tenant_isolation.py  user B cannot read or write user A's data
├── test_organizations.py     workspaces, roles, invitations
├── test_audit_log.py         audit recording and manager-only access
├── test_auth_hardening.py    logout, token revocation, throttling
├── test_account_deletion.py  account deletion cascades
├── test_scheduled_transaction_scheduler.py  beat-driven materialization
├── test_notifications.py     channel senders, dedupe, the three triggers, the API
├── test_payee_suggestions.py payee → suggested-category learning
├── test_bank_sync.py         crypto, ingest/dedup, both providers (mocked HTTP), the API
├── test_fx_rates.py          rate fetch/store, EUR-triangulated conversion, the API
├── test_multi_currency.py    per-account currency defaulting and the balances endpoint
├── test_migration_importers.py  Firefly III / Actual Budget parsers, end-to-end import
├── test_insights_reports.py  net worth series, cash-flow Sankey, spending trends
├── test_savings_goals.py     goal progress read from live account balances
├── test_debt_payoff.py       snowball / avalanche projections
├── test_ai_categorization.py BYOK + Ollama suggestion path and its SSRF guard
├── test_demo_mode.py         read-only demo enforcement and the reset task
├── test_prune_finance_jobs.py  import/export payload pruning
├── test_database_url_config.py DATABASE_URL parsing
└── test_legacy_api_retirement.py  migration 0017's carry-over into the ledger
```

The frontend has vitest units (`apps/web/**/*.test.ts`) and a Playwright
end-to-end suite (`apps/web/e2e/`) that drives the real Docker stack through
nginx — login, transactions, budgets, import, backup/restore, notification
preferences, keyboard-first register entry (splits, the inline row), quick
add, accounts (per-currency CRUD), the bank sync connect dialog as far as it
goes without a live provider, and a two-browser shared-workspace scenario.
Both run in CI.

## Monorepo and SDKs

```
apps/       api, web, landing — deployables
packages/   sdk-ts (@fintrack/sdk on npm), sdk-py (fintrack-sdk on PyPI)
```

The OpenAPI schema is the contract between all of them:

```
drf-spectacular  ──▶  apps/web/schema/pft.yaml  ──▶  orval ──▶ apps/web/app/client/gen/
                                                 ──▶  orval ──▶ packages/sdk-ts/src/gen/
                                                 ──▶  openapi-python-client ──▶ packages/sdk-py/
```

CI enforces three lockstep gates: the committed schema matches the backend
(schema-sync), the web client matches the schema (orval regen diff), and the
Python SDK matches schema + generation + `post_generate.py` patch. Change the
API and CI tells you exactly which artifacts to regenerate.
