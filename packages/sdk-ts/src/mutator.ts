/**
 * The transport every generated operation goes through.
 *
 * Framework-free by design: plain fetch, a base URL, and a token provider.
 * Call `configure` once; pass an `getAccessToken` that returns your current
 * JWT (or null for anonymous endpoints such as registration and login).
 */

export interface FintrackConfig {
  baseUrl: string
  getAccessToken?: () => string | null | Promise<string | null>
  fetch?: typeof fetch
}

let config: FintrackConfig = { baseUrl: '' }

export function configure(next: FintrackConfig): void {
  config = next
}

export class FintrackApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message?: string,
  ) {
    super(message ?? `FinTrack API error ${status}`)
    this.name = 'FintrackApiError'
  }
}

export async function fintrackFetch<T>(url: string, init?: RequestInit): Promise<T> {
  if (!config.baseUrl) {
    throw new Error('Call configure({ baseUrl }) before using the FinTrack SDK.')
  }

  const token = await config.getAccessToken?.()
  const headers = new Headers(init?.headers)
  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const doFetch = config.fetch ?? fetch
  const response = await doFetch(`${config.baseUrl}${url}`, { ...init, headers })

  const text = await response.text()
  const body: unknown = text ? JSON.parse(text) : undefined

  if (!response.ok) {
    throw new FintrackApiError(response.status, body)
  }
  return body as T
}

export default fintrackFetch
