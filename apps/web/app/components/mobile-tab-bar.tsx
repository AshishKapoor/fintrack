import { cn } from '@/lib/utils'
import { CreditCard, Home, Landmark, PieChart, Plus, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'

/**
 * The phone's bottom bar: the four places a household goes daily, with
 * logging an expense - the habit the whole app depends on - in the middle,
 * where a thumb already rests. Everything else stays in the menu drawer.
 */
export function MobileTabBar() {
  const { t } = useTranslation()
  const { pathname } = useLocation()

  const tabs: { to: string; icon: LucideIcon; label: string; match: string[] }[] = [
    { to: '/', icon: Home, label: t('nav.home'), match: ['/', '/home'] },
    { to: '/transactions', icon: CreditCard, label: t('nav.spending'), match: ['/transactions'] },
    { to: '/budgets', icon: PieChart, label: t('nav.plan'), match: ['/budgets', '/savings-goals', '/rules'] },
    { to: '/accounts', icon: Landmark, label: t('nav.accounts'), match: ['/accounts'] },
  ]

  const renderTab = ({ to, icon: Icon, label, match }: (typeof tabs)[number]) => {
    const active = match.includes(pathname)
    return (
      <Link
        key={to}
        to={to}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-md text-xs font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
          active ? 'text-primary' : 'text-muted-foreground',
        )}
      >
        <Icon className='h-5 w-5' aria-hidden='true' />
        {label}
      </Link>
    )
  }

  return (
    <nav
      aria-label={t('nav.label')}
      className='flex shrink-0 items-stretch gap-1 border-t bg-background px-2 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] md:hidden'
    >
      {tabs.slice(0, 2).map(renderTab)}
      <div className='flex flex-1 items-center justify-center'>
        <Link
          to='/quick-add'
          aria-label={t('nav.quickAdd')}
          className='flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:translate-y-px'
        >
          <Plus className='h-6 w-6' aria-hidden='true' />
        </Link>
      </div>
      {tabs.slice(2).map(renderTab)}
    </nav>
  )
}
