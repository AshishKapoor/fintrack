'use client'

import { CommandMenu } from '@/components/command-menu'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ModeToggle } from '@/components/mode-toggle'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { OrgSwitcher } from '@/components/org-switcher'
import { currencies, useCurrency } from '@/context/currency-context'
import { getUser, logout } from '@/lib/auth'
import { Bell, Menu } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

interface TopBarProps {
  onMenuClick?: () => void
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { t } = useTranslation()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any>(null)
  const { currency, setCurrency } = useCurrency()

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await getUser()
      setUser(userData)
    }
    fetchUser()
  }, [])

  return (
    <header className='flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6'>
      <Button variant='outline' size='icon' className='md:hidden' onClick={onMenuClick}>
        <Menu className='h-5 w-5' />
        <span className='sr-only'>{t('topbar.toggleMenu')}</span>
      </Button>

      <div className='w-full flex-1 md:grow-0 md:w-80'>
        <CommandMenu />
      </div>

      <div className='ml-auto flex items-center gap-2'>
        <OrgSwitcher />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='outline' size='sm'>
              <span className='mr-1'>{currency.flag}</span>
              {currency.symbol}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {currencies.map((curr) => (
              <DropdownMenuItem key={curr.code} onClick={() => setCurrency(curr)}>
                <span className='mr-2'>{curr.flag}</span>
                {curr.name} ({curr.symbol})
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <LanguageSwitcher />
        <ThemeSwitcher />
        <ModeToggle />

        <Link to='/settings?tab=notifications'>
          <Button variant='ghost' size='icon' className='relative'>
            <Bell className='h-5 w-5' />
            <span className='sr-only'>{t('topbar.notifications')}</span>
          </Button>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' className='relative h-8 w-8 rounded-full'>
              <Avatar>
                <AvatarFallback>{user && user?.email?.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className='w-56' align='end' forceMount>
            <DropdownMenuLabel className='font-normal'>
              <div className='flex flex-col space-y-1'>
                <p className='text-sm font-medium leading-none'>
                  {user && user?.first_name} {user && user?.last_name}
                </p>
                <p className='text-xs leading-none text-muted-foreground'>{user && user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link to='/settings'>
              <DropdownMenuItem>{t('topbar.settings')}</DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()}>{t('topbar.logout')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
