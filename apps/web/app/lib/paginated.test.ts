import { describe, expect, it, vi } from 'vitest'

import { MAX_PAGE_SIZE, asPaginated, fetchAllPages } from './paginated'

/** A fake list endpoint holding `total` rows and serving them `size` at a time. */
function pagedEndpoint(total: number, size = MAX_PAGE_SIZE) {
  const rows = Array.from({ length: total }, (_, index) => ({ id: index + 1 }))
  return vi.fn(async ({ page = 1, page_size = size }: { page?: number; page_size?: number }) => {
    const effective = Math.min(page_size, size)
    const start = (page - 1) * effective
    const slice = rows.slice(start, start + effective)
    return {
      count: total,
      next: start + effective < total ? `?page=${page + 1}` : null,
      previous: page > 1 ? `?page=${page - 1}` : null,
      results: slice,
    }
  })
}

describe('asPaginated', () => {
  it('wraps a bare array', () => {
    expect(asPaginated([{ id: 1 }, { id: 2 }])).toEqual({
      count: 2,
      next: null,
      previous: null,
      results: [{ id: 1 }, { id: 2 }],
    })
  })

  it('passes an envelope through', () => {
    const envelope = { count: 9, next: '?page=2', previous: null, results: [{ id: 1 }] }
    expect(asPaginated(envelope)).toEqual(envelope)
  })

  it('treats anything else as empty rather than throwing', () => {
    expect(asPaginated(null).results).toEqual([])
    expect(asPaginated(undefined).results).toEqual([])
    expect(asPaginated({ detail: 'nope' }).results).toEqual([])
  })
})

describe('fetchAllPages', () => {
  it('makes one request when everything fits on a page', async () => {
    const endpoint = pagedEndpoint(10)
    const rows = await fetchAllPages(endpoint)

    expect(rows).toHaveLength(10)
    expect(endpoint).toHaveBeenCalledTimes(1)
    expect(endpoint).toHaveBeenCalledWith({ page: 1, page_size: MAX_PAGE_SIZE })
  })

  it('follows next until the end, with no gaps or repeats', async () => {
    // Server caps pages at 50 regardless of what we ask for.
    const endpoint = pagedEndpoint(137, 50)
    const rows = await fetchAllPages<{ id: number }>(endpoint)

    expect(endpoint).toHaveBeenCalledTimes(3)
    expect(rows.map((row) => row.id)).toEqual(
      Array.from({ length: 137 }, (_, index) => index + 1),
    )
  })

  it('returns nothing for an empty list without a second request', async () => {
    const endpoint = pagedEndpoint(0)
    expect(await fetchAllPages(endpoint)).toEqual([])
    expect(endpoint).toHaveBeenCalledTimes(1)
  })

  it('handles an endpoint that still returns a bare array', async () => {
    const endpoint = vi.fn(async () => [{ id: 1 }, { id: 2 }])
    expect(await fetchAllPages(endpoint)).toHaveLength(2)
    expect(endpoint).toHaveBeenCalledTimes(1)
  })

  it('stops instead of looping forever when next never clears', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    // A server that always claims there is more: the bug this guards against
    // is an infinite request loop in the browser, not a wrong result.
    const endpoint = vi.fn(async () => ({
      count: 1_000_000,
      next: '?page=2',
      previous: null,
      results: [{ id: 1 }],
    }))

    const rows = await fetchAllPages(endpoint)

    expect(rows.length).toBeGreaterThan(0)
    expect(endpoint.mock.calls.length).toBeLessThanOrEqual(200)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
