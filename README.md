<div align="center">

# 💰 FinTrack

**A privacy-first, self-hostable personal finance tracker.**

Track income, expenses, budgets, and financial goals on your own server —
no subscriptions, no third-party services, no vendor lock-in.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Python](https://img.shields.io/badge/Python-3.12%2B-blue.svg)](https://www.python.org/)
[![Django](https://img.shields.io/badge/Django-5.x-092e20.svg)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![GitHub stars](https://img.shields.io/github/stars/AshishKapoor/fintrack?style=social)](https://github.com/AshishKapoor/fintrack/stargazers)

[Features](#-features) •
[Quick Start](#-quick-start) •
[Configuration](#%EF%B8%8F-configuration) •
[API](#-api) •
[Contributing](#-contributing) •
[License](#-license)

<img src="https://github.com/user-attachments/assets/e66ad9e7-a967-4d5b-9139-9c327b6b466f" alt="FinTrack dashboard screenshot" width="800" />

</div>

---

## ✨ Features

- 📊 **Income & expense tracking** with custom categories and tags
- 🧱 **Double-entry ledger** with accounts, payees, transactions, and postings
- ✉️ **Envelope budgeting** — budget months, envelope assignments, and progress tracking
- 📅 **Flexible views** — browse transactions by day, week, or month
- 🔁 **Scheduled transactions and rules** for recurring activity
- 📈 **Reports** on spending, budgets, and trends
- 📦 **Import / export** your data (CSV, OFX, QIF, YNAB and more in; CSV, JSON, XLSX out) plus encrypted backup & restore from the UI
- 🔒 **100% self-hosted** — your data never leaves your server
- 👥 **Shared workspaces** — organizations with owner / admin / member / viewer roles, invitations, and a manager-visible audit log
- 🌗 **Light / dark mode** with a responsive UI for mobile and desktop
- 🔌 **API-first architecture** with OpenAPI docs, plus official [TypeScript](packages/sdk-ts) and [Python](packages/sdk-py) SDKs

## 🛠️ Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | [React 19](https://react.dev/), [Vite](https://vitejs.dev/), [TailwindCSS](https://tailwindcss.com/), [SWR](https://swr.vercel.app/), [pnpm](https://pnpm.io/) |
| Backend | [Django 5](https://www.djangoproject.com/) + [Django REST Framework](https://www.django-rest-framework.org/), JWT auth, [uv](https://docs.astral.sh/uv/) |
| Background jobs | [Celery](https://docs.celeryq.dev/) + [Redis](https://redis.io/) (imports/exports; falls back to inline without a broker) |
| Database | [PostgreSQL](https://www.postgresql.org/) |
| SDKs | [`@fintrack/sdk`](packages/sdk-ts) (TypeScript) and [`fintrack-sdk`](packages/sdk-py) (Python), generated from the OpenAPI schema |
| Infrastructure | Docker & Docker Compose, hot reload in development |

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
| [How double-entry works, for developers](docs/blog/double-entry-for-developers.md) | The mental model behind the ledger — start here |
| [ARCHITECTURE.md](ARCHITECTURE.md) | How the system fits together, and why there are two API surfaces |
| [docs/self-hosting.md](docs/self-hosting.md) | Reverse proxy, TLS, backups, upgrades, monitoring |
| [SECURITY.md](SECURITY.md) | Hardening checklist, private reporting, known limitations |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Dev setup, conventions, good first issues |
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
