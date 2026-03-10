import '@/assets/styles/globals.css'
import DashboardLayout from '@/components/dashboard-layout'
import { ThemeProvider } from '@/components/theme-provider'
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
import { Route, Routes, useLocation } from 'react-router-dom'

function App() {
  const location = useLocation()
  const isAuthenticated = isLoggedIn()
  const redirectToLogin = !isAuthenticated && location.pathname !== '/login' && location.pathname !== '/register'

  if (redirectToLogin) {
    window.location.href = '/login'
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
    </ThemeProvider>
  )
}

export default App
