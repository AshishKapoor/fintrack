'use client'

import { PreferenceControls } from '@/components/preference-controls'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useOrganization } from '@/context/organization-context'
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  History,
  Home,
  Landmark,
  LineChart,
  type LucideIcon,
  PieChart,
  PiggyBank,
  Plus,
  RefreshCw,
  Settings,
  Tag,
  TrendingUp,
  Upload,
  Wand2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'

interface NavItem {
  to: string
  icon: LucideIcon
  label: string
}

interface NavSection {
  heading?: string
  /** Set-up chores: separated and visually quieter than the daily sections. */
  quiet?: boolean
  items: NavItem[]
}

interface SidebarProps {
  expanded: boolean
  toggleSidebar: () => void
  isMobile: boolean
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function Sidebar({ expanded, toggleSidebar, isMobile, isOpen, onOpenChange }: SidebarProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const { activeOrg } = useOrganization()
  // Same gate as the audit log page itself (see pages/audit-log/index.tsx) -
  // hiding the link for everyone else avoids a "why is this empty" surprise,
  // since the API silently returns nothing to a non-manager rather than 403.
  const canManageAuditLog =
    activeOrg && !activeOrg.personal && (activeOrg.my_role === 'owner' || activeOrg.my_role === 'admin')

  // Household sections, not a list of database objects: what you do daily
  // first, set-up chores last. Every destination is an existing URL.
  const sections: NavSection[] = [
    { items: [{ to: '/', icon: Home, label: t('nav.home') }] },
    {
      heading: t('nav.spending'),
      items: [
        { to: '/transactions', icon: CreditCard, label: t('nav.transactions') },
        { to: '/quick-add', icon: Plus, label: t('nav.quickAdd') },
      ],
    },
    {
      heading: t('nav.plan'),
      items: [
        { to: '/budgets', icon: PieChart, label: t('nav.budgets') },
        { to: '/savings-goals', icon: PiggyBank, label: t('nav.savingsGoals') },
        { to: '/rules?tab=recurring', icon: CalendarClock, label: t('nav.bills') },
      ],
    },
    { items: [{ to: '/accounts', icon: Landmark, label: t('nav.accounts') }] },
    {
      heading: t('nav.reportsSection'),
      items: [
        { to: '/reports', icon: TrendingUp, label: t('nav.reports') },
        { to: '/insights', icon: LineChart, label: t('nav.insights') },
      ],
    },
    {
      heading: t('nav.setup'),
      quiet: true,
      items: [
        { to: '/categories', icon: Tag, label: t('nav.categories') },
        { to: '/rules?tab=rules', icon: Wand2, label: t('nav.rules') },
        { to: '/transactions?import=1', icon: Upload, label: t('nav.import') },
        { to: '/accounts?tab=bank-sync', icon: RefreshCw, label: t('nav.bankSync') },
        { to: '/settings', icon: Settings, label: t('nav.settings') },
        ...(canManageAuditLog ? [{ to: '/audit-log', icon: History, label: t('nav.auditLog') }] : []),
      ],
    },
  ]

  const isActive = (to: string) => {
    const [path, query] = to.split('?')
    if (path === '/') return location.pathname === '/' || location.pathname === '/home'
    if (location.pathname !== path) return false
    const wantedTab = new URLSearchParams(query).get('tab')
    // Without ?tab, each page opens on its default tab: Rules on /rules, the
    // account list on /accounts.
    const currentTab = new URLSearchParams(location.search).get('tab')
    if (wantedTab) return (currentTab ?? (path === '/rules' ? 'rules' : 'accounts')) === wantedTab
    // A ?import=1 link is an action, never "the current page".
    return !query && !(path === '/accounts' && currentTab === 'bank-sync')
  }

  const renderLink = ({ to, icon: Icon, label }: NavItem) => {
    const active = isActive(to)
    return (
      <Link
        key={to}
        to={to}
        aria-current={active ? 'page' : undefined}
        className={`flex items-center rounded-md px-3 py-2 pointer-coarse:py-3 text-sm font-medium ${
          active ? 'bg-muted text-foreground' : 'text-foreground/90 hover:bg-muted'
        } ${expanded || isMobile ? 'gap-3' : 'justify-center'}`}
        onClick={() => isMobile && onOpenChange(false)}
        title={expanded || isMobile ? undefined : label}
      >
        <Icon className='h-4 w-4 shrink-0' aria-hidden='true' />
        {expanded || isMobile ? <span>{label}</span> : <span className='sr-only'>{label}</span>}
      </Link>
    )
  }

  const sidebarContent = (
    <>
      <div className='p-4 flex items-center justify-between'>
        <Link to='/' className='flex items-center gap-2 font-semibold'>
          <img
            src='/images/logo/logo.png'
            alt='Logo'
            className={`h-6 w-6 rounded-sm transition-all duration-300 ${
              expanded || isMobile ? 'block' : 'hidden'
            }`}
          />
          {(expanded || isMobile) && <span>FinTrack</span>}
        </Link>
        {!isMobile && (
          <Button variant='ghost' size='icon' onClick={toggleSidebar} className='h-8 w-8'>
            {expanded ? <ChevronLeft className='h-4 w-4' /> : <ChevronRight className='h-4 w-4' />}
            <span className='sr-only'>{t('nav.toggleSidebar')}</span>
          </Button>
        )}
      </div>

      <nav aria-label={t('nav.label')} className='flex flex-col gap-4 px-4 pb-4'>
        {sections.map((section, index) => (
          <div key={section.heading ?? index} className={section.quiet ? 'border-t pt-4' : undefined}>
            {section.heading && (expanded || isMobile) && (
              <h3 className='mb-1 px-3 text-xs font-medium text-muted-foreground'>{section.heading}</h3>
            )}
            <div className='space-y-0.5'>{section.items.map(renderLink)}</div>
          </div>
        ))}
      </nav>

      {isMobile && (
        <div className='p-4'>
          <h3 className='mb-2 text-xs font-semibold text-muted-foreground'>{t('nav.preferences')}</h3>
          <PreferenceControls />
        </div>
      )}

      <div className='mt-auto p-4 border-t'>
        {(expanded || isMobile) && (
          <div className='text-xs text-muted-foreground'>
            <p>{t('nav.footer', { year: new Date().getFullYear() })}</p>
          </div>
        )}
      </div>
    </>
  )

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side='left' className='w-[280px] gap-0 overflow-y-auto p-0'>
          {sidebarContent}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div
      className={`hidden md:flex h-full flex-col border-r bg-background transition-all duration-300 ${
        expanded ? 'w-64' : 'w-20'
      }`}
    >
      {sidebarContent}
    </div>
  )
}
