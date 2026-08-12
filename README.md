# 💰 FinTrack

**A privacy-first, self-hostable personal finance tracker.** Track income and
expenses, plan budgets, and keep your financial data on a server you control — no
subscriptions, no vendor lock-in, no third-party data sharing.

Built with Django + DRF and React. MIT licensed.

> **Status: pre-1.0.** FinTrack is usable and actively worked on, but it has not
> cut a stable release yet. Read [Known limitations](#-known-limitations) and
> [SECURITY.md](SECURITY.md) before putting real data in it or exposing it to the
> internet.

## Screenshot

<img src="https://github.com/user-attachments/assets/e66ad9e7-a967-4d5b-9139-9c327b6b466f" alt="screenshot" width="800" height="600" />

---

## 🏁 Quick start

Requires Docker and Docker Compose.

```bash
git clone https://github.com/AshishKapoor/fintrack.git && cd fintrack
```

```bash
make bootstrap && docker compose up -d
```

That's it. Open **http://localhost:5173** and register your first account.

| Service | URL |
|---|---|
| Web app | http://localhost:5173 |
| API | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/api/docs/ |
| API docs (ReDoc) | http://localhost:8000/api/redoc/ |
| Health check | http://localhost:8000/healthz/ |

**There is no default admin account and no default password.** The first account
you register through the UI is yours. To create a Django admin user instead, set
`FINTRACK_ADMIN_EMAIL` and `FINTRACK_ADMIN_PASSWORD` in `.env` before the first
start, or run:

```bash
docker compose exec api uv run manage.py createsuperuser
```

To stop: `make down`. To stop and delete all data: `make clean`.

---

## 🛠️ Tech stack

| | |
|---|---|
| **Backend** | Django 5.1 + Django REST Framework, PostgreSQL 16, JWT auth (SimpleJWT), gunicorn |
| **Frontend** | React 19, Vite 6, TypeScript, TailwindCSS 4, shadcn/ui, SWR for data fetching, Zustand for UI state |
| **Tooling** | `uv` for Python, `pnpm` for JavaScript, Ruff, ESLint |
| **Infrastructure** | Docker Compose, nginx |
| **Marketing site** | Next.js 15 (`landing/`, independent of the app) |

---

## 📁 Project structure

```
fintrack/
├── api/       Django backend
│   ├── app/   Project settings, URLs, health check
│   └── pft/   The application: models, views, serializers, services, tests
├── web/       React single-page app
├── landing/   Next.js marketing site (not part of the self-host stack)
├── docs/      Self-hosting guide and feature audit artifacts
└── scripts/   Repo tooling
```

---

## ✅ What works today

- Track income and expenses, with custom categories
- Monthly budgets with progress tracking
- Dashboard with balance, income and expense cards over a selectable date range
- Transaction list with search, filtering, sorting and pagination
- Export transactions as CSV or JSON from the UI
- Import bank statements: CSV, OFX, QFX, QIF, CAMT.053 and YNAB, with a preview
  step and duplicate detection
- Rules and recurring (scheduled) transactions
- Reports: net worth, cash flow, spending trends
- Light/dark mode, responsive layout, currency symbol selection
- Multi-user: every account's data is isolated, with a
  [test suite](api/pft/tests/test_tenant_isolation.py) that proves it

**Implemented in the API but not yet exposed in the UI** — these are good places to
contribute, because the backend already works:

- Envelope budgeting with goals and carryover
- Server-side exports including XLSX
- Encrypted backup bundles

**Not built yet:** account deletion, budget alerts and notifications, real
multi-currency conversion, PWA offline mode, savings goals, investment tracking,
native mobile apps. See [ARCHITECTURE.md](ARCHITECTURE.md) for where things go.

---

## 🧑‍💻 Development

### With Docker (hot reload)

```bash
make bootstrap && make dev
```

The API reloads on change at http://localhost:8000; Postgres is exposed on 5432.

### Backend without Docker

Requires Python 3.12+, [uv](https://docs.astral.sh/uv/), and a local PostgreSQL.

```bash
cd api && cp .env.example .env && uv sync && uv run manage.py migrate && uv run manage.py runserver
```

`uv.lock` is the authoritative lockfile. Poetry is no longer used.

### Frontend without Docker

Requires Node 22+ and pnpm (via `corepack enable`).

```bash
cd web && cp .env.example .env && pnpm install && pnpm dev
```

---

## ⚙️ Configuration

All settings come from the root `.env` file, created by `make bootstrap` from
[`.env.example`](.env.example). The defaults are tuned for a local trial.

| Variable | Default | Notes |
|---|---|---|
| `SECRET_KEY` | *(generated)* | Left blank, one is generated and persisted on first boot. **Set it explicitly in production.** |
| `DEBUG` | `False` | Parsed as a real boolean |
| `DJANGO_ENV` | `production` | `development` selects the dev settings module |
| `DJANGO_ALLOWED_HOSTS` | `localhost 127.0.0.1 [::1]` | Space- or comma-separated |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Where the web UI is served from |
| `CSRF_TRUSTED_ORIGINS` | `http://localhost:5173` | |
| `SECURE_SSL` | `False` | Set `True` once TLS terminates in front of the stack |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | `fintrack` | **Change the password for any real deployment** |
| `FINTRACK_ADMIN_EMAIL` / `FINTRACK_ADMIN_PASSWORD` | *(unset)* | Both required to bootstrap an admin non-interactively |
| `VITE_UMAMI_SCRIPT_URL` / `VITE_UMAMI_WEBSITE_ID` | *(unset)* | Optional analytics. Unset means the build reports to nobody. |

Postgres is **not** published to the host by default; the port mapping in
`docker-compose.yml` is commented out deliberately.

---

## 📚 Documentation

| | |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | How the system fits together, and why there are two API surfaces |
| [docs/self-hosting.md](docs/self-hosting.md) | Reverse proxy, TLS, backups, upgrades, monitoring |
| [SECURITY.md](SECURITY.md) | Hardening checklist, reporting, known limitations |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Dev setup, conventions, good first issues |

---

## 🔒 Security

Read [SECURITY.md](SECURITY.md) and [docs/self-hosting.md](docs/self-hosting.md) before exposing an instance to the internet. It
covers the hardening checklist, how to report a vulnerability privately, and the
current known limitations.

If you ran a version of FinTrack from before this was fixed, note that a
`SECRET_KEY` was previously committed to this repository and used as the default.
Rotate your `SECRET_KEY` and delete any `admin@example.com` account.

---

## 🧪 Tests

```bash
make test-api
```

```bash
make test-api-all
```

Or directly, without Docker:

```bash
cd api && uv run ruff check . && uv run manage.py test
```

```bash
cd web && pnpm run lint && pnpm run test && pnpm run build
```

End-to-end, against a running stack:

```bash
docker compose up -d && cd web && pnpm exec playwright test
```

CI runs all of the above on every pull request, plus a full `docker compose` smoke
test that registers a user and creates a transaction.

---

## 🧩 API

Two surfaces exist today:

- **`/api/v1/*`** — the original flat model: `transactions`, `categories`,
  `budgets`, plus `register`, `me` and profile endpoints.
- **`/api/v1/finance/*`** — a double-entry ledger: `budget-files`, `accounts`,
  `category-groups`, `categories`, `payees`, `tags`, `transactions`, `postings`,
  `scheduled-transactions`, `rules`, `budget-months`, `envelope-assignments`,
  `reports`, `exports`, `imports`, `backups`.

The web app reads through the legacy shapes and writes to the finance API, via an
adapter in `web/app/client/pft/`. Consolidating the two is the largest open piece
of work — see [CONTRIBUTING.md](CONTRIBUTING.md).

Authentication is JWT: `POST /api/token/` to obtain a pair, `POST /api/token/refresh/`
to refresh.

`web/schema/pft.yaml` is generated from the backend and covers all 61 paths.
Regenerate it after changing the API surface:

```bash
docker compose exec api uv run manage.py spectacular --file /tmp/schema.yaml
```

---

## ⚠️ Known limitations

- The Django admin has no rate limiting of its own; limit it at your reverse
  proxy, or don't expose it. The API throttles login, registration and password
  changes.
- The `/api/v1/finance/*` endpoints are not paginated, so a large ledger comes
  back in one response.
- Import and export run synchronously inside the request. Payloads are capped,
  but there is no background queue.
- Tokens live in JavaScript-readable cookies, so an XSS is an account takeover.
- Currency selection changes the displayed symbol only — it does not convert.
- Transaction filtering and sorting in the UI operate on the current page.

---

## 🤝 Contributing

Issues and pull requests are welcome. [CONTRIBUTING.md](CONTRIBUTING.md) covers
setup, conventions, what CI checks, and a list of good first issues. Please also
read the [Code of Conduct](CODE_OF_CONDUCT.md).

---

## 📄 License

MIT © [Sannty](https://github.com/AshishKapoor)

## 💡 Why

FinTrack exists to give privacy-conscious people a way to manage their finances
independently — no subscription, no data sharing, no lock-in.

If you find it useful, a ⭐ helps other people find it.

[![Star History Chart](https://api.star-history.com/svg?repos=ashishkapoor/fintrack&type=Date)](https://www.star-history.com/#ashishkapoor/fintrack&Date)
