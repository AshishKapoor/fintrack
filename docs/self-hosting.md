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

# 3. Your own hostname. Out of the box DJANGO_ALLOWED_HOSTS is "*" so the
#    stack works on localhost, a LAN IP, or any hostname without edits - the
#    browser only ever talks to the web container, which proxies /api/
#    same-origin, so nothing here is reachable cross-origin anyway. Pin it
#    once you have a real domain, as defense in depth.
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

        # Import previews parse synchronously; give large files headroom.
        proxy_read_timeout 300s;
        client_max_body_size 20m;
    }
}
```

`X-Forwarded-Proto` matters: Django uses it to know the request arrived over
HTTPS.

### Rate limiting at the edge

The API throttles login, registration, password changes, and admin login
attempts (`THROTTLE_ADMIN_LOGIN`, default `10/min` per IP). If you expose the
Django admin at all, restricting it in your proxy is still good practice on
top of that — or better, do not expose it:

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

## Email

Each user can turn on email as a delivery channel for FinTrack's notifications
(budget threshold alerts, bill reminders, a weekly digest) under
**Settings → Notifications** — see [docs/i18n.md](i18n.md) for the unrelated
neighboring tabs, or just click around, it's a checkbox and a threshold.

Without any `EMAIL_*` variables set, FinTrack uses Django's console backend:
notifications still fire on schedule, they just print to the `worker`
container's log instead of being delivered anywhere —
`docker compose logs worker` to see them. That's enough to confirm the
feature works; it is not email delivery.

For real delivery, set these in `.env` and restart the stack:

```bash
EMAIL_HOST=smtp.your-provider.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-smtp-username
EMAIL_HOST_PASSWORD=your-smtp-password
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=FinTrack <notifications@yourdomain.com>
```

Any SMTP provider works — a self-hosted relay (Postfix, `msmtp`), or a
transactional service (SES, Mailgun, Postmark, Resend, ...). Set
`EMAIL_USE_SSL=True` and drop `EMAIL_USE_TLS` instead if your provider wants
implicit TLS (usually port 465) rather than STARTTLS (usually port 587).

The two other notification channels — [ntfy](https://ntfy.sh) and generic
webhooks — need no server-side configuration at all; each user points them at
their own ntfy topic or webhook URL directly in the Notifications tab.

## Bank sync

**Accounts → Bank Sync** connects a real bank account so transactions arrive
automatically instead of via repeated file imports — see
[ARCHITECTURE.md](../ARCHITECTURE.md) for how synced transactions flow
through the same dedup (`match_key`) and rules pipeline as everything else.
Two providers ship today, both privacy-aligned before convenience — see
ROADMAP.md's "Explicitly not first: Plaid" — and a third is a matter of
implementing `pft/bank_sync.py`'s `BankSyncProvider` interface.

### GoCardless Bank Account Data (EU/UK)

Needs one piece of instance-wide setup before anyone can use it:

1. Register a free account at
   [bankaccountdata.gocardless.com](https://bankaccountdata.gocardless.com/).
2. Create an API key pair (Secret ID + Secret Key) from its developer
   dashboard.
3. Set `GOCARDLESS_SECRET_ID` and `GOCARDLESS_SECRET_KEY` in `.env` and
   restart the stack.

Until both are set, GoCardless simply doesn't appear as a connectable option
(`GET /api/v1/finance/sync-connections/providers/` reports it as
`configured: false`) — nothing breaks, it's just unavailable.

Once configured, each user picks their country and bank from **Connect a
bank**, authenticates directly with their bank (FinTrack never sees banking
credentials — only the read-only data access GoCardless's consent flow
grants), and is redirected back to finish linking. That redirect target is
`FINTRACK_FRONTEND_URL` — set it to your real hostname once you're off
`localhost`, the same way you'd set `CORS_ALLOWED_ORIGINS`.

The free tier caps how many times a day each linked account can be polled,
which is why the sync sweep runs every 6 hours rather than hourly (see
`CELERY_BEAT_SCHEDULE` in `app/settings/base.py`) — a manual **Sync now**
button is also available per connection.

### SimpleFIN Bridge (US/CA)

Needs no instance-wide configuration — each user connects their own bridge
(e.g. [beta-bridge.simplefin.org](https://beta-bridge.simplefin.org/), or a
self-hosted one) directly:

1. Get a setup token from the bridge.
2. Paste it into **Connect a bank → SimpleFIN Bridge**.

FinTrack exchanges the one-time setup token for a durable access credential
server-side; the setup token itself is never stored.

### Credentials at rest

Both providers' stored credentials (a GoCardless requisition reference, a
SimpleFIN access URL) are encrypted at rest with `FINTRACK_SYNC_ENCRYPTION_KEY`
— see `pft/crypto.py`. Leave it unset and `SECRET_KEY` is reused for this too,
which is fine locally; set a dedicated value for a real deployment so rotating
`SECRET_KEY` (which signs everyone out) doesn't also strand every stored bank
connection. This protects against a database-only compromise (a stolen dump,
a misconfigured backup target) — anyone with code execution on the server can
always read the key and decrypt, the same caveat as `SECRET_KEY` itself.

## Real multi-currency

Every account has its own currency (defaulting to its budget file's when
created), and balances convert into the budget file's currency using daily
ECB reference rates from [frankfurter.app](https://www.frankfurter.app/) — no
API key needed. A `beat` service fetches the day's rates automatically
(`CELERY_BEAT_SCHEDULE`'s `sync-fx-rates-daily`); bare-metal installs without
one should either cron `manage.py sync_fx_rates` or use the **Sync now**
action FinTrack surfaces wherever a converted balance is missing a rate.

Until the first sync completes, converted amounts for a foreign-currency
account show as unavailable rather than a number that looks precise but
isn't — see `pft/fx_rates.py`'s `convert_amount`.

## Backups

Your data lives in the `postgres_data` volume. Nothing else in the stack holds
state you cannot rebuild — Redis carries only queued jobs in flight, and a lost
queue entry just means re-clicking an import.

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

Back up your `.env` too — specifically `SECRET_KEY` **and
`FINTRACK_SYNC_ENCRYPTION_KEY`**. Losing the latter is not recoverable from a
database dump: every stored bank sync credential and BYOK LLM key is encrypted
with it, and there is currently no rotation or re-encryption path, because the
stored ciphertext carries no key version to migrate from. If it changes, those
connections have to be set up again from scratch. FinTrack will tell you that
is what happened rather than failing obscurely, but it cannot undo it.

Restoring a database with a different `SECRET_KEY` invalidates every session
and token — annoying, but recoverable by signing in again.

### Application-level backups

Settings → Backup in the UI creates an encrypted backup bundle
(`/api/v1/finance/backups/`): the archive is encrypted in the browser
(AES-GCM, key derived from your passphrase) before upload, and restore replays
it through the public API. It covers one budget file's finance data — useful
for moving between instances — but it is not a substitute for a database dump,
which is the only thing that captures users, workspaces, and every file at
once.

## Upgrading

How you upgrade depends on how you installed.

**From source** (what `./setup.sh start` and the Quick Start give you):

```bash
cd /srv/fintrack
git pull && docker compose build && docker compose up -d
```

**From the published images**, if you started with
`docker-compose.images.yml`:

```bash
cd /srv/fintrack
git pull                      # compose files and migrations metadata
FINTRACK_VERSION=0.3.0 docker compose \
  -f docker-compose.yml -f docker-compose.images.yml pull
