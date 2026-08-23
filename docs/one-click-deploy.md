# One-click and managed hosting

The primary, most-tested way to run FinTrack is `docker compose` on your own
server — see [self-hosting.md](self-hosting.md). This page is for the second
most common question: *"I don't want to manage a server at all, where else
can I run this?"*

Each option below trades some control (and, past a free tier, some money)
for not having to think about a host. None of them are more officially
supported than plain Docker Compose — they are just other places the same
containers happen to run.

## Render (one click)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/AshishKapoor/fintrack)

[`render.yaml`](../render.yaml) at the repo root is a
[Render Blueprint](https://render.com/docs/blueprint-spec) that deploys the
whole stack — web, API, Postgres, Redis — reading its configuration straight
from this repo. Clicking the button above is the entire setup process.

**What you get on the free tier:** the web app, the API, a Postgres database,
and a Redis instance, all on Render's free plans (**$0/month**). Imports and
exports run inline in the request instead of on a separate Celery worker,
because Render's free plan doesn't offer a Background Worker service — the
same fallback a bare-metal install without Redis uses (see
`CELERY_TASK_ALWAYS_EAGER` in `app/settings/base.py`). The daily payload-prune
job (`CELERY_BEAT_SCHEDULE`) doesn't run either; run
`manage.py prune_finance_jobs` by hand occasionally, or add a paid Background
Worker for it (see the comment block at the top of `render.yaml` for the
exact two services to add).

**Known limitations of the free tier**, both Render's, not FinTrack's:

- Free Postgres instances expire after 30 days. Fine for a trial; upgrade the
  `fintrack-db` plan in the Render dashboard before you keep real data there.
- Free web services spin down after inactivity and take a few seconds to wake
  back up on the next request.

After the first deploy, open the `web` service's URL and register your first
account — there is no default admin, same as any other FinTrack install.

## Railway

Railway doesn't support deploying a multi-service repo like this one from a
single committed file the way Render does, so there's no real one-click
button to offer honestly. The manual setup is still a straightforward,
one-time few-minutes job:

1. **New Project → Deploy from GitHub repo**, pick this repo.
2. Add two databases from Railway's plugin catalog: **PostgreSQL** and
   **Redis**. Railway wires their connection env vars into every service's
   variable reference picker automatically.
3. Add a service for each of these, all pointing at this same repo:

   | Service | Root directory | Notes |
   | --- | --- | --- |
   | `api` | `apps/api` | Dockerfile build. Health check path `/healthz/`. |
   | `web` | `apps/web` | Dockerfile build. This is the one you expose publicly. |
   | `worker` (optional) | `apps/api` | Same image as `api`; override the start command to `uv run celery -A app worker --loglevel=info --concurrency=2`. |
   | `beat` (optional) | `apps/api` | Same image again; start command `uv run celery -A app beat --loglevel=info`. |

4. On `api` (and `worker`/`beat` if you add them), set:
   - `DJANGO_SETTINGS_MODULE=app.settings.prod`, `DJANGO_ENV=production`, `DEBUG=False`, `SECURE_SSL=True`
   - `SECRET_KEY` — generate one (`python3 -c "import secrets; print(secrets.token_urlsafe(50))"`) and set it explicitly so it's identical across all three services
   - `DATABASE_URL` → reference the Postgres plugin's `DATABASE_URL` variable
   - `REDIS_URL` → reference the Redis plugin's `REDIS_URL` variable
   - `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS` → the `web` service's `*.up.railway.app` domain (Railway shows this once `web` has a public domain generated)
   - Skip `worker`/`beat` entirely and set `CELERY_TASK_ALWAYS_EAGER=True` on `api` instead if you don't want the extra services.
5. On `api`, add a **pre-deploy / release command**: `uv run manage.py migrate --noinput`.
6. Generate a public domain for `web` only. Leave `api`/`worker`/`beat` private (Railway's internal networking resolves `api` by service name, same as `nginx.conf` expects).

## PikaPods

FinTrack isn't in [PikaPods'](https://www.pikapods.com/apps) curated app
catalog yet (competitors Actual, Firefly III and a few others already are).
Getting it added is a PikaPods-side action, not something addable from this
repo: [suggest it on their feedback board](https://feedback.pikapods.com/) —
the more people who upvote it, the likelier it gets picked up.

## Unraid

FinTrack is a five-container stack, which is exactly what the **Docker
Compose Manager** plugin (available in Unraid's Community Applications) is
for, rather than hand-building five separate CA templates that would drift
from `docker-compose.yml` over time:

1. Install *Docker Compose Manager* from Community Applications if you don't
   have it.
2. Create a new stack, and either point it at this repo or paste the contents
   of [`docker-compose.yml`](../docker-compose.yml).
3. Copy [`.env.example`](../.env.example) to that stack's `.env` and fill in
   real values (at minimum `POSTGRES_PASSWORD` and `SECRET_KEY` — see
   [self-hosting.md](self-hosting.md)).
4. Bring the stack up from the plugin's UI. Map the `web` service's port 80
   to whatever host port you want FinTrack on.

## TrueNAS SCALE

TrueNAS SCALE's **Custom App** flow (Apps → Discover Apps → Custom App →
*Install via YAML*) accepts a Docker Compose file directly:

1. Apps → Discover Apps → **Custom App** → switch to *Install via YAML*.
2. Paste [`docker-compose.yml`](../docker-compose.yml).
3. Fill in the same environment variables `.env.example` describes — TrueNAS
   presents them as a form generated from the compose file.
4. Deploy. Expose the `web` service's port through TrueNAS's usual ingress/port
   mapping.

For either Unraid or TrueNAS, everything in [self-hosting.md](self-hosting.md)
(reverse proxy, TLS, backups) still applies once the stack is running.
