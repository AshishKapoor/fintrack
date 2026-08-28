# FinTrack API

Django 6 + Django REST Framework backend: JWT auth (SimpleJWT), a double-entry
ledger with envelope budgeting, shared workspaces with roles, imports/exports
on Celery, and an OpenAPI schema that drives every generated client.

For how the system fits together, read [ARCHITECTURE.md](../../ARCHITECTURE.md).
For contribution workflow, read [CONTRIBUTING.md](../../CONTRIBUTING.md).

## Run it

From the repo root, the full stack:

```bash
./setup.sh start
```

Or just the backend, locally:

```bash
cp .env.example .env    # point DATABASE_HOST at your Postgres
uv sync
uv run manage.py migrate
uv run manage.py runserver
```

`uv` is the only supported toolchain; `uv.lock` is authoritative.

## Layout

```
app/                Django project: settings (base/dev/prod), urls, celery
pft/                the finance domain
├── models.py       User, Organization, BudgetFile, the ledger models
├── tenancy.py      budget_file_q() — every queryset is scoped through this
├── pagination.py   StandardPagination — the one class every list endpoint uses
├── finance_views.py / finance_serializers.py / finance_services.py
├── org_views.py    workspaces, members, invitations
├── audit.py        audit_views.py — manager-only audit log
├── bank_sync.py    bank_sync_gocardless.py / bank_sync_simplefin.py
├── fx_rates.py     daily ECB reference rates and conversion
├── ai_categorization.py, notifications.py, crypto.py, demo_mode.py
├── tasks.py        Celery tasks (imports, exports)
└── tests/          one suite per domain; tenant isolation matters most
```

## Development

```bash
uv run ruff check .                 # lint
uv run manage.py test               # tests
uv run manage.py makemigrations     # after model changes
uv run manage.py spectacular --file ../web/schema/pft.yaml   # after API changes
```

The schema command matters: CI fails if the committed schema, the web client,
or either SDK drifts from the backend. See "If you change the API" in
CONTRIBUTING.md.

Two contracts a new endpoint has to honour:

- **Pagination.** Every list endpoint uses `pagination.StandardPagination` and
  returns `{count, next, previous, results}` — page size 50, `?page_size=`
  capped at 500. A viewset returning a bare array is a bug; `tests/test_pagination.py`
  is where it gets caught.
- **Tenancy.** Every queryset is scoped through `tenancy.budget_file_q()`, and
  anything touching a queryset, serializer or permission needs a cross-tenant
  case in `tests/test_tenant_isolation.py`.

Useful management commands:

```bash
uv run manage.py seed_demo             # demo user with six months of data
uv run manage.py prune_finance_jobs    # clear old import/export payloads (runs daily on its own via the beat service)
```

## API docs

Served by the running backend:

- `/api/schema/` — the OpenAPI document
- `/api/docs/` — Swagger UI
- `/api/redoc/` — ReDoc
