'use client'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Home,
  PieChart,
  Repeat,
  Settings,
  Tag,
  TrendingUp,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

interface SidebarProps {
  expanded: boolean
  toggleSidebar: () => void
  isMobile: boolean
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function Sidebar({ expanded, toggleSidebar, isMobile, isOpen, onOpenChange }: SidebarProps) {
  const location = useLocation()

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
          </Button>
        )}
      </div>

      <div className='p-4'>
        {(expanded || isMobile) && (
          <h3 className='mb-2 text-xs font-semibold text-muted-foreground'>MAIN MENU</h3>
        )}
        <nav className='space-y-1'>
          <Link
            to='/home'
            className={`flex items-center rounded-md px-3 py-2 text-sm font-medium ${
              location.pathname === '/home' ? 'bg-muted text-primary-background' : 'hover:bg-muted'
            } ${expanded || isMobile ? 'gap-3' : 'justify-center'}`}
            onClick={() => isMobile && onOpenChange(false)}
          >
            <Home className='h-4 w-4' />
            {(expanded || isMobile) && <span>Dashboard</span>}
          </Link>
          <Link
            to='/categories'
            className={`flex items-center rounded-md px-3 py-2 text-sm font-medium ${
              location.pathname === '/categories'
                ? 'bg-muted text-primary-background'
                : 'hover:bg-muted'
            } ${expanded || isMobile ? 'gap-3' : 'justify-center'}`}
            onClick={() => isMobile && onOpenChange(false)}
          >
            <Tag className='h-4 w-4' />
            {(expanded || isMobile) && <span>Categories</span>}
          </Link>
          <Link
            to='/budgets'
            className={`flex items-center rounded-md px-3 py-2 text-sm font-medium ${
              location.pathname === '/budgets'
                ? 'bg-muted text-primary-background'
                : 'hover:bg-muted'
            } ${expanded || isMobile ? 'gap-3' : 'justify-center'}`}
            onClick={() => isMobile && onOpenChange(false)}
          >
            <PieChart className='h-4 w-4' />
            {(expanded || isMobile) && <span>Budgets</span>}
          </Link>
          <Link
            to='/transactions'
            className={`flex items-center rounded-md px-3 py-2 text-sm font-medium ${
              location.pathname === '/transactions'
                ? 'bg-muted text-primary-background'
                : 'hover:bg-muted'
            } ${expanded || isMobile ? 'gap-3' : 'justify-center'}`}
            onClick={() => isMobile && onOpenChange(false)}
          >
            <CreditCard className='h-4 w-4' />
            {(expanded || isMobile) && <span>Transactions</span>}
          </Link>
          <Link
            to='/reports'
            className={`flex items-center rounded-md px-3 py-2 text-sm font-medium ${
              location.pathname === '/reports' ? 'bg-muted text-primary-background' : 'hover:bg-muted'
            } ${expanded || isMobile ? 'gap-3' : 'justify-center'}`}
            onClick={() => isMobile && onOpenChange(false)}
          >
            <TrendingUp className='h-4 w-4' />
            {(expanded || isMobile) && <span>Reports</span>}
          </Link>
          <Link
            to='/rules'
            className={`flex items-center rounded-md px-3 py-2 text-sm font-medium ${
              location.pathname === '/rules' ? 'bg-muted text-primary-background' : 'hover:bg-muted'
            } ${expanded || isMobile ? 'gap-3' : 'justify-center'}`}
            onClick={() => isMobile && onOpenChange(false)}
          >
            <Repeat className='h-4 w-4' />
            {(expanded || isMobile) && <span>Rules & Recurring</span>}
          </Link>
        </nav>
      </div>

      <div className='p-4'>
        {(expanded || isMobile) && (
          <h3 className='mb-2 text-xs font-semibold text-muted-foreground'>SETTINGS</h3>
        )}
        <nav className='space-y-1'>
          <Link
            to='/settings'
            className={`flex items-center rounded-md px-3 py-2 text-sm font-medium ${
              location.pathname === '/settings'
                ? 'bg-muted text-primary-background'
                : 'hover:bg-muted'
            } ${expanded || isMobile ? 'gap-3' : 'justify-center'}`}
            onClick={() => isMobile && onOpenChange(false)}
          >
            <Settings className='h-4 w-4' />
            {(expanded || isMobile) && <span>General</span>}
          </Link>
        </nav>
      </div>

      <div className='mt-auto p-4 border-t'>
        {(expanded || isMobile) && (
          <div className='text-xs text-muted-foreground'>
            <p>© 2025 FinTrack.</p>
            <p>All rights reserved</p>
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
