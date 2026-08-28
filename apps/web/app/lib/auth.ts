import { PFT_BASE_URL } from '@/client/httpPFTClient'

// Auth tokens, and the security model behind how they're stored:
//
// - The access token lives in memory only (a module-level variable below).
//   It is never written to a cookie or localStorage, so page JavaScript - and
//   therefore an XSS payload - never has a persistent copy to steal. A hard
//   reload always starts with an empty in-memory token; initAuth() below
//   re-derives one from the refresh cookie before the app renders.
// - The refresh token is an HttpOnly cookie set by the backend (opted into
//   via the `X-Use-Refresh-Cookie` header on every call to /api/token/*).
//   Being HttpOnly, page JavaScript cannot read or write it either - only the
//   browser attaches it, automatically, to those endpoints.
//
// See SECURITY.md and ARCHITECTURE.md for the full threat model.

const REFRESH_COOKIE_HEADER = { 'X-Use-Refresh-Cookie': '1' }

let authToken: string | null = null
let tokenExpiry: number | null = null
let authenticated = false
let authInitialized = false

let isRefreshing = false
let refreshSubscribers: ((token: string | null) => void)[] = []

function decodeExpiry(accessToken: string): number {
  const payload = JSON.parse(atob(accessToken.split('.')[1]))
  return payload.exp * 1000 // seconds -> milliseconds
}

/** Store a freshly issued access token in memory. Never touches a cookie. */
export function setTokens(access: string) {
  authToken = access
  tokenExpiry = decodeExpiry(access)
  authenticated = true
}

export function getAccessToken(): string | null {
  return authToken
}

export function getTokenExpiry(): number | null {
  return tokenExpiry
}

export function isTokenExpired(): boolean {
  if (!tokenExpiry) return true
  // Consider the token expired 1 minute before actual expiration.
  return Date.now() >= tokenExpiry - 60000
}

export function removeTokens() {
  authToken = null
  tokenExpiry = null
  authenticated = false
}

export type LoginErrorKind = 'invalid' | 'server' | 'network'

export class LoginError extends Error {
  kind: LoginErrorKind

  constructor(kind: LoginErrorKind, message: string) {
    super(message)
    this.name = 'LoginError'
    this.kind = kind
  }
}

export async function login(email: string, password: string) {
  let response: Response
  try {
    response = await fetch(`${PFT_BASE_URL}/api/token/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...REFRESH_COOKIE_HEADER },
      body: JSON.stringify({ email, password }),
    })
  } catch {
    // fetch itself only throws on network-level failures (server down, DNS,
    // CORS/CSP blocked) - never on HTTP error statuses.
    throw new LoginError('network', 'Could not reach the server')
  }
  if (response.status === 400 || response.status === 401) {
    throw new LoginError('invalid', 'Invalid credentials')
  }
  if (!response.ok) {
    throw new LoginError('server', `Server error (${response.status})`)
  }
  const data = await response.json()
  // The server omits `refresh` from this body when it honors the cookie
  // header above (it always does, for every supported browser) - only
  // `access` ever reaches page JavaScript.
  setTokens(data.access)
  return data
}

export async function refreshAccessToken(): Promise<string | null> {
  // Prevent multiple simultaneous refresh requests.
  if (isRefreshing) {
    return new Promise((resolve) => {
      refreshSubscribers.push(resolve)
    })
  }

  isRefreshing = true

  try {
    const response = await fetch(`${PFT_BASE_URL}/api/token/refresh/`, {
      method: 'POST',
      credentials: 'include', // sends the HttpOnly pft_refresh cookie
      headers: { 'Content-Type': 'application/json', ...REFRESH_COOKIE_HEADER },
      body: JSON.stringify({}),
    })

    if (!response.ok) {
      throw new Error('Failed to refresh access token')
    }

    const data = await response.json()
    setTokens(data.access)

    refreshSubscribers.forEach((callback) => callback(data.access))
    refreshSubscribers = []

    return data.access
  } catch (error) {
    refreshSubscribers.forEach((callback) => callback(null))
    refreshSubscribers = []
    throw error
  } finally {
    isRefreshing = false
  }
}

/**
 * Try to rehydrate a session from the HttpOnly refresh cookie on page load.
 *
 * Quiet by design: an anonymous visitor's very first paint makes this call
 * and gets a 401, which is expected and not worth a toast or a logout()
 * round trip - the app's route guard sends them to /login regardless. Call
 * this once, before the app renders (see main.tsx); isLoggedIn() reports
 * whatever it resolves to until the next login()/logout()/refresh.
 */
export async function initAuth(): Promise<boolean> {
  if (!authInitialized) {
    try {
      await refreshAccessToken()
    } catch {
      removeTokens()
    }
    authInitialized = true
  }
  return authenticated
}

export async function logout() {
  // Tell the server to blacklist the refresh token. Clearing local state
  // alone only forgets it here - the token stays valid until it expires.
  try {
    await fetch(`${PFT_BASE_URL}/api/token/logout/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...REFRESH_COOKIE_HEADER,
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({}),
    })
  } catch {
    // Signing out locally must succeed even if the server is unreachable.
  }

  removeTokens()
  authInitialized = true // definitively known: signed out

  // Guard against a reload loop: if a request from the login page itself
  // fails to refresh, redirecting to /login again would restart the same
  // request.
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

