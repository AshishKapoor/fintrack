import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// PFT_BASE_URL is derived from window.location at import time; stub the module
// so these tests exercise the auth module in isolation from the axios instance.
vi.mock('@/client/httpPFTClient', () => ({ PFT_BASE_URL: 'http://localhost:8000' }))

const importAuth = async () => {
  vi.resetModules()
  return import('./auth')
}

/** A JWT is only decoded, never verified, on the client. */
function makeToken(expSecondsFromNow: number, userId = 7) {
  const payload = { exp: Math.floor(Date.now() / 1000) + expSecondsFromNow, user_id: userId }
  return `header.${btoa(JSON.stringify(payload))}.signature`
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

describe('in-memory access token', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('stores and reads back the access token', async () => {
    const auth = await importAuth()
    const access = makeToken(300)

    auth.setTokens(access)

    expect(auth.getAccessToken()).toBe(access)
  })

  it('never writes the access token to a cookie', async () => {
    // The whole point of this design: an XSS payload reading document.cookie
    // must not find a usable token there.
    const auth = await importAuth()
    const access = makeToken(300)

    auth.setTokens(access)

    expect(document.cookie).not.toContain(access)
    expect(document.cookie).toBe('')
  })

  it('reports an unexpired token as valid', async () => {
    const auth = await importAuth()
    auth.setTokens(makeToken(600))

    expect(auth.isTokenExpired()).toBe(false)
  })

  it('reports an expired token as expired', async () => {
    const auth = await importAuth()
    auth.setTokens(makeToken(-600))

    expect(auth.isTokenExpired()).toBe(true)
  })

  it('is logged in once a token is set, and logged out once removed', async () => {
    const auth = await importAuth()
    expect(auth.isLoggedIn()).toBe(false)

    auth.setTokens(makeToken(600))
    expect(auth.isLoggedIn()).toBe(true)

    auth.removeTokens()
    expect(auth.isLoggedIn()).toBe(false)
    expect(auth.getAccessToken()).toBeNull()
  })

  it('reads the user id out of the access token', async () => {
    const auth = await importAuth()
    auth.setTokens(makeToken(600, 42))

    await expect(auth.getUserId()).resolves.toBe(42)
  })
})

describe('login', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends credentials and the cookie opt-in header, and stores only the access token', async () => {
    const auth = await importAuth()
    const access = makeToken(300)
    // The server omits `refresh` from the body once it has honored the
    // cookie header - the frontend must not depend on it being present.
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ access }))

    await auth.login('demo@fintrack.local', 'hunter2')

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/token/',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: expect.objectContaining({ 'X-Use-Refresh-Cookie': '1' }),
      }),
    )
    expect(auth.getAccessToken()).toBe(access)
    expect(auth.isLoggedIn()).toBe(true)
    // No refresh token ever exists for page JS to find, in memory or cookie.
    expect(document.cookie).toBe('')
  })

  it('raises LoginError("invalid") on bad credentials', async () => {
    const auth = await importAuth()
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 401 }))

    await expect(auth.login('demo@fintrack.local', 'wrong')).rejects.toMatchObject({
      name: 'LoginError',
      kind: 'invalid',
    })
    expect(auth.isLoggedIn()).toBe(false)
  })

  it('raises LoginError("network") when the request throws', async () => {
    const auth = await importAuth()
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await expect(auth.login('demo@fintrack.local', 'hunter2')).rejects.toMatchObject({
      name: 'LoginError',
      kind: 'network',
    })
  })
})

describe('refreshAccessToken / initAuth', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('refreshes via the HttpOnly cookie with no body token to send', async () => {
    const auth = await importAuth()
    const access = makeToken(300)
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ access }))

    const token = await auth.refreshAccessToken()

    expect(token).toBe(access)
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/token/refresh/',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: expect.objectContaining({ 'X-Use-Refresh-Cookie': '1' }),
      }),
    )
    expect(auth.getAccessToken()).toBe(access)
  })

  it('initAuth() rehydrates a session that exists only as a refresh cookie', async () => {
    // Simulates a hard reload: memory is empty, but the browser still holds
    // the HttpOnly cookie, so the silent refresh succeeds.
    const auth = await importAuth()
    const access = makeToken(300)
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ access }))

    expect(auth.isLoggedIn()).toBe(false)
    const result = await auth.initAuth()

    expect(result).toBe(true)
    expect(auth.isLoggedIn()).toBe(true)
    expect(auth.getAccessToken()).toBe(access)
  })

  it('initAuth() resolves false, quietly, for an anonymous visitor', async () => {
    const auth = await importAuth()
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 401 }))

    await expect(auth.initAuth()).resolves.toBe(false)
    expect(auth.isLoggedIn()).toBe(false)
    // Quiet means no follow-up call to /api/token/logout/.
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('initAuth() only ever runs the check once', async () => {
    const auth = await importAuth()
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 401 }))

    await auth.initAuth()
    await auth.initAuth()

    expect(fetch).toHaveBeenCalledTimes(1)
  })
})

describe('logout', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('clears the in-memory token and notifies the server', async () => {
    const auth = await importAuth()
    auth.setTokens(makeToken(300))

    await auth.logout()

    expect(auth.isLoggedIn()).toBe(false)
    expect(auth.getAccessToken()).toBeNull()
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/token/logout/',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: expect.objectContaining({
          'X-Use-Refresh-Cookie': '1',
          Authorization: expect.stringContaining('Bearer '),
        }),
      }),
    )
  })

  it('still clears local state even if the server is unreachable', async () => {
    const auth = await importAuth()
    auth.setTokens(makeToken(300))
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await auth.logout()

    expect(auth.isLoggedIn()).toBe(false)
  })
})
