# Contributing to FinTrack

Thanks for taking the time. This guide is meant to get you from a fresh clone to a
merged pull request without guessing.

## Ground rules

- Issues and pull requests are both welcome. For anything larger than a bug fix,
  open an issue first so we can agree on the approach before you write code.
- Security problems go through [private reporting](SECURITY.md), never a public issue.
- Be kind. See the [Code of Conduct](CODE_OF_CONDUCT.md).

## Repository layout

```
apps/api/         Django + DRF backend (uv, Python 3.12+)
apps/web/         React 19 + Vite single-page app (pnpm)
apps/landing/     Next.js marketing site (pnpm) - independent of the app
packages/sdk-ts/  @fintrack/sdk - generated TypeScript client (npm)
packages/sdk-py/  fintrack-sdk - generated Python client (PyPI)
docs/             Self-hosting guide, ADRs, blog, feature audit artifacts
scripts/          Repo tooling
```

The backend has two API surfaces that both exist today:

- `/api/v1/*` - auth, profile, workspaces, audit log, plus the deprecated flat
  `Transaction`/`Category`/`Budget` model (removal planned for `v1.0.0`).
- `/api/v1/finance/*` - a double-entry ledger with envelope budgeting, rules,
  scheduled transactions, reports, imports, exports and backups.

The web app talks to the finance API directly through the generated client in
`apps/web/app/client/gen/`. New features belong on the finance surface; the
legacy endpoints are maintained, not extended.

## Getting set up

The fastest path is Docker:

```bash
make dev
```

That creates any missing `.env` files from their examples, then starts Postgres,
the API with autoreload on http://localhost:8000, and the web app on
http://localhost:5173.

### Backend without Docker

```bash
cd apps/api && cp .env.example .env && uv sync && uv run manage.py migrate && uv run manage.py runserver
```

`uv` is the only supported Python toolchain - `uv.lock` is authoritative. There is
no Poetry setup any more.

### Frontend without Docker

```bash
cd apps/web && cp .env.example .env && pnpm install && pnpm dev
```

pnpm's version is pinned by the `packageManager` field; run `corepack enable` once
and it will be used automatically.

## Before you open a pull request

Run what CI runs:

```bash
cd apps/api && uv run ruff check . && uv run manage.py test
```

```bash
cd apps/web && pnpm run lint && pnpm run test && pnpm run build
```

End-to-end tests drive a real stack, so bring it up first:

```bash
docker compose up -d && cd apps/web && pnpm exec playwright install chromium && pnpm exec playwright test
```

And, if you touched anything in the Docker or settings layer:

```bash
make build && make up && curl -fsS http://localhost:8000/healthz/
```

Optionally install the git hooks so formatting and secret scanning run locally:

```bash
uv run pre-commit install
```

## Sign your commits (DCO)

FinTrack uses the [Developer Certificate of Origin](https://developercertificate.org/)
rather than a CLA. Add a `Signed-off-by` line to each commit — `git commit -s`
does it for you. See [docs/adr/0001-licensing.md](docs/adr/0001-licensing.md)
for why.

## Conventions

- **Commits** follow [Conventional Commits](https://www.conventionalcommits.org/):
  `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- **Python** is formatted and linted by Ruff (`line-length = 88`). Run
  `uv run ruff check --fix .`, but read the diff: Ruff will happily delete
  side-effect imports that matter.
- **TypeScript** follows the ESLint flat config in `apps/web/eslint.config.js`. Avoid
  `any`; if you truly need it, explain why in a comment.
- `apps/web/app/client/gen/` is orval's output and **is tracked in git** - never
  edit it by hand; regenerate it instead (see below). CI fails if it drifts
  from the schema.

## If you change the API

The OpenAPI schema is the contract, and CI keeps every consumer in lockstep.
After changing serializers, views, or routes:

```bash
cd apps/api && uv run manage.py spectacular --file ../web/schema/pft.yaml   # 1. schema
```

```bash
cd apps/web && pnpm orval                                                   # 2. web client
```

```bash
cd packages/sdk-ts && pnpm run generate && pnpm run build                   # 3. TS SDK
```

```bash
cd packages/sdk-py && uvx openapi-python-client generate \
  --path ../../apps/web/schema/pft.yaml --output-path fintrack_sdk \
  --meta none --overwrite && python3 post_generate.py                       # 4. Python SDK
```

Commit the regenerated artifacts with your change - CI diff gates enforce all
four.

## Testing expectations

- Backend changes need tests. `apps/api/pft/tests/` has suites for API smoke,
  the finance domain, ledger invariants, filtering, tenant isolation,
  organizations, the audit log, auth hardening, and account deletion.
- **Anything that touches a queryset, serializer or permission must have a
  cross-tenant test** in `apps/api/pft/tests/test_tenant_isolation.py`. This is a
  multi-user finance app; "user B cannot see or change user A's data" is the
  guarantee we care about most.
- The frontend has vitest for units (`apps/web/**/*.test.ts`) and Playwright for the
  smoke path (`apps/web/e2e/`). Both run in CI. The Playwright suite exercises the
  real stack through nginx, so it catches things unit tests cannot - it is how
  the login redirect loop and the stale transaction list were found.

## Good first issues

Look for the `good first issue` label. If none are open and you want somewhere to
start, these are all real and self-contained:

- Audit `apps/web/app/components/ui/` for shadcn components nothing imports and
  remove them.
- Build an audit-log viewer UI for `/api/v1/audit-log/` (the API is done,
  including CSV export; managers currently have no screen for it).
- Rename `CategoryV2`/`CategoryGroupV2` (schema + models + regenerated
  clients) before `v1.0.0` bakes the names in.
- Merge `apps/web/app/lib/finance-client.ts`'s remaining helpers into the
  generated client + `lib/ledger.ts` and delete it.
- Move the access token out of JavaScript-readable cookies (HttpOnly refresh
  cookie + in-memory access token) - see SECURITY.md's known limitations.
