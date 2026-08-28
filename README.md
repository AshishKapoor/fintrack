<div align="center">

# 💰 FinTrack

**A privacy-first, self-hostable personal finance tracker.**

Track income, expenses, budgets, and financial goals on your own server —
no subscriptions, no third-party services, no vendor lock-in.

[![CI](https://github.com/AshishKapoor/fintrack/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/AshishKapoor/fintrack/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Python](https://img.shields.io/badge/Python-3.12%2B-blue.svg)](https://www.python.org/)
[![Django](https://img.shields.io/badge/Django-6.x-092e20.svg)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![GitHub stars](https://img.shields.io/github/stars/AshishKapoor/fintrack?style=social)](https://github.com/AshishKapoor/fintrack/stargazers)

[Why FinTrack?](#-why-fintrack) •
[Features](#-features) •
[Quick Start](#-quick-start) •
[Configuration](#%EF%B8%8F-configuration) •
[API](#-api) •
[Contributing](#-contributing) •
[License](#-license)

<img src="docs/images/dashboard.png" alt="FinTrack dashboard screenshot" width="800" />

</div>

---

## 🤔 Why FinTrack?

Most self-hosted finance trackers make you pick one: envelope budgeting *or*
correctness, a nice UI *or* a real API, single-user simplicity *or* sharing
with your household. FinTrack doesn't:

- **A ledger you can trust.** Every transaction is a set of postings that the
  database itself refuses to save unless they sum to zero — not just
  application-level validation. See [how double-entry works here](docs/blog/double-entry-for-developers.md).
- **Shared workspaces without duct tape.** Owner/admin/member/viewer roles,
  invitations, and a manager-visible audit log are built in — no external
  identity provider to stand up first.
- **API-first, for real.** The OpenAPI schema is the contract CI enforces, and
  it drives official [TypeScript](packages/sdk-ts) and [Python](packages/sdk-py)
  SDKs published from this repo, not community-maintained afterthoughts.
- **Your data stays yours.** Client-side encrypted backups, no telemetry by
  default, MIT licensed.

### How it compares

Every open-source finance tracker is trading off *something*. Here's the
honest comparison, not the flattering one:

| | FinTrack | [Actual Budget](https://actualbudget.org/) | [Firefly III](https://www.firefly-iii.org/) |
| --- | --- | --- | --- |
| License | MIT | MIT | AGPL-3.0 |
| Ledger model | Double-entry, DB-enforced | Envelope budgeting (not double-entry) | Double-entry |
| Shared budgets | Owner/admin/member/viewer roles, built in | Basic/Admin roles, but needs an external OIDC provider configured first | Multiple isolated single-user accounts per server — not a shared budget |
| Bank sync | Built in: GoCardless (EU/UK, free tier), SimpleFIN (US/CA) | Built in: GoCardless, SimpleFIN (paid), Akahu, Enable Banking, Pluggy | Via a companion Data Importer: GoCardless, SimpleFIN, Enable Banking |
| Import formats | CSV, OFX, QFX, QIF, CAMT.053, YNAB4, nYNAB, Firefly III, Actual Budget ([migration guides](docs/migrating.md)) | CSV + bank sync above | CSV, CAMT.052/053 + the Data Importer |
| Multi-currency | Per-account currency, daily ECB reference rates fetched automatically, converted balances and net worth | Per-account currency | Per-account currency |
| REST API | OpenAPI schema + official TS/Python SDKs | None (Node.js-only scripting library, no HTTP API) | OpenAPI schema, community-maintained SDKs |
| Audit log | Yes, manager-visible per workspace | No | No |
| Tech stack | Django + React | Node.js/TypeScript + React | PHP/Laravel |

Bank sync used to be FinTrack's clearest gap; as of [Phase 2](ROADMAP.md) it
isn't anymore, and it's built the way the rest of FinTrack is — privacy-aligned
providers first, no Plaid. If you value ledger correctness, real shared
workspaces, and an automatic exchange rate that actually updates, FinTrack is
worth trying.

## ✨ Features

- 📊 **Income & expense tracking** with custom categories and tags
- 🧱 **Double-entry ledger** with accounts, payees, transactions, and postings — including split transactions across multiple categories
- ✉️ **Envelope budgeting** — budget months, envelope assignments, and progress tracking
- 📅 **Flexible views** — browse transactions by day, week, or month
- ⌨️ **Keyboard-first entry** — an always-on inline row in the transaction register for add and edit, plus a command palette (`⌘K`)
- 📲 **Installable PWA with a mobile quick-add screen** — amount → payee → done, with a payee → category autocomplete that learns from your history, and offline-tolerant saves that sync once you're back online
- 🔔 **Notifications** — budget threshold alerts, bill/scheduled-transaction reminders, and a weekly digest over email, [ntfy](https://ntfy.sh), or a generic webhook
- 🔁 **Scheduled transactions and rules** for recurring activity
- 📈 **Reports** on spending, budgets, and trends
- 📦 **Import / export** your data (CSV, OFX, QIF, YNAB, Firefly III, Actual Budget and more in — see [migration guides](docs/migrating.md); CSV, JSON, XLSX out) plus encrypted backup & restore from the UI
- 🏦 **Bank sync** — GoCardless (EU/UK, free tier) and SimpleFIN (US/CA), synced transactions flowing through the same dedup and rules as file imports
- 💱 **Real multi-currency** — per-account currency, daily ECB reference rates, balances and net worth converted automatically
- 🔒 **100% self-hosted** — your data never leaves your server
- 👥 **Shared workspaces** — organizations with owner / admin / member / viewer roles, invitations, and a manager-visible audit log
- 🌗 **Light / dark mode** with a responsive UI for mobile and desktop
- 🌍 **Multi-language** — English and Spanish today, with a [translation pipeline](docs/i18n.md) contributors can extend
- 🔌 **API-first architecture** with OpenAPI docs, plus official [TypeScript](packages/sdk-ts) and [Python](packages/sdk-py) SDKs

## 🛠️ Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | [React 19](https://react.dev/), [Vite](https://vitejs.dev/), [TailwindCSS](https://tailwindcss.com/), [SWR](https://swr.vercel.app/), [pnpm](https://pnpm.io/) |
| Backend | [Django 6](https://www.djangoproject.com/) + [Django REST Framework](https://www.django-rest-framework.org/), JWT auth, [uv](https://docs.astral.sh/uv/) |
| Background jobs | [Celery](https://docs.celeryq.dev/) + [Redis](https://redis.io/) (imports/exports; falls back to inline without a broker) |
| Database | [PostgreSQL](https://www.postgresql.org/) |
| SDKs | [`@fintrack/sdk`](packages/sdk-ts) (TypeScript) and [`fintrack-sdk`](packages/sdk-py) (Python), generated from the OpenAPI schema |
| Infrastructure | Docker & Docker Compose, hot reload in development |

## 📸 Screenshots

<table>
<tr>
<td width="50%"><img src="docs/images/transactions.png" alt="Transactions list" /><p align="center">Transactions</p></td>
<td width="50%"><img src="docs/images/budgets.png" alt="Envelope budgets" /><p align="center">Envelope budgets</p></td>
</tr>
<tr>
<td width="50%"><img src="docs/images/reports.png" alt="Reports" /><p align="center">Reports</p></td>
<td width="50%"><img src="docs/images/dashboard.png" alt="Dashboard" /><p align="center">Dashboard</p></td>
</tr>
</table>

## 🚀 Quick Start

The fastest way to run FinTrack is with Docker:

```bash
git clone https://github.com/AshishKapoor/fintrack.git
cd fintrack
./setup.sh start
```

That's it. The script creates the `.env` files from their examples, builds the
images, and starts every service. Once it finishes, open:

| Service | URL |
| --- | --- |
| Web app | http://localhost:5173 |
| API | http://localhost:8000 |
| API docs (Swagger UI) | http://localhost:8000/api/docs/ |
| API docs (ReDoc) | http://localhost:8000/api/redoc/ |

Prefer not to build? Run the published images instead:

```bash
FINTRACK_VERSION=latest \
  docker compose -f docker-compose.yml -f docker-compose.images.yml up -d
```

Pin `FINTRACK_VERSION` to a [released tag](https://github.com/AshishKapoor/fintrack/releases)
for anything you care about — `latest` moves on every release, so an
unattended pull can apply a major version and its migrations without you
choosing to. Images carry build provenance you can check before running them;
see [RELEASING.md](RELEASING.md).

There is no default account. To get started:

1. Open http://localhost:5173/register
2. Create your account with an email and password
3. Log in with those credentials

The first account you create is yours — there are no pre-seeded users.
For a Django admin (superuser) account, see
[docs/self-hosting.md](docs/self-hosting.md#creating-your-account).

Other lifecycle commands:

```bash
./setup.sh stop     # Stop all services (data is kept)
./setup.sh clean    # Stop and delete containers, volumes, and data
```

Equivalent `make` targets (`make up`, `make down`, `make logs`, `make clean`)
are also available.

> ⚠️ The default configuration is tuned for a quick local trial. Before
> exposing an instance to the internet, read [SECURITY.md](SECURITY.md).

### Prefer not to run your own server?

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/AshishKapoor/fintrack)

Deploys the whole stack — web, API, Postgres, Redis — on Render's free tier.
See [docs/one-click-deploy.md](docs/one-click-deploy.md) for this and other
hosting targets (Railway, PikaPods, Unraid, TrueNAS SCALE).

## 🧑‍💻 Local Development

Prefer running the services directly? You'll need:

- [Python](https://www.python.org/) >= 3.12 and [uv](https://docs.astral.sh/uv/)
- [Node.js](https://nodejs.org/) >= 18 and [pnpm](https://pnpm.io/)
- A running [PostgreSQL](https://www.postgresql.org/) instance

**Backend**

```bash
cd apps/api
cp .env.example .env          # then adjust values as needed
uv sync                       # install dependencies
uv run manage.py migrate      # apply database migrations
uv run manage.py runserver    # start the dev server on :8000
```

**Frontend**

```bash
cd apps/web
cp .env.example .env
pnpm install
pnpm dev                      # start the dev server on :5173
```

See [`apps/api/README.md`](apps/api/README.md) and [`apps/web/README.md`](apps/web/README.md) for
more details on each service.

## 📁 Project structure

```
fintrack/
├── apps/
│   ├── api/            # Django backend (DRF, JWT auth, OpenAPI schema)
│   │   ├── app/        # Django project settings
│   │   └── pft/        # Main Django app (finance domain)
│   ├── web/            # React frontend (Vite, TailwindCSS, SWR)
│   │   ├── app/        # Application source (client/gen/ is the orval client)
│   │   ├── e2e/        # Playwright end-to-end suite
│   │   └── schema/     # OpenAPI schema (pft.yaml), kept in sync by CI
│   └── landing/        # Next.js marketing site (not part of the self-hosted stack)
├── packages/
│   ├── sdk-ts/         # @fintrack/sdk — TypeScript client (npm)
│   └── sdk-py/         # fintrack-sdk — Python client (PyPI)
├── docs/               # Self-hosting guide, ADRs, blog, feature audits
├── scripts/            # Maintenance and audit scripts
├── docker-compose.yml
├── setup.sh            # One-command setup for self-hosting
└── Makefile            # Common development tasks
```

## ⚙️ Configuration

Both services are configured through `.env` files created from the checked-in
examples (`apps/api/.env.example`, `apps/web/.env.example`).

**Backend (`apps/api/.env`)**

```env
DEBUG=True
SECRET_KEY=your_secure_secret_key
DATABASE_URL=postgres://user:password@localhost:5432/fintrack
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

**Frontend (`apps/web/.env`)**

```env
VITE_BASE_DOMAIN=http://localhost:8000
```

## 🧪 Testing

```bash
make test-api        # API smoke tests
make test-api-all    # full API test suite
```

Frontend units and end-to-end tests:

```bash
cd apps/web && pnpm run test              # vitest units
```

```bash
docker compose up -d && cd apps/web && pnpm exec playwright test   # e2e against the real stack
```

The end-to-end suite includes `e2e/accessibility.spec.ts`, which runs axe over
every page and both modal surfaces; it fails the build on a new violation. All of
the above runs in CI, along with diff gates that fail if the committed schema,
the web client, or either SDK drifts from the backend.

Missing `.env` files are created automatically (via `./setup.sh configure`)
before any Docker-based target runs — no separate bootstrap step is needed.

## 📤 API

FinTrack is API-first. Interactive documentation is served by the backend at
[/api/docs/](http://localhost:8000/api/docs/) (Swagger UI) and
[/api/redoc/](http://localhost:8000/api/redoc/) (ReDoc).

- `/api/v1/*` — auth, profile, workspaces (`orgs`), and the manager-only `audit-log`
- `/api/v1/finance/*` — the finance domain:
  - `budget-files`, `accounts`, `category-groups`, `categories`, `payees`, `tags`
  - `transactions`, `postings`, `scheduled-transactions`, `rules`
  - `budget-months`, `envelope-assignments`, `reports`
  - `exports`, `imports`, `backups`

Every list endpoint is paginated and returns the envelope
`{count, next, previous, results}` — never a bare array. Default page size is
50; `?page_size=` raises it to at most 500, and a client that wants everything
follows `next` until it is null.

The flat `/api/v1/{transactions,categories,budgets}` endpoints that once sat
alongside the ledger were retired in v1.0. Migration `0017` carries their rows
into the ledger, so nothing recorded through them is lost — see
[CHANGELOG.md](CHANGELOG.md) for the upgrade notes.

### Official SDKs

```bash
npm install @fintrack/sdk        # TypeScript — plain fetch, zero runtime deps
```

```bash
pip install fintrack-sdk         # Python — sync + asyncio variants per operation
```

Both are generated from the committed OpenAPI schema
([`apps/web/schema/pft.yaml`](apps/web/schema/pft.yaml)), which CI keeps in
lockstep with the backend. See [packages/sdk-ts](packages/sdk-ts) and
[packages/sdk-py](packages/sdk-py) for usage.

## 🗺️ Roadmap

The budgeting-core feature audit and prioritized roadmap live in
[`docs/feature-audit/`](docs/feature-audit/README.md). To validate the audit
artifacts and regenerate the parity report:

```bash
make feature-audit
```

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Please read the
[contributing guide](CONTRIBUTING.md) to get started, and check the
[open issues](https://github.com/AshishKapoor/fintrack/issues) for ideas.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push the branch (`git push origin feature/amazing-feature`)
5. Open a pull request

## 📚 Documentation

| | |
|---|---|
| [ROADMAP.md](ROADMAP.md) | Where FinTrack is headed, phase by phase, and how to help |
| [How double-entry works, for developers](docs/blog/double-entry-for-developers.md) | The mental model behind the ledger — start here |
| [ARCHITECTURE.md](ARCHITECTURE.md) | How the system fits together, and the reasoning behind the ledger |
| [docs/self-hosting.md](docs/self-hosting.md) | Reverse proxy, TLS, backups, upgrades, monitoring |
| [docs/one-click-deploy.md](docs/one-click-deploy.md) | Render, Railway, PikaPods, Unraid, TrueNAS SCALE |
| [docs/demo.md](docs/demo.md) | Running a public, read-only demo instance |
| [SECURITY.md](SECURITY.md) | Hardening checklist, private reporting, known limitations |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Dev setup, conventions, good first issues |
| [SUPPORT.md](SUPPORT.md) | Where to ask what — Discussions, issues, security reports |
| [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) | Attribution for code vendored into this repo |
| [CHANGELOG.md](CHANGELOG.md) | What changed per release, and what an upgrade needs |
| [RELEASING.md](RELEASING.md) | The monthly release cadence and its checklist |
| [docs/adr/](docs/adr/) | Architecture decision records, including [licensing](docs/adr/0001-licensing.md) |

---

## 🔒 Security

FinTrack stores personal financial data — please report vulnerabilities
privately via
[GitHub security advisories](https://github.com/AshishKapoor/fintrack/security/advisories/new)
rather than public issues. See [SECURITY.md](SECURITY.md) for the full policy
and a hardening checklist for internet-facing deployments.

## 📄 License

Distributed under the [MIT License](LICENSE). © 2025 [Ashish Kapoor](https://github.com/AshishKapoor).

## 🙌 Support

If you find FinTrack useful, consider giving it a ⭐ on GitHub or sharing it
with others — it helps the project grow!

[![Star History Chart](https://api.star-history.com/svg?repos=ashishkapoor/fintrack&type=Date)](https://www.star-history.com/#ashishkapoor/fintrack&Date)
