'use client'

import { LanguageSwitcher } from '@/components/language-switcher'
import { ModeToggle } from '@/components/mode-toggle'
import { OrgSwitcher } from '@/components/org-switcher'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { currencies, useCurrency } from '@/context/currency-context'
import { cn } from '@/lib/utils'

/**
 * Workspace, currency, language, colour theme and light/dark mode.
 *
 * The desktop top bar shows these inline. A phone's top bar has room for the
 * menu, search, notifications and account and nothing more, so there they live
 * in the navigation drawer instead - the same controls, one tap further away,
 * rather than pushing notifications and the account menu off-screen.
 */
export function PreferenceControls({ className }: { className?: string }) {
  const { currency, setCurrency } = useCurrency()

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
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
    </div>
  )
}