FINTRACK_VERSION=0.3.0 docker compose \
  -f docker-compose.yml -f docker-compose.images.yml up -d
```

Note that plain `docker compose pull` does nothing without that second file:
the base compose sets `pull_policy: build` so a clone always runs its own
working tree rather than silently swapping in a published tag.

Before running an image you have just pulled, you can verify it was built by
this repository rather than substituted somewhere in between:

```bash
gh attestation verify oci://ghcr.io/ashishkapoor/fintrack-api:0.3.0 \
  --owner AshishKapoor
```

Either way, migrations run automatically: the `migrate` service executes before
`api` starts, and `api` waits for it to complete.

**Take a database dump before upgrading.** Migrations in this project are not
reversible — the data migrations have no-op reverse functions — so rolling back
means restoring a dump.

Watch it come up:

```bash
docker compose logs -f migrate api
```

### Upgrading across a Postgres major version

FinTrack now runs `postgres:18-alpine`. Postgres never reads a data directory
written by a different major version, so moving from a 16 volume is a dump and
restore — there is no in-place `docker compose up -d` for it.

Two things changed at once, and the second is the one that surprises people:

- The image is `18-alpine` rather than `16-alpine`.
- The volume is mounted at `/var/lib/postgresql` rather than
  `/var/lib/postgresql/data`, because 18+ keeps the cluster in a
  major-version-specific subdirectory underneath that mount.

**If you upgrade without doing the steps below, the stack still starts — with
an empty database.** Postgres finds nothing at the new location and initialises
a fresh cluster there, so FinTrack comes up with no accounts and no
transactions. Your 16 data is still sitting in the same volume, untouched, so
this is recoverable; it just does not look that way from the UI. Do the dump
first and you never see it.

Run every step from your install directory, on the **old** stack, before
pulling the new compose file:

```bash
cd /srv/fintrack

# 1. Dump, while 16 is still the running image.
docker compose exec -T db pg_dump -U fintrack fintrack \
  | gzip > fintrack-pre-pg18-$(date +%F).sql.gz

