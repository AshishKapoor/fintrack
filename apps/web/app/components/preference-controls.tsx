'use client'

import { LanguageSwitcher } from '@/components/language-switcher'
import { ModeToggle } from '@/components/mode-toggle'
import { OrgSwitcher } from '@/components/org-switcher'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { cn } from '@/lib/utils'

/**
 * Workspace, language, colour theme and light/dark mode. (The budget currency
 * is not a display preference and lives in Settings, behind a confirmation.)
 *
 * The desktop top bar shows these inline. A phone's top bar has room for the
 * menu, search, notifications and account and nothing more, so there they live
 * in the navigation drawer instead - the same controls, one tap further away,
 * rather than pushing notifications and the account menu off-screen.
 */
export function PreferenceControls({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <OrgSwitcher />
      <LanguageSwitcher />
      <ThemeSwitcher />
      <ModeToggle />
    </div>
  )
}
