import '@/assets/styles/globals.css'
import DashboardLayout from '@/components/dashboard-layout'
import { DemoBanner } from '@/components/demo-banner'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster as SonnerToaster } from '@/components/ui/sonner'
import { Toaster } from '@/components/ui/toaster'
import { isLoggedIn } from '@/lib/auth'
import { AnimateSpinner } from '@/components/spinner'
import { Suspense, lazy, useEffect } from 'react'

// Every page is its own chunk, so the initial route does not pay for recharts
// or pages the user never visits. See the performance budget in CONTRIBUTING.
const DashboardPage = lazy(() => import('@/pages/dashboard'))
const CategoriesPage = lazy(() => import('@/pages/category'))
const BudgetsPage = lazy(() => import('@/pages/budget'))
const AccountsPage = lazy(() => import('@/pages/accounts'))
const SavingsGoalsPage = lazy(() => import('@/pages/savings-goals'))
const TransactionsPage = lazy(() => import('@/pages/transactions'))
const QuickAddPage = lazy(() => import('@/pages/quick-add'))
const ReportsPage = lazy(() => import('@/pages/reports'))
const InsightsPage = lazy(() => import('@/pages/insights'))
const RulesAndRecurringPage = lazy(() => import('@/pages/rules'))
const AuditLogPage = lazy(() => import('@/pages/audit-log'))
const BankSyncCallbackPage = lazy(() => import('@/pages/bank-sync-callback'))
const UserSettingsPage = lazy(() => import('@/pages/settings'))
const NotFound = lazy(() => import('@/pages/not-found'))
const AuthenticationPage = lazy(() => import('@/pages/authentication'))
const LoginPage = lazy(() =>
  import('@/pages/login').then((module) => ({ default: module.LoginPage })),
)
import { Route, Routes, useLocation } from 'react-router-dom'

function App() {
  const location = useLocation()
  const isAuthenticated = isLoggedIn()
  const redirectToLogin = !isAuthenticated && location.pathname !== '/login' && location.pathname !== '/register'

  // Redirecting is a side effect; doing it during render both violates React's
  // rules and can fire twice under StrictMode.
  useEffect(() => {
    if (redirectToLogin) {
      window.location.href = '/login'
    }
  }, [redirectToLogin])

  if (redirectToLogin) {
    return null
  }

  return (
    <ThemeProvider defaultTheme='light' storageKey='vite-ui-theme'>
      {/* flex-col + h-full below (rather than each branch owning its own
          h-screen) is what lets DemoBanner take real space at the top -
          demo instances only - without any of these three layouts
          overflowing the viewport by however tall the banner is. */}
      <div className='flex h-screen flex-col'>
        <DemoBanner />
        <div className='min-h-0 flex-1'>
          {location.pathname !== '/register' && location.pathname !== '/login' && (
            <DashboardLayout>
              <Suspense fallback={<AnimateSpinner size={64} />}>
                <Routes>
                <Route path='/' element={<DashboardPage />} />
                <Route path='/categories' element={<CategoriesPage />} />
                <Route path='/budgets' element={<BudgetsPage />} />
                <Route path='/accounts' element={<AccountsPage />} />
                <Route path='/savings-goals' element={<SavingsGoalsPage />} />
                <Route path='/transactions' element={<TransactionsPage />} />
                <Route path='/quick-add' element={<QuickAddPage />} />
                <Route path='/reports' element={<ReportsPage />} />
                <Route path='/insights' element={<InsightsPage />} />
                <Route path='/rules' element={<RulesAndRecurringPage />} />
                <Route path='/audit-log' element={<AuditLogPage />} />
                <Route path='/bank-sync/callback' element={<BankSyncCallbackPage />} />
                <Route path='/home' element={<DashboardPage />} />
                <Route path='/settings' element={<UserSettingsPage />} />
                <Route path='*' element={<NotFound />} />
                </Routes>
              </Suspense>
            </DashboardLayout>
          )}
          {location.pathname === '/register' && (
            <div className='flex h-full items-center justify-center bg-background'>
              <Suspense fallback={<AnimateSpinner size={64} />}>
                <AuthenticationPage />
              </Suspense>
            </div>
          )}
          {location.pathname === '/login' && (
            <div className='flex h-full items-center justify-center bg-background'>
              <Suspense fallback={<AnimateSpinner size={64} />}>
                <LoginPage />
              </Suspense>
            </div>
          )}
        </div>
      </div>
      <Toaster />
      {/* Most of the app notifies through sonner; without this mount those
          toasts - including every API error - render nothing. */}
      <SonnerToaster />
    </ThemeProvider>
  )
}

export default App
