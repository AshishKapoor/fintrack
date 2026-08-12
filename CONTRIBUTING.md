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
api/        Django + DRF backend (uv, Python 3.12+)
web/        React 19 + Vite single-page app (pnpm)
landing/    Next.js marketing site (pnpm) - independent of the app
docs/       Feature audit artifacts
scripts/    Repo tooling
```

The backend has two API surfaces that both exist today:

- `/api/v1/*` - the original flat `Transaction`/`Category`/`Budget` model.
- `/api/v1/finance/*` - a double-entry ledger with envelope budgeting, rules,
  scheduled transactions, reports, imports, exports and backups.

The web app reads through the legacy shapes but writes to the finance API, via the
hand-maintained adapter in `web/app/client/pft/`. Consolidating these is the
biggest open piece of work.

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
cd api && cp .env.example .env && uv sync && uv run manage.py migrate && uv run manage.py runserver
```

`uv` is the only supported Python toolchain - `uv.lock` is authoritative. There is
no Poetry setup any more.

### Frontend without Docker

```bash
cd web && cp .env.example .env && pnpm install && pnpm dev
```

pnpm's version is pinned by the `packageManager` field; run `corepack enable` once
and it will be used automatically.

## Before you open a pull request

Run what CI runs:

```bash
cd api && uv run ruff check . && uv run manage.py test
```

```bash
cd web && pnpm run lint && pnpm run test && pnpm run build
```

End-to-end tests drive a real stack, so bring it up first:

```bash
docker compose up -d && cd web && pnpm exec playwright install chromium && pnpm exec playwright test
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
- **TypeScript** follows the ESLint flat config in `web/eslint.config.js`. Avoid
  `any`; if you truly need it, explain why in a comment.
- Do not commit generated API clients into `web/app/client/gen/` - that directory
  is orval's output and is ignored. The maintained client lives in
  `web/app/client/pft/`.

## Testing expectations

- Backend changes need tests. `api/pft/tests/` has three suites: smoke, finance,
  and tenant isolation.
- **Anything that touches a queryset, serializer or permission must have a
  cross-tenant test** in `api/pft/tests/test_tenant_isolation.py`. This is a
  multi-user finance app; "user B cannot see or change user A's data" is the
  guarantee we care about most.
- The frontend has vitest for units (`web/**/*.test.ts`) and Playwright for the
  smoke path (`web/e2e/`). Both run in CI. The Playwright suite exercises the
  real stack through nginx, so it catches things unit tests cannot - it is how
  the login redirect loop and the stale transaction list were found.

## Good first issues

Look for the `good first issue` label. If none are open and you want somewhere to
start, these are all real and self-contained:

- Remove the ~21 unused shadcn components from `web/app/components/ui/`.
- Move transaction filtering and sorting server-side; today they run over the
  current page only, so the result count is wrong.
- Replace the hand-rolled currency formatting in
  `web/app/components/ui/currency-display.tsx` with
  `Intl.NumberFormat(locale, { style: 'currency' })`, including the chart tooltips.
- Register the finance models in `api/pft/admin.py`.
- Surface envelope budgeting in the UI: `BudgetMonth` and `EnvelopeAssignment`
  with goals and carryover are fully implemented in the API.
- Add a backup/restore screen for `/api/v1/finance/backups/`.
