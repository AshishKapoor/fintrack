# Changelog

Notable changes per release. FinTrack ships monthly — see
[RELEASING.md](RELEASING.md) for the cadence and the versioning rules, which
track the **HTTP API** rather than the internal Python.

Each entry leads with anything that needs action on upgrade. If a section has no
**Upgrading** heading, `docker compose pull && docker compose up -d` is the
whole procedure.

The format is loosely [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Upgrading

- **Postgres moves from 16 to 18, and existing installs need a dump and
  restore.** Postgres never reads a data directory written by a different
  major version, and 18+ also changes where the images keep the cluster: the
  compose volume is now mounted at `/var/lib/postgresql` rather than
  `/var/lib/postgresql/data`, with `PGDATA` left at the image default of
  `/var/lib/postgresql/18/docker`. Upgrading without migrating fails loudly:
  the 18 image finds the 16 cluster at the root of the remounted volume and
  refuses to start, so the stack dies with `dependency failed to start:
  container fintrack-db-1 is unhealthy`. The 16 data is untouched and
  recoverable. The procedure — including recovery for installs that already
  pulled and hit that error — is in
  [docs/self-hosting.md](docs/self-hosting.md), "Upgrading across a Postgres
  major version". Managed-Postgres deployments (`render.yaml`) are
  unaffected.

### Changed

- Redis moves from 7 to 8 in the compose stack. No action needed: Redis only
  carries queued jobs in flight here.

## [1.0.0] — 2026-08-28

The v1.0.0 hardening pass ([ROADMAP.md](ROADMAP.md) Phase 4). This is where the
API contract stops moving, so it is deliberately where the breaking changes are
concentrated.

### Upgrading

Every change below is applied by the migrations in `apps/api/pft/migrations/`;
`docker compose up -d` runs them. Two of them move data, so **take a backup
first** — the encrypted backup in the app covers the ledger, and a
`pg_dump` covers everything.

- **The flat `/api/v1/{transactions,categories,budgets}` endpoints are gone.**
  They had carried RFC 9745 deprecation headers naming their successor for a
  release. Use `/api/v1/finance/*`. Migration `0017` carries any rows they held
  into the ledger first, stamped `match_key="legacy:<pk>"` — nothing is lost,
  and rows already carried by migration `0005` are not carried twice.
- **`CategoryV2` and `CategoryGroupV2` are now `Category` and `CategoryGroup`**
  in the OpenAPI schema and both SDKs. URLs are unchanged. Regenerate any
  client you maintain.
- **Every list endpoint returns `{count, next, previous, results}`**, 50 rows a
  page, `?page_size=` up to 500. Previously only transactions and the audit log
  paginated. Anything that indexed a list response directly needs to read
  `.results`, and anything that needs a whole resource needs to follow `next` —
  both SDK READMEs have a snippet.
- **`BudgetFile.user` is gone**; `organization` is required. `is_default` is
  still a field on a budget file, but it now means "this caller's default" and
  is stored on their `Membership`, so two members of a shared workspace
  legitimately see different values for the same row.

### Security

- **PyJWT upgraded from 2.9.0 to 2.13.0.** The pinned version dated from August
  2024 and carries CVE-2026-48526, an authentication bypass via forged JSON Web
  Tokens. It reaches the image transitively through
  `djangorestframework-simplejwt`, which issues and validates every session
  token. `sqlparse` 0.5.3 → 0.6.0 alongside it. Nothing else was needed: both
  are drop-in.
- Both container images now patch their base OS packages at build time,
  clearing a CRITICAL in `libgnutls30` and HIGHs across krb5 and `libcap2` that
  were shipping in the published images.
- Container images now carry an SBOM and signed build provenance. Verify before
  you run one:
  `gh attestation verify oci://ghcr.io/ashishkapoor/fintrack-api:<version> --owner AshishKapoor`
- Dependency scanning added to CI (`osv-scanner` over the lockfiles, `trivy`
  over the images). Dependabot's ecosystem for `/apps/api` was wrong — `pip`
  for a uv-managed project — so the API's dependencies had never once been
  updated automatically, which is how the PyJWT advisory went unnoticed. Fixed,
  and `packages/sdk-ts`, `packages/sdk-py` and the compose images are now
  covered too.

### Added

- `docker-compose.images.yml`, so the published images can actually be run.
  The base compose sets `pull_policy: build`, which made `docker compose pull`
  a silent no-op — the procedure this file previously documented did nothing.
- CodeQL, gitleaks and Conventional-Commit PR title checks in CI, with a
  `.gitleaks.toml` shared by CI and the pre-commit hook.
- An axe accessibility gate over every page and both modal surfaces
  (`apps/web/e2e/accessibility.spec.ts`), running in the existing Playwright
  job at WCAG 2.1 A/AA.
- `SUPPORT.md`, `RELEASING.md`, this changelog, and GitHub issue forms that ask
  for the deployment method and logs a self-hosted bug report actually needs.

### Fixed

- **Offline changes could be silently destroyed.** The replay queue kept only
  the request that failed and dropped every queued change behind it, after the
  UI had said "Change queued and will sync when connection returns". It now
  keeps the whole untried remainder, and distinguishes a request the server
  refused (skipped, and reported) from one it could not answer (retried later).
- **Server errors were invisible.** A 5xx or a 429 produced no toast and no
  error state — just a spinner that stopped — while the API throttles at
  10/min on login and 30/hour on bank sync. Both are handled now, as is a 401
  that survives a token refresh.
- **A render error blanked the whole app.** There was no error boundary; there
  is one now, and `bootstrap()` no longer fails silently into an empty page.
- **"Sync now" returned a 500 after `FINTRACK_SYNC_ENCRYPTION_KEY` changed.**
  `DecryptionError` escaped `sync_connection`, which caught only
  `BankSyncError`. The error now names the environment variable responsible.
- Accessibility: honor reduced-motion preferences across CSS and the custom
  loading spinner, restore focus after dialogs close, and include the 404 page
  in the automated accessibility sweep.
- `set-default` on a budget file cleared the default across every file the
  caller could see, so in a shared workspace one member's choice moved
  everyone else's — and their own, in their other workspaces.
- A member of a shared workspace could not create or edit an envelope
  assignment in a budget file someone else had created there, despite having
  write access to everything around it.
- Deleting a user cascaded into every budget file they had created, including
  ones in shared workspaces they no longer owned alone. `created_by` is now
  `SET_NULL`, and a workspace is deleted only once it has no members left.
- Accessibility: an unnamed export button and two unnamed selects on the
  transactions page; 20 labels not associated with their controls across
  Reports and Rules; a settings label pointing at an id that did not exist; a
  `Tabs` used as a segmented control, whose triggers advertised panels that
  were never rendered.
- `scripts/feature_audit.py` never scanned `pft/finance_urls.py`, so the three
  AI-categorization endpoints had reported as schema-only since the day they
  shipped.
- **The landing site had not deployed since 2026-08-13.** Vercel built it on
  every push of every branch, which first exhausted the free tier's build
  quota, and the monorepo restructure left the project's Root Directory
  pointing at the old `landing/` path. Deploys are now gated by an Ignored
  Build Step (`apps/landing/vercel.json`) that skips every build unless the
  project version was bumped — so the site redeploys once per release, not
  per merge. The Root Directory fix is a dashboard setting; it is documented
  in `apps/landing/README.md`.

## [0.2.0] — 2026-08-13

**Workspaces, a provable ledger, and the SDKs.**

### Added

- Shared workspaces: `Organization`, `Membership` with a four-role ladder, and
  email invitations. All data access routes through membership
  (`pft/tenancy.py`).
- An exportable, manager-gated audit log per workspace.
- Published SDKs generated from the OpenAPI schema — `@fintrack/sdk` on npm and
  `fintrack-sdk` on PyPI — with CI keeping both in lockstep with the backend.
- Encrypted, client-side backup and restore: the server only ever stores
  opaque salt/nonce/ciphertext.
- The monorepo layout (`apps/`, `packages/`) and multi-architecture images, so
  `:latest` runs on the x86_64 hosts most people self-host on rather than being
  arm64-only.

### Fixed

- The zero-sum ledger invariant is enforced by a deferred constraint trigger in
  the database, not only in the serializer, so bulk paths and future bugs
  cannot corrupt the ledger.

## [0.1.0] — 2026-08-12

The first release: the double-entry ledger, envelope budgeting, seven import
formats, the rules engine, scheduled transactions, and reports.

[1.0.0]: https://github.com/AshishKapoor/fintrack/releases/tag/v1.0.0
[0.2.0]: https://github.com/AshishKapoor/fintrack/releases/tag/v0.2.0
[0.1.0]: https://github.com/AshishKapoor/fintrack/releases/tag/v0.1.0
