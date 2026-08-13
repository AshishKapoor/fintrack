import '@/assets/styles/globals.css'
import DashboardLayout from '@/components/dashboard-layout'
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
const TransactionsPage = lazy(() => import('@/pages/transactions'))
const ReportsPage = lazy(() => import('@/pages/reports'))
const RulesAndRecurringPage = lazy(() => import('@/pages/rules'))
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
      {location.pathname !== '/register' && location.pathname !== '/login' && (
        <DashboardLayout>
          <Suspense fallback={<AnimateSpinner size={64} />}>
            <Routes>
            <Route path='/' element={<DashboardPage />} />
            <Route path='/categories' element={<CategoriesPage />} />
            <Route path='/budgets' element={<BudgetsPage />} />
            <Route path='/transactions' element={<TransactionsPage />} />
            <Route path='/reports' element={<ReportsPage />} />
            <Route path='/rules' element={<RulesAndRecurringPage />} />
            <Route path='/home' element={<DashboardPage />} />
            <Route path='/settings' element={<UserSettingsPage />} />
            <Route path='*' element={<NotFound />} />
            </Routes>
          </Suspense>
        </DashboardLayout>
      )}
      {location.pathname === '/register' && (
        <div className='flex items-center justify-center h-screen bg-background'>
          <Suspense fallback={<AnimateSpinner size={64} />}>
            <AuthenticationPage />
          </Suspense>
        </div>
      )}
      {location.pathname === '/login' && (
        <div className='flex items-center justify-center h-screen bg-background'>
          <Suspense fallback={<AnimateSpinner size={64} />}>
            <LoginPage />
          </Suspense>
        </div>
      )}
      <Toaster />
      {/* Most of the app notifies through sonner; without this mount those
          toasts - including every API error - render nothing. */}
      <SonnerToaster />
    </ThemeProvider>
  )
}

export default App
