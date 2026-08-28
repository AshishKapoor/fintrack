# Changelog

Notable changes per release. FinTrack ships monthly — see
[RELEASING.md](RELEASING.md) for the cadence and the versioning rules, which
track the **HTTP API** rather than the internal Python.

Each entry leads with anything that needs action on upgrade. If a section has no
**Upgrading** heading, `docker compose pull && docker compose up -d` is the
whole procedure.

The format is loosely [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased

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

### Added

- CodeQL, gitleaks and Conventional-Commit PR title checks in CI, with a
  `.gitleaks.toml` shared by CI and the pre-commit hook.
- An axe accessibility gate over every page and both modal surfaces
  (`apps/web/e2e/accessibility.spec.ts`), running in the existing Playwright
  job at WCAG 2.1 A/AA.
- `SUPPORT.md`, `RELEASING.md`, this changelog, and GitHub issue forms that ask
  for the deployment method and logs a self-hosted bug report actually needs.

### Fixed

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

[0.2.0]: https://github.com/AshishKapoor/fintrack/releases/tag/v0.2.0
[0.1.0]: https://github.com/AshishKapoor/fintrack/releases/tag/v0.1.0
