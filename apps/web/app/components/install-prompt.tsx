import { Download, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const DISMISSED_KEY = 'fintrack_install_prompt_dismissed'

// Chrome/Edge-only, not yet part of any web standard - no lib.dom.d.ts type
// for it, hence the local interface instead of `any`.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Surfaces the browser's native "Add to Home Screen" flow instead of leaving
 * installability undiscoverable behind a browser menu - shown on the quick
 * add screen, since one-tap access to it from the home screen is the whole
 * point (ROADMAP.md Phase 1's "installable app"). Firefox/Safari never fire
 * `beforeinstallprompt` at all (Safari's install path is manual, "Share ->
 * Add to Home Screen"), so this renders nothing there rather than a button
 * that would not work.
 */
export function InstallPrompt() {
  const { t } = useTranslation()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem(DISMISSED_KEY) === '1',
  )

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!deferredPrompt || dismissed) return null

  const install = async () => {
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  const dismiss = () => {
    setDismissed(true)
    localStorage.setItem(DISMISSED_KEY, '1')
  }

  return (
    <Card>
      <CardContent className='flex items-center gap-3 p-4'>
        <Download className='h-5 w-5 shrink-0 text-muted-foreground' />
        <div className='min-w-0 flex-1'>
          <p className='text-sm font-medium'>{t('quickAdd.installTitle')}</p>
          <p className='text-xs text-muted-foreground'>{t('quickAdd.installDescription')}</p>
        </div>
        <Button size='sm' onClick={install}>
          {t('quickAdd.install')}
        </Button>
        <Button size='icon' variant='ghost' className='h-8 w-8 shrink-0' onClick={dismiss}>
          <X className='h-4 w-4' />
          <span className='sr-only'>{t('quickAdd.dismiss')}</span>
        </Button>
      </CardContent>
    </Card>
  )
}
