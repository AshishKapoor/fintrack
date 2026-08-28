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

- [x] **PWA + mobile quick-add** — a new `/quick-add` screen (sidebar, command palette, and manifest shortcut for one-tap access once installed): amount → payee (autocomplete that learns payee → category via `PayeeViewSet.suggested_category`) → done. Saves through the existing generated client, so it's offline-tolerant for free via `httpPFTClient`'s mutation queue. An `InstallPrompt` surfaces the browser's native "Add to Home Screen" flow instead of leaving it undiscoverable behind a menu.
- [x] **Keyboard-first desktop entry** — an always-on inline row at the top of the transaction register for add, reused for in-place edit (`InlineTransactionRow`); Enter/Delete work on a focused row. Split transactions (`SplitPostingsEditor`, `lib/ledger.ts`'s `buildSplitPostings`) in both the register and the Add/Edit dialogs — the backend already accepted any number of balanced postings, this was purely a frontend gap. The command palette gained quick actions (Add transaction, Quick Add) and the navigation entries it was missing (Reports, Rules, Audit Log).
- [x] **Notifications engine** — `NotificationPreference`/`NotificationLog` (`pft/notifications.py`), three daily/weekly Celery beat sweeps, email/[ntfy](https://ntfy.sh)/webhook channels (all off by default, an SSRF guard on the latter two), dedup via a DB-constrained log so a sweep can safely re-run from scratch every time. The previously-scaffolded Notifications settings tab and top-bar bell are now wired up, with a send-test-now action.
- [x] **Celery beat scheduler** — a new hourly `materialize_due_scheduled_transactions_task` (`pft/tasks.py`) posts every due recurring transaction automatically across all tenants, sharing its due-schedule logic with the manual `run-due` API action via `materialize_due_scheduled_transactions` (`pft/finance_services.py`). The manual trigger stays as a fallback for deployments that never run a beat process at all (e.g. the Render one-click deploy)
- [~] **i18n infrastructure** — react-i18next (web) and Django gettext (API) are wired end to end, with string-extraction tooling (`pnpm i18n:extract`, `manage.py makemessages`) and English + Spanish catalogs covering navigation, auth, settings, and every other Phase 1 feature above, built translation-ready from the start (see [docs/i18n.md](docs/i18n.md)). Actually connecting a Weblate project is the one step left, since — like the Phase 0 demo instance — that needs an account only the maintainer can create.

## Phase 2 — Reasons to switch

*Goal: a YNAB, Actual, or Firefly user has a concrete, defensible reason to migrate.*

- [x] **Bank sync: provider adapter interface** — a documented `SyncConnection` + provider plugin contract (`pft/bank_sync.py`'s `BankSyncProvider`) that reuses the existing import dedup (`match_key`) and rules pipeline, so synced transactions flow through the same battle-tested path as file imports
- [x] **Bank sync: GoCardless Bank Account Data** (EU/UK, free tier) — the reference provider implementation
- [x] **Bank sync: SimpleFIN Bridge** (US/CA) — implemented alongside GoCardless as the second reference provider against the adapter interface, rather than left purely as a community target
- [x] **Real multi-currency** — per-account currency, daily FX rates (ECB via frankfurter.app), converted balances and net worth. Today currency is display-only; this makes it real.
- [x] **Migration guides** — documented, tested import paths from YNAB (already supported), Actual Budget, and Firefly III

Explicitly *not* first: Plaid. If it ever lands, it lands as another adapter, behind the privacy-friendly options.

## Phase 3 — Depth & delight

*Goal: FinTrack tells you things about your money you didn't already know.*

- [x] **Insights dashboard** — Sankey cash-flow diagram, net worth over time, month-over-month category comparisons
- [x] **Subscription detection** — surface recurring charges from payee recurrence heuristics and scheduled-transaction data ("you have 6 recurring charges totaling $84/mo")
- [x] **First-class savings goals** — goals as real objects with progress tracking, not just envelope goal fields
- [x] **Debt payoff planning** — snowball/avalanche projections and payoff timelines
- [x] **Opt-in AI categorization** — payee → category suggestions via bring-your-own-key or a local Ollama endpoint. Off by default, privacy-framed, never required.

## Phase 4 — v1.0 hardening

*Goal: a stable API contract and a codebase with no apologies.*

- [x] **Retire the legacy flat API** — the deprecated `/api/v1/{transactions,categories,budgets}` endpoints and their models are gone. Migration `0017` carries any rows they still held into the ledger first (stamped `match_key="legacy:<pk>"`, and checking `0005`'s `v1-<pk>` stamp too so nothing is carried twice), so nobody scripting against them loses data on upgrade
- [x] **Rename `CategoryV2` / `CategoryGroupV2`** — `RenameModel` in `0018`, so the tables are renamed in place rather than copied. Old `AuditLog.entity_type` rows are rewritten to match, so filtering the audit log by `Category` still finds pre-rename history
- [x] **Complete `BudgetFile.user` → organization migration** — `organization` is now NOT NULL and `user` is gone (`0019`–`0021`). The default-file choice moved to `Membership.default_budget_file`, which fixes one member's `set-default` moving everyone else's in a shared workspace; `created_by` is `SET_NULL`, which fixes a departing user cascading away a shared workspace's books
- [x] **Pagination on all list endpoints** — set as `DEFAULT_PAGINATION_CLASS` rather than per-viewset, so a new resource cannot ship unpaginated by omission, and `test_pagination.py` fails when the router gains a resource nobody added to its list. The web app walks `next` wherever completeness matters — pickers, the workspace switcher, and the encrypted backup, where a silent truncation would restore cleanly and be missing most of the ledger
- [x] **Accessibility pass** — `apps/web/e2e/accessibility.spec.ts` runs axe over every page and both modal surfaces at WCAG 2.1 A/AA, inside the normal Playwright job. It found an unnamed export button, 20 labels associated with nothing, a settings label pointing at an id that did not exist, and a `Tabs` used as a segmented control whose triggers advertised panels that were never rendered
- [x] **Activate staged security workflows** — CodeQL (with the generated clients excluded, since findings there can only be fixed in the generator), gitleaks over the full history against a shared `.gitleaks.toml`, and Conventional-Commit PR titles
- [~] **Community infrastructure** — issue forms that ask a self-hosted bug report for its deployment method and logs, [SUPPORT.md](SUPPORT.md), a [CHANGELOG.md](CHANGELOG.md), and a documented monthly cadence in [RELEASING.md](RELEASING.md). The `good first issue` backlog is groomed against the code. A Matrix/Discord space is the one step left, since — like the Phase 0 demo instance and the Phase 1 Weblate project — it needs an account only the maintainer can create

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
| Translator | The i18n pipeline is live (see [docs/i18n.md](docs/i18n.md)) — once Weblate is connected, translating is the fastest path to contributor status; until then, PRs extending `t()`/`gettext_lazy` coverage to a page not yet listed there are just as welcome |
| Frontend dev | Extend i18n coverage page by page — the new `/insights` page's own strings included |
| Backend dev | A third bank sync provider against the adapter interface (`pft/bank_sync.py`) — the contract and two reference implementations are already there |
| Self-hosting enthusiast | Get FinTrack listed on [PikaPods](https://feedback.pikapods.com/) (upvote or help submit), stand up the actual public demo host, docs for reverse-proxy setups |
| Designer | A demo GIF for the README, insights dashboard concepts |
| Accessibility | axe covers every page now, but it catches maybe a third of WCAG failures — a screen-reader or keyboard-only pass over a real workflow would find what it cannot |
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
- **2026-08-24** — i18n infrastructure landed: react-i18next + Django gettext,
  English/Spanish seed catalogs, extraction tooling, and docs/i18n.md. Also
  fixed a CORS gap (`X-Use-Refresh-Cookie` wasn't in `CORS_ALLOW_HEADERS`)
  that broke login for any deployment serving the web app and API from
  different origins, found while testing this against a non-Docker `pnpm dev`
  setup.
- **2026-08-24** — Phase 1 complete except for actually connecting Weblate
  (see above): the notifications engine (email/ntfy/webhook, budget alerts,
  reminders, a weekly digest), keyboard-first desktop entry (inline
  add/edit, split transactions, a fuller command palette), and the PWA quick
  add screen with payee→category learning all shipped, each with backend
  tests and a Playwright e2e spec. Along the way: `LedgerTransaction` gained
  a `payee_name` read field (mirroring how postings already expose
  `account_name`/`category_name`), `PayeeViewSet` gained a
  `suggested-category` action, and the transactions page's old full-page
  empty state was replaced with an always-visible register (inline add row
  included) plus an in-table empty message — a brand-new account is exactly
  when the fast entry point matters most, so it cannot hide behind an empty
  state.
- **2026-08-24** — Phase 2 shipped in full. Bank sync: a provider adapter
  interface (`pft/bank_sync.py`) that reuses the existing import dedup
  (`match_key`, keyed off each provider's own transaction id rather than a
  content hash - two genuinely separate same-day, same-amount transactions
  must both survive) and rules pipeline, with GoCardless Bank Account Data
  (EU/UK) and SimpleFIN Bridge (US/CA) both shipped as reference providers
  rather than leaving the second as a pure community target. Real
  multi-currency: every account now has its own currency, daily ECB rates via
  frankfurter.app, and `account_balances`/`compute_net_worth` actually
  convert instead of silently summing mismatched currencies as if they were
  the same - a missing rate shows as unavailable, never a wrong number.
  Migration guides: `docs/migrating.md`, plus real Firefly III and Actual
  Budget importers (not just generic-CSV advice) tested against fixtures
  matching each tool's actual export shape. New on the frontend: an Accounts
  page (list/create/edit/archive/delete, per-account currency, native +
  converted balances) and a bank sync connect flow (provider picker,
  GoCardless's bank-redirect handoff via a new `/bank-sync/callback` route,
  SimpleFIN's setup-token paste, mapping discovered accounts to new-or-existing
  local ones) — accounts had no dedicated management UI at all before this.
  Security: bank sync credentials are encrypted at rest
  (`FINTRACK_SYNC_ENCRYPTION_KEY`, `pft/crypto.py`), every outbound call
  (GoCardless, a SimpleFIN URL derived from user input, frankfurter.app) goes
  through the same SSRF guard notifications already used for ntfy/webhooks,
  and both get their own throttle scope. Fixed along the way: a real bug in
  `httpPFTClient`'s 400-error toast that assumed every DRF error body was
  `{field: [messages]}` and silently showed just the first character of any
  `{"detail": "a string"}` response, which several of this phase's own new
  actions return.
- **2026-08-24** — Phase 3's Insights dashboard shipped: a new `/insights`
  page with three panels. Net worth over time (`compute_net_worth_series`)
  walks the whole posting history in one pass rather than recomputing the
  existing point-in-time `compute_net_worth` once per month, converting each
  point at *its own* date - `fx_rates.convert_amount` does genuine
  nearest-on-or-before lookback, so a shared or omitted `as_of` would have
  silently priced months-old balances at today's rate. Month-over-month
  category comparison needed no backend change at all - `compute_spending_trends`
  already returned exactly this shape. The cash flow Sankey
  (`compute_cash_flow_sankey`) uses a single-hub topology with a
  "Savings"/"From savings" gap node absorbing the surplus or deficit, so the
  hub always stays flow-balanced; an initial two-hub design would have left
  it unbalanced in any deficit month. `LedgerTransaction.transaction_date`
  gained a database index, and `SavedReport.report_type` grew room for the
  two new types alongside the existing net_worth/cash_flow/spending/custom
  ones. Found and fixed live in the browser rather than by inspection alone:
  `ChartLegendContent`'s label lookup has no fallback to the real series name
  the way `ChartTooltipContent`'s does, so the category chart's legend
  rendered colored swatches with no text until given its own lookup-free
  legend; and recharts' Sankey checks `trigger === 'hover'` on the *raw*
  child element's props before React merges in `Tooltip`'s defaultProps, so
  its hover tooltip needs that prop set explicitly - and even set correctly,
  it never activated in this app's recharts 2.15.2 + React 19 combination
  (confirmed live, pointer position verified via `elementFromPoint`), so
  Sankey node labels carry their amount directly instead of relying on it.
- **2026-08-25** — Phase 3's remaining four items shipped: subscription
  detection, first-class savings goals, debt payoff planning, and opt-in AI
  categorization. Subscription detection (`compute_subscriptions`) scores
  each payee's transaction history on two independent axes - cadence fit
  (weekly/biweekly/monthly/quarterly/yearly, each with its own tolerance
  window) and amount fit - and only calls something a subscription when both
  clear a 0.7 confidence threshold with at least 3 occurrences, so a payee
  that's merely frequent but irregular (a coffee shop) doesn't get flagged.
  Savings goals (`SavingsGoal`) are account-anchored and compute progress
  live from the account's current balance rather than caching it, so there's
  nothing to invalidate when a backdated transaction changes history. Debt
  payoff planning (`compute_debt_payoff_projection`) simulates snowball and
  avalanche payoff month-by-month, targeting one debt at a time with its
  minimum plus every already-paid-off debt's freed-up minimum plus any extra
  payment; unlike its sibling report functions it deliberately *does* convert
  each debt to the home currency (via `fx_rates.convert_amount`, priced as of
  today) since debts must be summed and compared across currencies to pick a
  target, whereas the other reports leave amounts unconverted by existing
  precedent. AI categorization (`ai_categorization.py`) suggests a category
  for a payee with no transaction history yet via an LLM the user configures
  - OpenAI-compatible (bring your own key, encrypted at rest the same way
  bank-sync credentials are) or a local Ollama endpoint - and only as a
  fallback when there's no history-based suggestion, which always wins when
  one exists. It never trusts a hallucinated category name (the response
  must exactly match a real candidate, case-insensitively) and never raises
  into the request path on a bad or unreachable provider. Ollama's use of
  `localhost`/private addresses needed its own SSRF guard
  (`is_safe_local_service_url`, a sibling of the existing
  `is_safe_outbound_url`, not a parameter on it, to keep zero regression risk
  to ntfy/webhook/bank-sync/fx-rate callers) that still blocks link-local
  addresses - the class that covers cloud metadata endpoints - even though it
  allows private and loopback ranges. Found and fixed along the way: an
  early debt-payoff test wrongly assumed `payoff_order[0]` meant "the
  strategy-targeted debt" when it actually means "the first debt paid off
  chronologically"; a `ChoiceField` used for the suggested-category
  response's `source` field collided with another schema component under
  orval ("Duplicate schema names detected: 2x SuggestedCategorySource"),
  fixed by switching to a plain `CharField` since the field is response-only;
  and a Django migration created via `docker compose run` (ephemeral)
  doesn't apply itself to the long-running dev database the way `manage.py
  test`'s throwaway database does, which briefly looked like a missing-table
  bug for the first of these features until `docker compose exec ... migrate`
  was run separately.
- **2026-08-27** — Phase 4 complete except for a chat space (see above), which
  needs an account only the maintainer can create. The API contract stops
  moving here, so the breaking changes are deliberately concentrated in one
  release: the flat `/api/v1/{transactions,categories,budgets}` resources are
  retired, `CategoryV2`/`CategoryGroupV2` lose their suffix, `BudgetFile.user`
  gives way to `organization`, and every list endpoint now returns
  `{count, next, previous, results}` - see CHANGELOG.md for what an upgrade
  needs. None of the four destroys data: migration `0017` carries the flat rows
  into the ledger, `0018` renames tables in place rather than copying, and
  `0019`-`0021` backfill before contracting. Three real bugs fell out of the
  `BudgetFile` work rather than being looked for - `set-default` moved every
  member's default rather than the caller's, an envelope assignment could not
  be written by anyone but the file's creator, and deleting a user cascaded
  away a shared workspace's books. The two that would have hurt most on upgrade
  came from reading old migrations rather than from the test suite: `0005` had
  already carried the pre-ledger flat rows across, so `0017` would have
  duplicated every one of them, and Postgres refuses DDL on a table with
  pending deferred trigger events, so the `BudgetFile` contract cannot be one
  migration - a fresh test database has no rows, and therefore neither failure
  can appear in CI. Also here: axe over every page and both modal surfaces,
  which found an icon-only button with no name, twenty labels associated with
  nothing, and a `Tabs` used as a segmented control that was telling screen
  readers about panels that did not exist; CodeQL, gitleaks and PR-title checks
  activated; and SUPPORT.md, RELEASING.md and CHANGELOG.md, so the monthly
  cadence is something a self-hoster can rely on rather than a plan.
