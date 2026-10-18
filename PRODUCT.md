# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

The installable PWA is the whole mobile story. Native iOS/Android apps are an explicit non-goal (ROADMAP.md).

## Users

Three audiences are weighted equally. No single one wins trade-offs by default:

- **Self-hosting individuals:** technically comfortable people who run FinTrack on their own server or homelab and track their own money daily.
- **Households and couples:** two or more people budgeting together in one shared workspace with owner/admin/member/viewer roles.
- **Switchers:** people already budgeting in YNAB, Actual Budget or Firefly III who are deciding whether to move. For them, migration paths and honest parity matter most.

Secondary audiences: contributors (translators, frontend/backend developers, accessibility testers) and evaluators who find the repo and decide within minutes whether to trust it.

## Product Purpose

FinTrack is a privacy-first, self-hostable personal finance tracker. It covers income and expenses, envelope budgeting, goals, debt payoff and net worth on the user's own server. There are no subscriptions, no third-party services required and no vendor lock-in.

The roadmap vision is a finance tracker "people actually open every day". Success is defined in this order:

1. Lookers become triers: trust and first impressions.
2. Triers become daily users: retention past week three.
3. Users of other tools have a concrete reason to switch.

## Positioning

FinTrack declines the trade-offs other open-source trackers force:

- **A ledger you can trust.** The ledger is double-entry, and the database refuses to save postings that don't sum to zero. Validation isn't left to the application alone.
- **Shared workspaces without an external identity provider.** Roles, invitations and a manager-visible audit log are built in.
- **Genuinely API-first.** The OpenAPI schema is a contract that CI enforces. Official TypeScript and Python SDKs are published from the same repo.
- **Privacy-aligned bank sync.** GoCardless and SimpleFIN come first. Plaid is explicitly not first.
- **Your data stays yours.** Backups are encrypted client-side, there's no telemetry by default and the license is MIT.

## Operating Context

- Self-hosted via Docker Compose (`./setup.sh start`), published images, or one-click deploys: Render, Railway, PikaPods, Unraid, TrueNAS SCALE.
- Daily use splits into two contexts:
  - **Desktop:** keyboard-first transaction entry, with an inline register row and a ⌘K command palette.
  - **Mobile:** the `/quick-add` PWA screen (amount → payee → done), designed for under 10 seconds per entry and tolerant of being offline.
- Data comes in from file imports (CSV, OFX, QFX, QIF, CAMT.053, YNAB4, nYNAB, Firefly III, Actual Budget) and bank sync. Data goes out as CSV, JSON or XLSX, plus encrypted backups.
- The app reaches out to the user through budget alerts, bill reminders and a weekly digest over email, ntfy or webhook. All channels are off by default.
- Two web surfaces:
  - **The self-hosted app** (`apps/web`): React and Vite.
  - **The marketing site** (`apps/landing`): Next.js. It isn't part of the self-hosted stack.
- A solo maintainer builds FinTrack as a side project and ships in small, serial increments. Community contributions are welcome.

## Capabilities and Constraints

- Core features:
  - Double-entry ledger with accounts, payees, transactions, postings and split transactions.
  - Envelope budgeting by month.
  - Scheduled transactions and rules.
  - Reports and insights: a Sankey cash-flow diagram, net worth over time, month-over-month category comparisons.
  - Subscription detection, savings goals and debt payoff planning (snowball/avalanche).
  - Opt-in AI categorization through the user's own API key or a local Ollama endpoint. Off by default and never required.
  - Real multi-currency: per-account currency, daily ECB rates, converted balances. A missing rate shows as unavailable, never as a wrong number.
  - An audit log, light and dark mode, and English and Spanish via react-i18next and Django gettext.
- Non-goals: native mobile apps, hosted SaaS, Plaid-first bank sync, investment portfolio tracking (Ghostfolio is the recommended tool for that).
- There are no pre-seeded accounts. The first registered user owns the instance.
- Open items needing accounts only the maintainer can create:
  - A public demo host. The demo machinery is built.
  - A Weblate project.
  - A Matrix/Discord space.

## Brand Commitments

- **Name:** FinTrack.
- **Voice (binding everywhere, in-app and on the landing site):** plain, honest and precise, in the README's register: "the honest comparison, not the flattering one".
  - No marketing superlatives or hype.
  - Name real trade-offs and limitations.
  - Claims must be specific and verifiable: cite the mechanism, not the adjective.
- **Privacy framing:** optional integrations (AI, notifications, analytics, bank sync) are always presented as off by default and opt-in.

## Evidence on Hand

- **Real product screenshots:** `docs/images/` (dashboard, transactions, budgets, reports) and `apps/landing/public/dashboard.png`.
- **Comparison table:** the README compares FinTrack with Actual Budget and Firefly III, sourced from each project's own docs.
- **Writing:** a technical blog post at `docs/blog/double-entry-for-developers.md` and migration guides at `docs/migrating.md`.
- **Absences future work must not fabricate:**
  - No testimonials, customer logos, user counts or star counts beyond the live GitHub badge.
  - No benchmarks and no press.
  - No live public demo URL yet.

## Product Principles

1. **Correctness is the brand.** Money data is never shown wrong. An honest "unavailable" beats a plausible guess.
2. **Privacy by default, power by opt-in.** Anything that leaves the server or adds a dependency is off until the user turns it on.
3. **The daily habit is the product.** Logging a transaction must stay fast on every device. Retention outranks feature count.
4. **Honest over flattering.** Copy, comparisons and empty states tell the truth about what FinTrack does and doesn't do.
5. **Built for self-hosters and households alike.** Single-user simplicity and shared-workspace features coexist without either feeling bolted on.

## Accessibility & Inclusion

- **Required standard:** WCAG 2.1 A/AA, enforced by axe over every page and both modal surfaces in CI (`apps/web/e2e/accessibility.spec.ts`). The roadmap acknowledges that axe catches only part of what fails. Keyboard-only and screen-reader passes over real workflows are still wanted.
- **Keyboard:** keyboard-first entry is a product feature, not just a compliance item.
- **Language:** first-class for non-English speakers. Every user-facing string goes through the i18n pipeline (`docs/i18n.md`). English and Spanish ship today.
