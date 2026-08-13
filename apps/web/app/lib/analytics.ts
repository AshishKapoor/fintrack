/**
 * Optional, self-hosted-friendly analytics.
 *
 * Nothing is loaded unless BOTH VITE_UMAMI_SCRIPT_URL and VITE_UMAMI_WEBSITE_ID
 * are set at build time. A default self-hosted build therefore sends no data to
 * anyone - which is what "privacy-first" has to mean.
 */
export function initAnalytics() {
  const scriptUrl = import.meta.env.VITE_UMAMI_SCRIPT_URL
  const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID

  if (!scriptUrl || !websiteId) return

  const script = document.createElement('script')
  script.defer = true
  script.src = scriptUrl
  script.setAttribute('data-website-id', websiteId)
  document.head.appendChild(script)
}
