# Running a public demo

FinTrack ships a `docker-compose.demo.yml` overlay for exactly one purpose:
let someone try the real app in a browser before they decide to self-host it,
without risking their data, yours, or the instance itself.

This is aimed at whoever maintains **the** public demo (e.g. a `demo.fintrack.example`
pointed at from the README), not at self-hosters running FinTrack for
themselves - if that's you, [docs/self-hosting.md](self-hosting.md) is the
right doc, and you do not want any of this.

## What it does

- **Seeds a demo account on first boot** — `demo@fintrack.local` /
  `demo-password-123` by default (override with `FINTRACK_DEMO_EMAIL` /
  `FINTRACK_DEMO_PASSWORD`), with six months of realistic transactions and
  envelope budgets. Same `seed_demo` command described in
  [self-hosting.md](self-hosting.md#demo-data).
- **Resets that account every hour** — a Celery beat schedule reruns
  `seed_demo --reset` (see `CELERY_BEAT_SCHEDULE` in `app/settings/base.py`
  and `pft/tasks.py:reset_demo_data_task`), so a visitor never inherits a mess
  left by whoever was clicking around before them.
- **Rejects every mutation instance-wide** except signing in
  (`pft/demo_mode.py:DemoModeMiddleware`). Nobody can register their own
  account, change the demo's data, or reach the Django admin at all -
  reads work everywhere, writes are a 403 everywhere. This is what actually
  keeps the demo intact between hourly resets, not just cosmetic.
- **Shows a banner in the UI** (`components/demo-banner.tsx`) so a visitor
  knows it's a shared demo and how to sign in, sourced from `/healthz/`'s
  `demo` / `demo_email` fields.

## What it deliberately does not do

- It is not a sandbox per visitor. Everyone shares the same account and the
  same data for that hour - that is the tradeoff that keeps it simple and
  free of any per-visitor cleanup logic.
- It does not rate-limit read traffic beyond what's already in
  [SECURITY.md](../SECURITY.md). Put it behind a CDN/reverse-proxy cache if
  it gets popular.
- It is not where you'd point real financial data, obviously - anyone who
  finds the login page can read whatever the demo account currently has in
  it.

## Deploying it

Same host, same commands as any other FinTrack deployment
([self-hosting.md](self-hosting.md)), plus this overlay:

```bash
git clone https://github.com/AshishKapoor/fintrack.git
cd fintrack
./setup.sh configure
```

Edit `.env` as you would for any internet-facing instance - real
`DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS` for
your actual domain, `SECURE_SSL=True` behind TLS. Then:

```bash
docker compose -f docker-compose.yml -f docker-compose.demo.yml up -d --build
```

That's the only difference from a normal deployment: one extra `-f`. Verify:

```bash
curl -fsS https://your-demo-host/healthz/
# {"status": "ok", "database": "ok", "demo": true, "demo_email": "demo@fintrack.local"}
```

Any hosting target that runs Docker Compose works - a small VPS, Railway,
Fly.io, PikaPods. Point its subdomain at the `web` service same as any other
FinTrack deployment.

## Turning it off

Redeploy with just `docker-compose.yml` (drop the `-f docker-compose.demo.yml`).
`FINTRACK_DEMO_MODE` goes back to its default of `False`, the read-only
middleware becomes a no-op, and the hourly reset schedule is not added.
