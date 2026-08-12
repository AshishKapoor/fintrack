# Self-hosting FinTrack

The quickstart in the README gets you a working instance on your own machine.
This guide covers everything after that: putting it on a real host, backing it
up, and upgrading it.

Read [SECURITY.md](../SECURITY.md) alongside this. It lists the current known
limitations, and they affect how you should deploy.

## Before you expose it

The defaults are tuned for a local trial. For anything reachable beyond your
laptop, edit `.env`:

```bash
# 1. A real signing key. Keep it stable; changing it signs everyone out.
SECRET_KEY=$(openssl rand -base64 48)

# 2. A real database password.
POSTGRES_PASSWORD=<something long>

# 3. Your own hostname.
DJANGO_ALLOWED_HOSTS=fintrack.example.com
CORS_ALLOWED_ORIGINS=https://fintrack.example.com
CSRF_TRUSTED_ORIGINS=https://fintrack.example.com

# 4. TLS terminates in front of the stack.
SECURE_SSL=True
```

Then:

```bash
docker compose up -d
```

Set `SECURE_SSL=False` only when you are deliberately serving plain HTTP, for
example on a home LAN. With it `True` and no TLS in front, Django will redirect
you into a loop.

## Running behind a reverse proxy

The `web` container serves the UI on port 80 and proxies `/api/` to the backend
internally, so you only need to expose one port. Point your proxy at
`WEB_PORT` (default 5173) and terminate TLS there.

### Caddy

```caddyfile
fintrack.example.com {
    reverse_proxy localhost:5173
}
```

### nginx

```nginx
server {
    listen 443 ssl http2;
    server_name fintrack.example.com;

    ssl_certificate     /etc/letsencrypt/live/fintrack.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fintrack.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Imports and exports are computed synchronously.
        proxy_read_timeout 300s;
        client_max_body_size 20m;
    }
}
```

`X-Forwarded-Proto` matters: Django uses it to know the request arrived over
HTTPS.

### Rate limiting at the edge

The API throttles login, registration and password changes, but there is no
protection on `/admin/`. If you expose the Django admin at all, rate limit it
in your proxy — or better, do not expose it:

```nginx
location /admin/ {
    allow 10.0.0.0/8;
    deny all;
    proxy_pass http://127.0.0.1:5173;
}
```

## Creating your account

There is no default admin and no default password.

The simplest path is to register through the UI — the first account you create
is a normal user, which is all you need to use FinTrack.

For a Django admin account:

```bash
docker compose exec api uv run manage.py createsuperuser
```

Or non-interactively, before the first start, in `.env`:

```bash
FINTRACK_ADMIN_EMAIL=you@example.com
FINTRACK_ADMIN_PASSWORD=<a real password>
```

Both must be set, and the password must pass Django's validators.

## Demo data

To see the app populated — for a screenshot, a demo, or just to judge whether
you like it:

```bash
docker compose exec api uv run manage.py seed_demo
```

That creates `demo@fintrack.local` with six months of transactions, two
accounts and envelope budgets. Re-run with `--reset` to rebuild it, and delete
the user when you are done.

## Backups

Your data lives in the `postgres_data` volume. Nothing else in the stack holds
state you cannot rebuild.

### Dumping

```bash
docker compose exec -T db pg_dump -U fintrack fintrack | gzip > fintrack-$(date +%F).sql.gz
```

Automate it with cron:

```cron
0 3 * * * cd /srv/fintrack && docker compose exec -T db pg_dump -U fintrack fintrack | gzip > /backups/fintrack-$(date +\%F).sql.gz
```

### Restoring

Restoring overwrites the current database. Stop the app first so nothing writes
during the restore:

```bash
docker compose stop api web
```

```bash
gunzip -c fintrack-2026-08-12.sql.gz | docker compose exec -T db psql -U fintrack -d fintrack
```

```bash
docker compose start api web
```

Back up your `.env` too — specifically `SECRET_KEY`. Restoring a database with a
different signing key invalidates every session and token.

### Application-level backups

The API also has an encrypted backup bundle endpoint
(`/api/v1/finance/backups/`), which stores a client-encrypted archive. It is
not yet exposed in the UI, and it is not a substitute for a database dump.

## Upgrading

```bash
cd /srv/fintrack
```

```bash
git pull && docker compose build && docker compose up -d
```

Migrations run automatically: the `migrate` service executes before `api`
starts, and `api` waits for it to complete.

**Take a database dump before upgrading.** Migrations in this project are not
reversible — the data migrations have no-op reverse functions — so rolling back
means restoring a dump.

Watch it come up:

```bash
docker compose logs -f migrate api
```

## Housekeeping

Import and export jobs retain their payloads in the database, and those
payloads are plaintext financial data. Clear old ones periodically:

```bash
docker compose exec api uv run manage.py prune_finance_jobs --days 30
```

Add `--dry-run` to see what it would clear.

## Monitoring

`/healthz/` returns `200` with `{"status": "ok", "database": "ok"}` when the API
can reach Postgres, and `503` otherwise. It is unauthenticated and contains no
user data, so it is safe to point an uptime monitor at.

```bash
curl -fsS https://fintrack.example.com/healthz/
```

Container health is wired into compose, so `docker compose ps` shows real
status rather than just "running".

## Troubleshooting

**The stack starts but the web app cannot reach the API.** Check
`CORS_ALLOWED_ORIGINS` matches the scheme and host you are actually browsing
from, including the port if it is non-standard.

**Redirect loop after enabling TLS.** Your proxy is not sending
`X-Forwarded-Proto: https`, so Django thinks the request is plain HTTP and
redirects again.

**`DisallowedHost` errors.** Add your hostname to `DJANGO_ALLOWED_HOSTS`. It
accepts spaces or commas as separators.

**Everyone was signed out after a restart.** `SECRET_KEY` was not set, so a new
one was generated. Set it explicitly in `.env`.

**Compose keeps starting an old version.** The compose file sets
`pull_policy: build` so it builds from your checkout, but a previously pulled
image can still be cached — `docker compose build --no-cache` settles it.
