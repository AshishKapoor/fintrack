import { PFT_BASE_URL } from '@/client/httpPFTClient'

/**
 * Whether this instance is the public, read-only demo (see
 * docker-compose.demo.yml and pft/demo_mode.py on the backend).
 *
 * Piggybacks on /healthz/ rather than a dedicated endpoint: it is already
 * unauthenticated and already the first thing loaded, so an anonymous
 * visitor - including one still on /login - gets the banner without an
 * extra round trip.
 */
export interface DemoStatus {
  demo: boolean
  demoEmail?: string
}

export async function fetchDemoStatus(): Promise<DemoStatus> {
  try {
    const response = await fetch(`${PFT_BASE_URL}/healthz/`)
    if (!response.ok) return { demo: false }
    const data = await response.json()
    return { demo: Boolean(data.demo), demoEmail: data.demo_email || undefined }
  } catch {
    // A demo banner is not worth failing the app over.
    return { demo: false }
  }
}
