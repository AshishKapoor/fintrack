# Pending GitHub Actions workflows

These workflows are ready to use but staged here because the automation that
authored them has no `workflows` permission on this repository, so it cannot
write to `.github/workflows/` directly.

**To activate them**, run this from the repo root and push:

```sh
git mv .github/workflows-pending/*.yml .github/workflows/ 2>/dev/null \
  || { mkdir -p .github/workflows && git mv .github/workflows-pending/*.yml .github/workflows/; }
git rm .github/workflows-pending/README.md
git commit -m "ci: activate workflows"
```

## What each workflow does

| Workflow | Gates |
|---|---|
| `ci.yml` | API: ruff lint + format check, Django system checks, migration drift check (`makemigrations --check`), full test suite against PostgreSQL 16. Web: ESLint, TypeScript build. Landing: Next.js build. Docker: compose validation + API/Web image builds. |
| `codeql.yml` | CodeQL static security analysis for Python and JS/TS on every PR, push to `main`, and weekly. |
| `secrets-scan.yml` | Gitleaks secret scanning over the full git history on every PR and push to `main`. |
| `pr-checks.yml` | Enforces Conventional Commits PR titles (`feat(web): ...`, `fix(api): ...`). |

Every command in `ci.yml` was run against this exact commit before it was
authored (17/17 API tests passing on PostgreSQL 16, ESLint 0 errors, all
builds green, gitleaks clean over 62 commits), so the suite is green from
day one.
