import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The offline replay queue.
 *
 * `httpPFTClient` queues mutations made while offline and replays them when the
 * connection returns, telling the user "Change queued and will sync when
 * connection returns." These tests exist because that promise was false: the
 * flush loop kept only the item that failed and silently dropped everything
 * behind it, so a queue of [a, b, c] where b failed lost c permanently.
 *
 * The module registers `online` listeners and reads `navigator` at import time,
 * so each test imports it fresh against a clean localStorage.
 */

const QUEUE_KEY = 'fintrack_offline_request_queue_v1'

const request = vi.fn()

vi.mock('axios', () => {
  const instance = {
    request,
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  }
  return { default: { create: () => instance }, AxiosError: class extends Error {} }
})

vi.mock('@/lib/auth', () => ({
  getAuthToken: vi.fn().mockResolvedValue(null),
  refreshAccessToken: vi.fn(),
}))

const toastError = vi.fn()
const toastSuccess = vi.fn()
vi.mock('sonner', () => ({
  toast: { error: toastError, success: toastSuccess, info: vi.fn() },
}))

function queued(id: string) {
  return {
    id,
    method: 'POST',
    url: `/api/v1/finance/transactions/${id}`,
    data: { memo: id },
    created_at: '2026-01-01T00:00:00.000Z',
  }
}

function storedIds() {
  return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]').map(
    (item: { id: string }) => item.id,
  )
}

/**
 * Import the client online and let its import-time flush run.
 *
 * The module both flushes on import and registers an `online` listener. Those
 * listeners accumulate on the shared jsdom `window` across `vi.resetModules()`
 * imports, so dispatching `online` would fire every previous test's flush too
 * and the request count would be meaningless. Driving the import-time flush
 * instead gives exactly one flush per test.
 */
async function replayQueue() {
  vi.stubGlobal('navigator', { ...window.navigator, onLine: true })
  await import('./httpPFTClient')
  await vi.waitFor(() => expect(request).toHaveBeenCalled())
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('offline replay queue', () => {
  beforeEach(async () => {
    vi.resetModules()
    request.mockReset()
    toastError.mockReset()
    toastSuccess.mockReset()
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('drains the whole queue when every replay succeeds', async () => {
    localStorage.setItem(QUEUE_KEY, JSON.stringify([queued('a'), queued('b'), queued('c')]))
    request.mockResolvedValue({ data: {} })

    await replayQueue()

    expect(request).toHaveBeenCalledTimes(3)
    expect(storedIds()).toEqual([])
    expect(toastSuccess).toHaveBeenCalledWith('Offline changes synced')
  })

  it('keeps the untried remainder when a replay hits a transient failure', async () => {
    // The regression: `a` succeeds, `b` fails on a network error, and `c` had
    // never been attempted. Before the fix, `c` was erased from storage.
    localStorage.setItem(QUEUE_KEY, JSON.stringify([queued('a'), queued('b'), queued('c')]))
    request
      .mockResolvedValueOnce({ data: {} })
      .mockRejectedValue({ errorMessage: 'Network Error' })

    await replayQueue()

    // Stops at the failure rather than replaying out of order...
    expect(request).toHaveBeenCalledTimes(2)
    // ...and both the failed item and the untried one survive, in order.
    expect(storedIds()).toEqual(['b', 'c'])
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it('skips past something the server will never accept', async () => {
    // A 400 will fail identically forever. Left at the head of the queue it
    // would block every later change from ever being replayed.
    localStorage.setItem(QUEUE_KEY, JSON.stringify([queued('a'), queued('b'), queued('c')]))
    request
      .mockResolvedValueOnce({ data: {} })
      .mockRejectedValueOnce({ errorMessage: 'Bad Request', status: 400 })
      .mockResolvedValue({ data: {} })

    await replayQueue()

    expect(request).toHaveBeenCalledTimes(3)
    expect(storedIds()).toEqual([])
    // Dropped, but not silently.
    expect(toastError).toHaveBeenCalledWith(
      'One offline change was rejected by the server and could not be applied.',
    )
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it('treats a 429 as transient, not as a rejection', async () => {
    localStorage.setItem(QUEUE_KEY, JSON.stringify([queued('a'), queued('b')]))
    request.mockRejectedValue({ errorMessage: 'Too many requests', status: 429 })

    await replayQueue()

    expect(request).toHaveBeenCalledTimes(1)
    expect(storedIds()).toEqual(['a', 'b'])
    expect(toastError).not.toHaveBeenCalled()
  })
})
