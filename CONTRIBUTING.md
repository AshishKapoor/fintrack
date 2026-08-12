# 🤝 Contributing

Contributions, issues, and feature requests are welcome!
Fork the repo, create a branch, and submit a pull request against `main`.

## Before you open a PR

Every pull request runs the CI gates below. PRs that fail them will not be
merged, so run the same commands locally first.

### PR title

PR titles must follow [Conventional Commits](https://www.conventionalcommits.org/):
`type(scope): summary` — e.g. `feat(web): add budget chart`,
`fix(api): reject unbalanced ledger postings`, `docs: update self-host guide`.

### API (`api/`, Django + uv)

```sh
cd api
uv sync
uv run ruff check .                        # lint
uv run ruff format --check .               # formatting
uv run manage.py makemigrations --check    # migrations in sync with models
uv run manage.py test                      # full test suite (needs PostgreSQL)
```

The easiest way to run the test suite with PostgreSQL is via Docker:
`make test-api-all` from the repo root.

If you change models, commit the generated migrations — CI fails on
migration drift.

### Web (`web/`, React + Vite + pnpm)

```sh
cd web
pnpm install
pnpm lint      # ESLint (errors fail CI)
pnpm build     # TypeScript typecheck + production build
```

### Landing (`landing/`, Next.js)

```sh
cd landing
pnpm install
pnpm build
```

### Docker

CI validates `docker-compose.yml` and builds the API and Web images, so keep
the Dockerfiles working if you touch anything they copy or run.

### Security

- Never commit secrets, tokens, or real credentials — every push and PR is
  scanned with Gitleaks, and CodeQL analyzes Python and TypeScript weekly and
  on every PR.
- See [SECURITY.md](SECURITY.md) for how to report vulnerabilities.
