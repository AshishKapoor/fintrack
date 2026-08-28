## What does this change?

<!-- One or two sentences. Link the issue it closes, if there is one. -->

Closes #

## Why?

<!-- What problem does this solve for someone running FinTrack? -->

## How was it verified?

<!-- Delete what does not apply. -->

- [ ] `cd apps/api && uv run ruff check . && uv run manage.py test`
- [ ] `cd apps/web && pnpm run lint && pnpm run build`
- [ ] `docker compose build && docker compose up -d` and the app works end to end
- [ ] Tried it manually (say what you did)

## Checklist

- [ ] Backend changes to a queryset, serializer or permission come with a
      cross-tenant test in `apps/api/pft/tests/test_tenant_isolation.py`
- [ ] No secrets, `.env` files, or generated clients committed
- [ ] Docs updated if the setup steps or API surface changed
