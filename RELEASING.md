# Releasing

FinTrack ships on a **monthly cadence**: a tagged release in the first week of
each month, whether or not it is exciting. Between releases, `main` is expected
to be deployable — CI gates lint, the full backend suite, both generated SDKs,
a Docker stack smoke test and the Playwright end-to-end suite on every push.

A predictable, boring cadence matters more than a big one. Self-hosters decide
when to upgrade, and they decide better when "the first week of the month" is a
thing they can rely on. A month with nothing but dependency bumps is still a
release; it just has a short changelog.

## What a release is

- A `vX.Y.Z` tag on `main`.
- A GitHub Release whose notes are that version's [CHANGELOG.md](CHANGELOG.md)
  section.
- Multi-architecture `api` and `web` images on GHCR, published by
  [`.github/workflows/release.yml`](.github/workflows/release.yml) when the tag
  is pushed.
- `@fintrack/sdk` on npm and `fintrack-sdk` on PyPI, from the same workflow —
  each skips itself when its publish token is not configured, so forks are
  unaffected.

## Versioning

Semantic versioning, against the **HTTP API** rather than the internal Python:

- **Major** — a breaking API change. Removing an endpoint, renaming a schema
  component, or changing a response shape. Everything Phase 4 did (retiring the
  flat resources, dropping the `V2` suffix, paginating every list) is why v1.0.0
  is the next major.
- **Minor** — new endpoints, new fields, new features.
- **Patch** — fixes and dependency bumps.

A migration that changes the database but not the API is a minor or a patch.
Say so in the changelog anyway: a self-hoster wants to know before they upgrade
whether the step is reversible.

## The checklist

1. **Confirm `main` is green.** Every job on the latest commit, not just the
   ones that usually matter.

2. **Regenerate and check for drift.** CI checks this, but catching it here is
   cheaper than an aborted release:

   ```bash
   cd apps/api && uv run manage.py spectacular --file ../web/schema/pft.yaml
   cd ../web && pnpm orval
   cd ../../packages/sdk-ts && pnpm run generate && pnpm run build
   cd ../sdk-py && uvx openapi-python-client@0.29.0 generate \
       --path ../../apps/web/schema/pft.yaml --output-path fintrack_sdk \
       --meta none --overwrite && python3 post_generate.py
   git diff --exit-code
   ```

3. **Run the feature audit.** `make feature-audit` must report zero findings;
   it regenerates `docs/feature-audit/parity-report.md`.

4. **Test an upgrade, not just a fresh install.** This is the step that is easy
   to skip and expensive to get wrong. Start the *previous* release's images,
   let them seed a database, then bring up the new ones against the same
   volume and watch the migrations apply:

   ```bash
   docker compose down            # keep the volume
   docker compose up -d
   docker compose logs migrate
   ```

   Migrations that only ever run against an empty test database hide real
   failures — Postgres refuses DDL on a table with pending deferred trigger
   events, and that only happens when there are rows.

5. **Write the changelog.** Add the version's section to
   [CHANGELOG.md](CHANGELOG.md). Lead with anything that needs action on
   upgrade: breaking API changes, new required environment variables,
   migrations that take a long time or cannot be reversed.

6. **Bump the versions.** `apps/api/pyproject.toml`,
   `packages/sdk-py/pyproject.toml`, `packages/sdk-ts/package.json`. They move
   together; a reader should never have to work out which SDK matches which
   server.

7. **Tag and push.**

   ```bash
   git tag -a v0.3.0 -m "v0.3.0"
   git push origin v0.3.0
   ```

8. **Watch the publish workflow**, then pull `ghcr.io/ashishkapoor/fintrack-api`
   on a machine that is not the one that built it. An arm64-only `:latest` is
   how this project previously shipped images most self-hosters could not run.

9. **Write the release notes** from the changelog section, and link the
   upgrade notes if there are any.

## If a release goes wrong

Do not delete or move the tag — someone has already pulled it. Fix forward with
a patch release, and put a note at the top of the broken version's changelog
section saying what is wrong and which version to use instead.
