# Security Policy

FinTrack stores personal financial data, and most installs are self-hosted by one
person. Security reports are welcome and taken seriously.

## Reporting a vulnerability

**Please do not open a public issue for a security problem.**

Use GitHub's [private vulnerability reporting](https://github.com/AshishKapoor/fintrack/security/advisories/new)
to reach the maintainers privately.

Please include: what you found, how to reproduce it, and what an attacker could do
with it. A proof of concept helps a lot.

You can expect an acknowledgement within a week. Fixes for issues affecting data
isolation or authentication are prioritised over everything else.

## Supported versions

FinTrack has not yet cut a stable release. Until `v1.0.0`, only the latest commit
on `main` receives security fixes. Self-hosters should track the newest tagged
release.

## Before you expose an instance to the internet

The default configuration is tuned for a quick local trial, not for a public
deployment. At minimum:

1. **Set `SECRET_KEY`** in your `.env`. If you leave it blank, one is generated and
   persisted on first boot - fine locally, but set it explicitly in production so
   it survives container recreation.
2. **Set a real `POSTGRES_PASSWORD`.** The default is a placeholder.
3. **Set `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS`**
   to your own hostname.
4. **Terminate TLS** in front of the stack and leave `SECURE_SSL=True` (the default
   for the production settings module). Only set it to `False` for plain-HTTP LAN use.
5. **Do not publish Postgres to the host.** The default compose file keeps it on the
   internal network; the port mapping is commented out deliberately.
6. **Create your admin account deliberately.** There is no default admin and no
   default password. Either register the first account through the UI, or set
   `FINTRACK_ADMIN_EMAIL` and `FINTRACK_ADMIN_PASSWORD` before the first boot.

## Known limitations

These are real and tracked, not hidden:

- **`/admin/login/` is not rate limited.** The API throttles `/api/token/`,
  `/api/v1/register/` and password changes, but the Django admin login is
  served by Django itself. Limit it at your reverse proxy, or do not expose it.
- **Tokens are stored in JavaScript-readable cookies**, so any XSS is an account
  takeover. They carry `SameSite=Strict`, and `Secure` over HTTPS, but not
  `HttpOnly`. Moving the access token into memory with an HttpOnly refresh
  cookie is planned.
- **Import and export run synchronously in the request.** Payloads are capped
  (`FINTRACK_MAX_IMPORT_BYTES`, `FINTRACK_MAX_BACKUP_BYTES`) but there is no
  background queue, so a large import ties up a worker.
- **`ImportJob.source_payload` retains the raw uploaded bank file** in the
  database as plaintext, as do completed exports. Run
  `manage.py prune_finance_jobs` periodically; see
  [docs/self-hosting.md](docs/self-hosting.md).
- **The finance endpoints are unpaginated**, so a large ledger returns in one
  response.

## History

A previous version of this repository committed a `SECRET_KEY` to `api/.env.dev`
and shipped it as the default. That key is in the public git history and must be
considered compromised. Any instance that ran it should rotate its `SECRET_KEY`,
which invalidates all existing sessions and tokens. The same versions created an
`admin@example.com` / `fintrack` superuser automatically; delete that account if it
exists on your instance.
