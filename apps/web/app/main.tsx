import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app.tsx'
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
    </StrictMode>,
  )
}

void bootstrap()

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Keep startup resilient even when SW registration fails.
    })
  })
}
