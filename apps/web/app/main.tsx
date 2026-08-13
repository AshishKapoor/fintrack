import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app.tsx'
import { BrowserRouter } from 'react-router-dom'
import { SWRConfig } from 'swr'
import { CurrencyProvider } from './context/currency-context'
import { OrganizationProvider } from './context/organization-context'
import { initAnalytics } from './lib/analytics'

initAnalytics()

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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Keep startup resilient even when SW registration fails.
    })
  })
}
