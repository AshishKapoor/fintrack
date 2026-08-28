# FinTrack Web

React 19 single-page app: Vite, TailwindCSS + shadcn/ui, SWR for data, and a
generated (orval) API client. Served by nginx in the Docker stack, which also
proxies `/api/` to the backend.

For how the system fits together, read [ARCHITECTURE.md](../../ARCHITECTURE.md).

## Run it

```bash
cp .env.example .env      # VITE_BASE_DOMAIN, default http://localhost:8000
pnpm install
pnpm dev                  # :5173, expects the API running
```

pnpm's version is pinned by `packageManager`; `corepack enable` once and forget.

## Layout

```
app/
├── pages/                one directory per route
├── components/           feature components (ui/ = shadcn primitives);
│                         error-boundary.tsx catches render crashes
├── client/
│   ├── httpPFTClient.ts  axios: auth header, 401 refresh-and-retry, toasts,
│   │                     and the offline write queue that replays on reconnect
│   └── gen/              orval output — tracked in git, never hand-edited
├── lib/                  ledger.ts (posting builders, SWR invalidation),
│                         paginated.ts (page envelope helpers), auth, backup,
│                         import/export, dates
├── context/              currency + organization providers
└── hooks/                Zustand stores
e2e/                      Playwright suite (runs against the Docker stack),
                          including accessibility.spec.ts — axe over every page
schema/pft.yaml           OpenAPI schema — the contract with the backend
```

Every list endpoint returns `{count, next, previous, results}`; read pages
through `lib/paginated.ts` rather than treating a response as an array.

## Development

```bash
pnpm run lint             # eslint
pnpm run test             # vitest units
pnpm run build            # tsc -b && vite build
pnpm orval                # regenerate app/client/gen/ after schema changes
```

End-to-end tests need the real stack:

```bash
docker compose up -d
pnpm exec playwright install chromium
pnpm exec playwright test
```

CI runs all of the above — the Playwright suite included, so a new axe
violation fails the build — plus a diff gate that fails if `app/client/gen/`
does not match `schema/pft.yaml`.