export function isLoggedIn(): boolean {
  return authenticated
}

export async function getAuthToken(): Promise<string | null> {
  if (authToken && !isTokenExpired()) {
    return authToken
  }

  try {
    return await refreshAccessToken()
  } catch {
    await logout()
    return null
  }
}

/** Update the in-memory access token without touching the refresh cookie. */
export function setAuthToken(token: string) {
  authToken = token
  tokenExpiry = decodeExpiry(token)
  authenticated = true
}

export async function getUser() {
  try {
    const token = await getAuthToken()
    if (!token) {
      throw new Error('No authentication token available')
    }

    const response = await fetch(`${PFT_BASE_URL}/api/v1/me/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData?.detail || 'Failed to fetch user data')
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching user:', error)
    throw error
  }
}

export async function getUserId() {
  const accessToken = await getAuthToken()
  if (accessToken) {
    const payload = JSON.parse(atob(accessToken.split('.')[1]))
    return payload.user_id
  }
  return null
}

/**
 * Pull the human-readable reason out of a DRF error body.
 *
 * DRF reports failed validation as `{field: ["reason", ...]}`; only throttling
 * and plain action errors use `{detail: "reason"}`. Reading `detail` alone -
 * which register() used to do - collapsed every actionable reason ("An account
 * with this email already exists", "Password must be at least 8 characters
 * long") into an opaque "Registration failed" with nothing to act on. The
 * axios client's 400 handler (httpPFTClient.ts) already reads both shapes;
 * the raw fetch() callers in this module need their own copy.
 */
function firstErrorMessage(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined
  const data = body as Record<string, unknown>
  if (typeof data.detail === 'string') return data.detail
  for (const value of Object.values(data)) {
    if (typeof value === 'string') return value
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  }
  return undefined
}

export type RegisterErrorKind = 'rejected' | 'server' | 'network'

/**
 * Why a signup failed, in the shape the form can localize.
 *
 * Mirrors LoginError above: `kind` picks the translated string, so nothing
 * here leaks untranslated English onto the page. The exception is `rejected`,
 * whose `message` is the server's own reason - Django runs it through gettext
 * (LocaleMiddleware honours Accept-Language), so it arrives already in the
 * user's language and is far more specific than anything the client knows.
 */
export class RegisterError extends Error {
  kind: RegisterErrorKind
  status?: number

  constructor(kind: RegisterErrorKind, message: string, status?: number) {
    super(message)
    this.name = 'RegisterError'
    this.kind = kind
    this.status = status
  }
}

export async function register(email: string, password: string) {
  let response: Response
  try {
    response = await fetch(`${PFT_BASE_URL}/api/v1/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: email, email, password, confirm_password: password }),
    })
  } catch {
    // fetch only throws on network-level failures - an API that never came up,
    // or a build carrying a VITE_BASE_DOMAIN that does not resolve from the
    // browser - never on an HTTP error status.
    throw new RegisterError('network', 'Could not reach the server')
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    const reason = firstErrorMessage(errorData)
    if (reason) {
      throw new RegisterError('rejected', reason, response.status)
    }
    // No quotable reason means the request never reached DRF (an nginx 502, or
    // Django's own 400 DisallowedHost page). The status is the only lead left,
    // and the form appends it to the translated message.
    throw new RegisterError('server', `Server error (${response.status})`, response.status)
  }
  return await response.json()
}