# 2. Stop everything.
docker compose down
```

```bash
# 3. Keep the old volume as a tarball, so 16 is recoverable if the restore
#    goes wrong. The volume is prefixed with the compose project name, which
#    defaults to the directory name - check `docker volume ls` if you renamed it.
docker run --rm \
  -v fintrack_postgres_data:/from -v "$PWD":/to alpine \
  tar czf /to/postgres_data-pg16-$(date +%F).tar.gz -C /from .
```

```bash
# 4. Take the new compose file, then start from an empty volume so 18
#    initialises its own cluster. --wait blocks on the healthcheck, which
#    matters here: initdb on a fresh volume takes a few seconds, and without
#    it the restore below races the database and fails to connect.
git pull
docker volume rm fintrack_postgres_data
docker compose up -d --wait db
```

```bash
# 5. Restore into it, then bring the rest of the stack up.
gunzip -c fintrack-pre-pg18-*.sql.gz \
  | docker compose exec -T db psql -U fintrack -d fintrack
docker compose up -d
```

Check it before deleting the tarball:

```bash
docker compose exec -T db psql -U fintrack -d fintrack \
  -c 'select count(*) from pft_ledgertransaction;'
```

`SECRET_KEY` and `FINTRACK_SYNC_ENCRYPTION_KEY` live in `.env`, not in the
database, so a dump and restore does not disturb bank sync credentials or
stored LLM keys. Keep `.env` as it is.

## Housekeeping

Import and export jobs retain their payloads in the database, and those
payloads are plaintext financial data. The `beat` service in the Docker
Compose stack already runs this once a day (see `CELERY_BEAT_SCHEDULE` in
`app/settings/base.py`), so there is nothing to do here for the default
deployment. To run it by hand - a different retention window, or right after
turning up an instance with old data already in it:

```bash
docker compose exec api uv run manage.py prune_finance_jobs --days 30
```

Add `--dry-run` to see what it would clear.

Running bare-metal without the `beat` process? Cron it yourself:

```
0 3 * * * cd /path/to/fintrack/apps/api && uv run manage.py prune_finance_jobs
```

## Monitoring

The stack runs six services: `web`, `api`, `worker` (imports and exports),
`beat` (the scheduler behind everything in Housekeeping above, plus FX rates,
budget alerts, reminders and bank sync), `redis` (the job queue) and `db`.
`docker compose logs worker beat` shows job processing.

`beat` is the one worth watching. Nothing surfaces its absence in the UI, so a
`beat` container that died at 03:00 looks exactly like an instance where
nothing happened to be due - while scheduled imports, alerts and the daily
payload pruning all quietly stop.

`/healthz/` returns `200` with `{"status": "ok", "database": "ok"}` when the API
can reach Postgres, and `503` otherwise. It is unauthenticated and contains no
user data, so it is safe to point an uptime monitor at.

```bash
curl -fsS https://fintrack.example.com/healthz/
```

Container health is wired into compose, so `docker compose ps` shows real
status rather than just "running".

## Troubleshooting

**The stack starts but the web app cannot reach the API — signup or login
fails on the first request.** In the shipped Docker stack this is almost never
CORS: the browser talks only to the `web` container, whose nginx proxies
`/api/` to the backend on the same origin, so no cross-origin request exists
to be blocked. The usual cause is an `.env` created from an older
`.env.example` that pins `DJANGO_ALLOWED_HOSTS` to localhost — Django then
answers every API call with `400 DisallowedHost` when you browse via an IP or
hostname, which the UI reports as a failed signup. Set
`DJANGO_ALLOWED_HOSTS=*` (the current default) or add your host to it, then
`docker compose up -d` again. `CORS_ALLOWED_ORIGINS` only matters if you
serve the web app and API from *different* origins — then it must match the
scheme, host, and port you are browsing from.

**Signup says the account already exists (or used to just say "Registration
failed").** The address is already registered, so use the login page instead of
signup. Two ways a "fresh" instance already has it: an earlier signup attempt
actually succeeded, or `FINTRACK_ADMIN_EMAIL` in `.env` bootstrapped that same
address as the admin account when `migrate` ran. If you no longer have the
password, reset it with
`docker compose exec api uv run manage.py changepassword <email>`. Note that
signup is rate limited (`THROTTLE_REGISTER`, five attempts an hour by default),
so a burst of retries answers `Request was throttled` for a while afterwards.

**Redirect loop after enabling TLS.** Your proxy is not sending
`X-Forwarded-Proto: https`, so Django thinks the request is plain HTTP and
redirects again.

**`DisallowedHost` errors.** Your `.env` overrides the default
`DJANGO_ALLOWED_HOSTS=*` with a list that does not include the hostname you
are browsing from. Add it (spaces or commas as separators), or set the value
back to `*`.

**Everyone was signed out after a restart.** `SECRET_KEY` was not set, so a new
one was generated. Set it explicitly in `.env`.

**Compose keeps starting an old version.** The compose file sets
`pull_policy: build` so it builds from your checkout, but a previously pulled
image can still be cached — `docker compose build --no-cache` settles it.
