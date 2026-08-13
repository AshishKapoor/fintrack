import { beforeEach, describe, expect, it, vi } from 'vitest'

// PFT_BASE_URL is derived from window.location at import time; stub the module
// so these tests exercise the cookie handling rather than the axios instance.
vi.mock('@/client/httpPFTClient', () => ({ PFT_BASE_URL: 'http://localhost:8000' }))

const importAuth = async () => {
  vi.resetModules()
  return import('./auth')
}

/** A JWT is only decoded, never verified, on the client. */
function makeToken(expSecondsFromNow: number) {
  const payload = { exp: Math.floor(Date.now() / 1000) + expSecondsFromNow, user_id: 7 }
  return `header.${btoa(JSON.stringify(payload))}.signature`
}

describe('token cookies', () => {
  beforeEach(() => {
    document.cookie.split('; ').forEach((entry) => {
      const name = entry.split('=')[0]
      if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`
    })
  })

  it('stores and reads back the access and refresh tokens', async () => {
    const auth = await importAuth()
    const access = makeToken(300)

    auth.setTokens(access, 'refresh-token')

    expect(auth.getAccessToken()).toBe(access)
    expect(auth.getRefreshToken()).toBe('refresh-token')
  })

  it('sets SameSite=Strict on the cookies it writes', async () => {
    // Regression: cookies were written with only `path=/`, so they were sent on
    // cross-site requests.
    const auth = await importAuth()
    const setter = vi.spyOn(document, 'cookie', 'set')

    auth.setTokens(makeToken(300), 'refresh-token')

    expect(setter).toHaveBeenCalled()
    for (const call of setter.mock.calls) {
      expect(String(call[0])).toContain('SameSite=Strict')
    }
    setter.mockRestore()
  })

  it('does not mark cookies Secure over plain HTTP', async () => {
    // jsdom serves http://localhost, where a Secure cookie would be dropped
    // and the user could never sign in on a LAN install.
    const auth = await importAuth()
    const setter = vi.spyOn(document, 'cookie', 'set')

    auth.setTokens(makeToken(300), 'refresh-token')

    for (const call of setter.mock.calls) {
      expect(String(call[0])).not.toContain('Secure')
    }
    setter.mockRestore()
  })

  it('reports an unexpired token as valid', async () => {
    const auth = await importAuth()
    auth.setTokens(makeToken(600), 'refresh-token')

    expect(auth.isTokenExpired()).toBe(false)
  })

  it('reports an expired token as expired', async () => {
    const auth = await importAuth()
    auth.setTokens(makeToken(-600), 'refresh-token')

    expect(auth.isTokenExpired()).toBe(true)
  })

  it('treats a bare refresh token as still logged in', async () => {
    const auth = await importAuth()
    auth.setTokens(makeToken(-600), 'refresh-token')

    expect(auth.isLoggedIn()).toBe(true)
  })

  it('is logged out once the tokens are removed', async () => {
    const auth = await importAuth()
    auth.setTokens(makeToken(600), 'refresh-token')

    auth.removeTokens()

    expect(auth.isLoggedIn()).toBe(false)
    expect(auth.getAccessToken()).toBeNull()
  })

  it('reads the user id out of the access token', async () => {
    const auth = await importAuth()
    auth.setTokens(makeToken(600), 'refresh-token')

    await expect(auth.getUserId()).resolves.toBe(7)
  })
})
