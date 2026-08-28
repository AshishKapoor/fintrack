import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app.tsx'
import { ErrorBoundary } from './components/error-boundary'
import { BrowserRouter } from 'react-router-dom'
import { SWRConfig } from 'swr'
import { CurrencyProvider } from './context/currency-context'
import { OrganizationProvider } from './context/organization-context'
import { i18nReady } from './i18n'
import { initAnalytics } from './lib/analytics'
import { initAuth } from './lib/auth'

initAnalytics()

// The access token lives in memory only (see lib/auth.ts), so every hard
// reload starts with none - initAuth() spends one silent request against the
// HttpOnly refresh cookie to find out whether there is actually a session
// before anything in the tree (including the route guard in App and the
// providers below, both of which read isLoggedIn() synchronously) renders.
// i18nReady resolves once the detected language's catalog has loaded, so
// nav chrome (sidebar, top bar) never needs a Suspense boundary of its own.
async function bootstrap() {
  await Promise.all([initAuth(), i18nReady])

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <SWRConfig
            value={{
              revalidateOnFocus: false,
              refreshInterval: 0,
              revalidateIfStale: false,
              revalidateOnReconnect: false,
              revalidateOnMount: undefined,
            }}
          >
            <OrganizationProvider>
              <CurrencyProvider>
                <App />
              </CurrencyProvider>
            </OrganizationProvider>
          </SWRConfig>
        </BrowserRouter>
      </ErrorBoundary>
    </StrictMode>,
  )
}

// If bootstrap() rejects, render() never runs and #root stays empty forever -
// a blank page with nothing in the DOM to explain it. initAuth() swallows its
// own errors today, but i18nReady is an i18next.init() promise that can reject,
// and "the guard is free" is the whole argument here.
void bootstrap().catch((error) => {
  console.error('FinTrack failed to start:', error)
  const root = document.getElementById('root')
  if (root) {
    root.innerHTML = `
      <div role="alert" style="font-family:system-ui,sans-serif;padding:2rem;text-align:center">
        <h1 style="font-size:1.5rem;margin-bottom:.5rem">FinTrack failed to start</h1>
        <p style="opacity:.75">Reloading usually clears it. If not, check the browser console and the API logs.</p>
        <button onclick="window.location.reload()" style="margin-top:1rem;padding:.5rem 1rem;cursor:pointer">Reload</button>
      </div>`
  }
})

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Keep startup resilient even when SW registration fails.
    })
  })
}
