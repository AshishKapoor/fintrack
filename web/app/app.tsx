import '@/assets/styles/globals.css'
import DashboardLayout from '@/components/dashboard-layout'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster as SonnerToaster } from '@/components/ui/sonner'
import { Toaster } from '@/components/ui/toaster'
import { isLoggedIn } from '@/lib/auth'
import AuthenticationPage from '@/pages/authentication'
import BudgetsPage from '@/pages/budget'
import CategoriesPage from '@/pages/category'
import DashboardPage from '@/pages/dashboard'
import { LoginPage } from '@/pages/login'
import NotFound from '@/pages/not-found'
import ReportsPage from '@/pages/reports'
import RulesAndRecurringPage from '@/pages/rules'
import UserSettingsPage from '@/pages/settings'
import TransactionsPage from '@/pages/transactions'
import { useEffect } from 'react'
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
        </DashboardLayout>
      )}
      {location.pathname === '/register' && (
        <div className='flex items-center justify-center h-screen bg-background'>
          <AuthenticationPage />
        </div>
      )}
      {location.pathname === '/login' && (
        <div className='flex items-center justify-center h-screen bg-background'>
          <LoginPage />
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
