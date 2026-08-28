import useSWR, { type SWRConfiguration } from 'swr'

/**
 * Every list endpoint paginates (see apps/api/pft/pagination.py), so a list
 * response is `{count, next, previous, results}` and one request is one page.
 *
 * Most of this app's list consumers are pickers and dashboards that need the
 * whole set: a category dropdown showing the first 50 of 63 categories is
 * worse than a slow one, because nothing tells the user the rest exist. These
 * helpers walk `next` to the end.
 *
 * Where a list is genuinely unbounded and the user is paging through it - the
 * transaction register - the page-at-a-time hooks are used directly instead.
 */

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

/** The server's cap (StandardPagination.max_page_size). */
export const MAX_PAGE_SIZE = 500

/** Refuse to loop forever if `next` ever fails to advance. */
const MAX_PAGES = 200

/**
 * Accept either shape. Endpoints that return a bare array are actions
 * (`/providers/`, `/balances/`), not list routes, but callers share helpers
 * with the list routes and it costs nothing to be tolerant here.
 */
export function asPaginated<T>(payload: unknown): PaginatedResponse<T> {
  if (Array.isArray(payload)) {
    return { count: payload.length, next: null, previous: null, results: payload as T[] }
  }

  const maybe = payload as Partial<PaginatedResponse<T>> | null | undefined
  if (maybe && Array.isArray(maybe.results)) {
    return {
      count: maybe.count ?? maybe.results.length,
      next: maybe.next ?? null,
      previous: maybe.previous ?? null,
      results: maybe.results,
    }
  }

  return { count: 0, next: null, previous: null, results: [] }
}

/**
 * What the generated `v1Finance*List` functions return: `count` and `results`
 * are always present, `next`/`previous` are optional-and-nullable. Structural,
 * not the strict `PaginatedResponse` above, so orval's own `Paginated*List`
 * types satisfy it without a cast at every call site.
 */
export interface PageLike<T> {
  count: number
  next?: string | null
  previous?: string | null
  results: T[]
}

type PageFetcher<T> = (params: {
  page?: number
  page_size?: number
}) => Promise<PageLike<T> | T[]>

/**
 * Fetch every page of a list endpoint.
 *
 * Asks for the largest page the server allows, so the common case (anything
 * under 500 rows) is a single request and the loop never runs a second time.
 */
export async function fetchAllPages<T>(fetchPage: PageFetcher<T>): Promise<T[]> {
  const all: T[] = []

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const response = asPaginated<T>(await fetchPage({ page, page_size: MAX_PAGE_SIZE }))
    all.push(...response.results)

    if (!response.next || response.results.length === 0) return all
  }

  // Only reachable with more than MAX_PAGES * MAX_PAGE_SIZE rows in one list.
  // Returning what we have beats hanging, but say so rather than pretending
  // this is the whole set.
  console.warn(`fetchAllPages stopped at ${MAX_PAGES} pages; the list is truncated.`)
  return all
}

/**
 * SWR over `fetchAllPages`. `data` is the flat array, so call sites that used
 * a generated `use*List()` hook back when lists were bare arrays keep reading
 * it the same way.
 */
export function useAllPages<T>(
  key: string | readonly unknown[] | null,
  fetchPage: PageFetcher<T>,
  options?: SWRConfiguration<T[]>,
) {
  return useSWR<T[]>(key, () => fetchAllPages(fetchPage), options)
}
