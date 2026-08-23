# FinTrack Roadmap

> **Vision:** a privacy-first, self-hosted finance tracker that people actually open every day — global from day one, owned by its community.

FinTrack already has a solid engineering core: a double-entry ledger with database-enforced invariants, envelope budgeting, seven import formats, a rules engine, shared workspaces, and encrypted backups (see [ARCHITECTURE.md](ARCHITECTURE.md)). This roadmap is about turning that core into a product people choose over the alternatives — and keep using past week three.

The phases are ordered deliberately:

1. **Phase 0** converts lookers into triers (trust, first impressions).
2. **Phase 1** converts triers into daily users (retention before acquisition).
3. **Phase 2** gives switchers from other tools a concrete reason to move.
4. **Phase 3** is where delight compounds.
5. **Phase 4** hardens everything for v1.0.

FinTrack is maintained by a solo maintainer as a side project. Phases ship serially, in small increments, and every phase ends in a tagged release with a changelog and a demo GIF. Community contributions can and do reorder reality — see [How to help](#how-to-help).

Status legend: `[ ]` planned · `[~]` in progress · `[x]` shipped

---

## Phase 0 — Trust & first impressions

*Goal: someone who finds the repo can evaluate FinTrack in under two minutes and has no reason to distrust it.*

- [~] **Live demo instance** — the read-only, seed-and-reset-hourly machinery is built (`docker-compose.demo.yml`, `pft/demo_mode.py`, `reset_demo_data_task`) and documented in [docs/demo.md](docs/demo.md); actually standing up `demo.fintrack.example` on a real host is the one step left, since that requires an account on wherever it ends up running
- [x] **README overhaul** — real screenshots (`docs/images/`), a "Why FinTrack?" section, and an honest comparison table vs. Actual Budget and Firefly III, sourced from both projects' own docs
- [x] **HttpOnly cookie auth** — the access token now lives in memory only and the refresh token is an HttpOnly cookie (`pft/auth_cookies.py`); closed the top known limitation in [SECURITY.md](SECURITY.md), fully backward compatible with the SDKs
- [x] **Throttle `/admin/login/`** — `pft/admin_throttle.py`; also fixed a bigger latent issue this surfaced: every rate limit was enforced per gunicorn worker instead of per deployment (see SECURITY.md)
- [x] **Audit log UI** — new manager-gated `/audit-log` page with filters, CSV export and an e2e spec
- [x] **Automatic job payload pruning** — a `beat` service now runs `prune_finance_jobs` daily via Celery beat
- [x] **One-click deploy templates** — a real, validated [`render.yaml`](render.yaml) (Deploy-to-Render button, $0/month by default) plus [docs/one-click-deploy.md](docs/one-click-deploy.md) covering Railway, PikaPods (submission, since it's a curated catalog), Unraid and TrueNAS SCALE
- [x] **Fix the stale feature matrix** — corrected the two stale rows (CSV import, recurring transactions) and fixed the underlying parity-checking script's own bugs; `make feature-audit` now reports zero findings instead of masking them

## Phase 1 — The daily habit loop, and going global

*Goal: logging a transaction takes under 10 seconds from anywhere, the app reaches out to you (not the other way around), and non-English speakers are first-class users.*

- [ ] **PWA + mobile quick-add** — installable app with an offline-tolerant quick-capture screen: amount → payee (autocomplete that learns payee → category) → done
- [ ] **Keyboard-first desktop entry** — inline add/edit in the transaction register, split transactions, extend the existing command palette
- [ ] **Notifications engine** — budget threshold alerts, bill/scheduled-transaction reminders, weekly digest. Channels: email, [ntfy](https://ntfy.sh), and generic webhook. (The Notifications settings tab is already scaffolded and commented out — this un-comments it.)
- [x] **Celery beat scheduler** — a new hourly `materialize_due_scheduled_transactions_task` (`pft/tasks.py`) posts every due recurring transaction automatically across all tenants, sharing its due-schedule logic with the manual `run-due` API action via `materialize_due_scheduled_transactions` (`pft/finance_services.py`). The manual trigger stays as a fallback for deployments that never run a beat process at all (e.g. the Render one-click deploy)
- [ ] **i18n infrastructure** — string extraction with react-i18next (web) and Django gettext (API), wired to Weblate for community translation. Landing *before* the string count doubles with new features.

## Phase 2 — Reasons to switch

*Goal: a YNAB, Actual, or Firefly user has a concrete, defensible reason to migrate.*

- [ ] **Bank sync: provider adapter interface** — a documented `SyncConnection` + provider plugin contract that reuses the existing import dedup (`match_key`) and rules pipeline, so synced transactions flow through the same battle-tested path as file imports
- [ ] **Bank sync: GoCardless Bank Account Data** (EU/UK, free tier) — the reference provider implementation
- [ ] **Bank sync: SimpleFIN Bridge** (US/CA) — designed as a community-contribution target against the adapter interface
- [ ] **Real multi-currency** — per-account currency, daily FX rates (ECB via frankfurter.app), converted balances and net worth. Today currency is display-only; this makes it real.
- [ ] **Migration guides** — documented, tested import paths from YNAB (already supported), Actual Budget, and Firefly III

Explicitly *not* first: Plaid. If it ever lands, it lands as another adapter, behind the privacy-friendly options.

## Phase 3 — Depth & delight

*Goal: FinTrack tells you things about your money you didn't already know.*

- [ ] **Insights dashboard** — Sankey cash-flow diagram, net worth over time, month-over-month category comparisons
- [ ] **Subscription detection** — surface recurring charges from payee recurrence heuristics and scheduled-transaction data ("you have 6 recurring charges totaling $84/mo")
- [ ] **First-class savings goals** — goals as real objects with progress tracking, not just envelope goal fields
- [ ] **Debt payoff planning** — snowball/avalanche projections and payoff timelines
- [ ] **Opt-in AI categorization** — payee → category suggestions via bring-your-own-key or a local Ollama endpoint. Off by default, privacy-framed, never required.

## Phase 4 — v1.0 hardening

*Goal: a stable API contract and a codebase with no apologies.*

- [ ] **Retire the legacy flat API** — remove the deprecated `/api/v1/{transactions,categories,budgets}` endpoints and models
- [ ] **Rename `CategoryV2` / `CategoryGroupV2`** — drop the V2 suffix from the public schema before external consumers multiply
- [ ] **Complete `BudgetFile.user` → organization migration** — finish the expand/contract already noted in the model
- [ ] **Pagination on all list endpoints** — currently only transactions paginate
- [ ] **Accessibility pass** — audit beyond Radix defaults, add axe checks to the Playwright suite
- [ ] **Activate staged security workflows** — CodeQL, gitleaks, and PR title checks currently parked in `.github/workflows-pending/`
- [ ] **Community infrastructure** — Matrix/Discord space, groomed `good-first-issue` backlog, monthly release cadence

---

## Non-goals

Keeping these explicit keeps issue triage sane:

- **Native mobile apps** — the PWA is the mobile story. No Swift/Kotlin codebases.
- **Hosted SaaS** — FinTrack is self-hosted software. (Migrations `0002`/`0003` contain the fossil record of a briefly-explored SaaS direction; it stays dead.)
- **Plaid-first bank sync** — privacy-aligned providers (GoCardless, SimpleFIN) come first.
- **Investment portfolio tracking** — use Ghostfolio; FinTrack tracks cash flow, budgets, and net worth.

## How to help

Contributions that map to this roadmap are especially welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

| If you are a… | High-impact places to start |
|---|---|
| Translator | Phase 1 i18n — once Weblate is live, translations are the fastest path to contributor status |
| Frontend dev | Quick-add PWA screen, insights charts, keyboard-first register entry |
| Backend dev | Notification channels (ntfy/webhook), a bank sync provider against the adapter interface (SimpleFIN wanted!) |
| Self-hosting enthusiast | Get FinTrack listed on [PikaPods](https://feedback.pikapods.com/) (upvote or help submit), stand up the actual public demo host, docs for reverse-proxy setups |
| Designer | A demo GIF for the README, insights dashboard concepts |
| Anyone | Try the demo, file honest bug reports, tell us where week-three fatigue sets in |

## Changelog of this document

- **2026-08-23** — initial roadmap
- **2026-08-23** — Phase 0 substantially shipped: HttpOnly cookie auth, admin
  login throttling (plus a cross-worker rate-limit fix it surfaced), the
  audit log UI, daily job pruning via Celery beat, demo-mode infrastructure,
  a working Render one-click deploy, and the README/feature-matrix overhaul.
  Only actually hosting the public demo instance remains open.
- **2026-08-23** — Phase 1 underway: scheduled transactions now materialize
  automatically via an hourly Celery beat task instead of requiring the
  manual "Run Due" trigger, which remains available for deployments that
  don't run a beat process (e.g. Render).
