# Getting help

FinTrack is maintained by one person as a side project. That is not a warning —
it is the reason this page exists: choosing the right place gets you an answer
faster, and keeps the tracker usable for everyone.

## Where to go

| You want to… | Go here |
|---|---|
| Ask how to do something, or whether something is expected | [Discussions → Q&A](https://github.com/AshishKapoor/fintrack/discussions/categories/q-a) |
| Get help with a deploy, reverse proxy, or backup setup | [Discussions → Self-hosting](https://github.com/AshishKapoor/fintrack/discussions) |
| Report something broken | [Open a bug report](https://github.com/AshishKapoor/fintrack/issues/new?template=bug_report.yml) |
| Suggest a feature | [Open a feature request](https://github.com/AshishKapoor/fintrack/issues/new?template=feature_request.yml) — check [ROADMAP.md](ROADMAP.md)'s non-goals first |
| Report a security vulnerability | **Privately**, via [SECURITY.md](SECURITY.md). Never in a public issue |
| Start contributing | [CONTRIBUTING.md](CONTRIBUTING.md), then the [`good first issue`](https://github.com/AshishKapoor/fintrack/labels/good%20first%20issue) label |
| See what is planned | [ROADMAP.md](ROADMAP.md) |

Discussions is preferred over issues for questions on purpose. A question
answered there is searchable by the next person who hits the same wall; the
same question in a closed issue usually is not.

## Read these first

Most setup questions are already answered:

- [docs/self-hosting.md](docs/self-hosting.md) — environment variables, reverse
  proxies, backups, upgrades
- [docs/one-click-deploy.md](docs/one-click-deploy.md) — Render, Railway,
  PikaPods, Unraid, TrueNAS SCALE
- [docs/migrating.md](docs/migrating.md) — importing from YNAB, Actual Budget,
  Firefly III
- [ARCHITECTURE.md](ARCHITECTURE.md) — how the thing is put together, if you
  are debugging rather than deploying

## What helps a report get fixed

For anything that looks like a bug, the bug report form asks for the version
and the deployment method because those are what make it reproducible. Beyond
that:

- `docker compose logs api worker --tail 100` around the moment it happened.
- Whether it survives a hard refresh, and whether it happens in a private
  window (that separates "stale client state" from "the server is wrong").
- For import or bank-sync problems, a few **redacted** rows of the file or a
  description of the shape. Never paste real account numbers, access tokens or
  a SimpleFIN URL — the credentials are embedded in it.

## Response times

There is no SLA. Security reports are looked at first; everything else is
best-effort, and a maintainer's silence usually means "not yet", not "no". If
something has gone quiet for a couple of weeks, a nudge on the thread is
welcome.

## Chat

There is no Matrix or Discord space yet. It is on the roadmap, and setting one
up needs an account only the maintainer can create — the same situation as the
public demo instance and the Weblate project. Until then, Discussions is the
place, and it has the advantage of being permanently searchable.

If you would find a chat room useful, say so on the
[roadmap discussion](https://github.com/AshishKapoor/fintrack/discussions) —
demand is the thing that decides whether it is worth the moderation load.
