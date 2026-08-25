'use client'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useOrganization } from '@/context/organization-context'
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  History,
  Home,
  Landmark,
  LineChart,
  PieChart,
  PiggyBank,
  Repeat,
  Settings,
  Smartphone,
  Tag,
  TrendingUp,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'

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

  const mainNavItems = [
    { to: '/home', icon: Home, label: t('nav.dashboard') },
    { to: '/categories', icon: Tag, label: t('nav.categories') },
    { to: '/budgets', icon: PieChart, label: t('nav.budgets') },
    { to: '/accounts', icon: Landmark, label: t('nav.accounts') },
    { to: '/savings-goals', icon: PiggyBank, label: t('nav.savingsGoals') },
    { to: '/transactions', icon: CreditCard, label: t('nav.transactions') },
    { to: '/quick-add', icon: Smartphone, label: t('nav.quickAdd') },
    { to: '/reports', icon: TrendingUp, label: t('nav.reports') },
    { to: '/insights', icon: LineChart, label: t('nav.insights') },
    { to: '/rules', icon: Repeat, label: t('nav.rules') },
  ]

  const settingsNavItems = [
    { to: '/settings', icon: Settings, label: t('nav.settings') },
    ...(canManageAuditLog
      ? [{ to: '/audit-log', icon: History, label: t('nav.auditLog') }]
      : []),
  ]

  const renderLink = ({ to, icon: Icon, label }: (typeof mainNavItems)[number]) => (
    <Link
      key={to}
      to={to}
      className={`flex items-center rounded-md px-3 py-2 text-sm font-medium ${
        location.pathname === to ? 'bg-muted text-primary-background' : 'hover:bg-muted'
      } ${expanded || isMobile ? 'gap-3' : 'justify-center'}`}
      onClick={() => isMobile && onOpenChange(false)}
    >
      <Icon className='h-4 w-4' />
      {(expanded || isMobile) && <span>{label}</span>}
    </Link>
  )

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

      <div className='p-4'>
        {(expanded || isMobile) && (
          <h3 className='mb-2 text-xs font-semibold text-muted-foreground'>{t('nav.mainMenu')}</h3>
        )}
        <nav className='space-y-1'>{mainNavItems.map(renderLink)}</nav>
      </div>

      <div className='p-4'>
        {(expanded || isMobile) && (
          <h3 className='mb-2 text-xs font-semibold text-muted-foreground'>
            {t('nav.settingsSection')}
          </h3>
        )}
        <nav className='space-y-1'>{settingsNavItems.map(renderLink)}</nav>
      </div>

      <div className='mt-auto p-4 border-t'>
        {(expanded || isMobile) && (
          <div className='text-xs text-muted-foreground'>
            <p>{t('nav.footer')}</p>
            <p>{t('nav.footerRights')}</p>
          </div>
        )}
      </div>
    </>
  )

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side='left' className='w-[240px] p-0'>
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
