# @fintrack/sdk

Typed TypeScript client for the [FinTrack](https://github.com/AshishKapoor/fintrack)
API — every endpoint of the double-entry ledger, generated from the server's
OpenAPI schema. Framework-free: plain `fetch`, no runtime dependencies.

## Install

```bash
npm install @fintrack/sdk
```

## Use

```ts
import { configure, tokenCreate, v1FinanceTransactionsList } from '@fintrack/sdk'

configure({
  baseUrl: 'https://fintrack.example.com',
  getAccessToken: () => localStorage.getItem('access'),
})

const { access } = await tokenCreate({ email, password })
// store `access`, then:
const page = await v1FinanceTransactionsList({ page_size: 50 })
for (const tx of page.results) {
  console.log(tx.transaction_date, tx.memo, tx.posting_lines)
}
```

Errors throw `FintrackApiError` with `.status` and the parsed response `.body`.

## Every list is paginated

`v1Finance*List` returns `{ count, next, previous, results }`, never a bare
array. To read a whole resource, follow `next` until it is null - or raise
`page_size` (capped at 500 by the server) to cut the number of round trips:

```ts
async function all<T>(fetchPage: (params: { page: number; page_size: number }) => Promise<{
  next?: string | null
  results: T[]
}>) {
  const rows: T[] = []
  for (let page = 1; ; page += 1) {
    const response = await fetchPage({ page, page_size: 500 })
    rows.push(...response.results)
    if (!response.next) return rows
  }
}

const everything = await all((params) => v1FinanceTransactionsList(params))
```

## Regenerating

The client is generated from `apps/web/schema/pft.yaml` in the monorepo, which
CI keeps in lockstep with the backend:

```bash
pnpm run generate && pnpm run build
```

## Versioning

The SDK follows the API: breaking API changes land in a new SDK major. The
flat `/api/v1/{transactions,categories,budgets}` operations were deprecated
upstream and have now been removed; use `/api/v1/finance/*` instead. FinTrack's
own migration `0017` carries any rows those endpoints wrote into the ledger, so
data recorded through an older SDK is still there.
