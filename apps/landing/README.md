# FinTrack landing site

The Next.js marketing site served at <https://fintrack.sannty.in>. It is not
part of the self-hosted stack — `docker-compose.yml` never references it — so
nothing here affects an installed FinTrack.

```bash
pnpm install
pnpm dev     # http://localhost:3000
pnpm build   # what CI and Vercel run; lint and type errors fail the build
```

## Live demo tour

The "Take the Tour" section (`components/live-demo.tsx`) is a clickable
walkthrough of real screens from a FinTrack instance seeded with
`manage.py seed_demo`, stored in `public/demo/`. It needs no backend, so it
works on Vercel as-is. Recapture the screens after a visible UI change:

```bash
docker compose exec api python manage.py seed_demo --reset
node scripts/capture-demo.cjs            # app at http://localhost:5173
```

Set `NEXT_PUBLIC_DEMO_URL` to a public instance running
`docker-compose.demo.yml` ([docs/demo.md](../../docs/demo.md)) and the tour
also shows an "Open the live demo" button with the sign-in details
(`NEXT_PUBLIC_DEMO_EMAIL` / `NEXT_PUBLIC_DEMO_PASSWORD`, defaulting to the
seed's). Unset, the button is hidden.

## Deployment

The site deploys through the Vercel Git integration (project `fintrack`),
**only when the project version is bumped** — the release-PR merge that moves
the three version manifests together (RELEASING.md step 6). Every other push
to `main` is skipped by the Ignored Build Step in [`vercel.json`](vercel.json),
which runs [`scripts/ignore-build.sh`](scripts/ignore-build.sh): it compares
`packages/sdk-ts/package.json`'s `version` between the last deployed commit
and the pushed one, and cancels the build when it has not moved.

Deploying on every push is what broke the site's deploys in the first place:
this repository is busy enough (Dependabot alone) that the account hit the
free tier's build rate limit on 2026-08-13, and every deployment since failed.

### One-time Vercel dashboard settings

These cannot be set from the repository; check them if deploys fail:

- **Root Directory** must be `apps/landing`. The 2026-08 monorepo restructure
  (`d44c13d`) moved the site from `landing/` to `apps/landing/`, and a project
  still pointing at the old path fails every deployment before the build
  starts. This also is what makes Vercel read this directory's `vercel.json`.
- Framework preset: Next.js. No other overrides are needed — install and
  build come from `package.json` (`packageManager` pins pnpm).
