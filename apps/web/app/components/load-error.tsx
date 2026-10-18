import { Button } from '@/components/ui/button'
import { RefreshCw, ServerCrash } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

/**
 * What a page shows when loading its data failed.
 *
 * Never an empty state: "No transactions yet" or "Welcome to FinTrack!" after
 * a failed request tells someone with months of records that their data is
 * gone. This says what actually happened - the server could not be reached or
 * refused the request - and that nothing was lost.
 */
export function LoadError({
  what,
  onRetry,
  inline = false,
  className,
}: {
  /** What failed to load, lower case: "your dashboard", "transactions". */
  what: string
  onRetry?: () => void
  /** Inside a card: no box of its own, so it never nests a card in a card. */
  inline?: boolean
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <div
      role='alert'
      className={cn(
        'mx-auto flex max-w-md flex-col items-center gap-3 text-center',
        inline ? 'py-6' : 'rounded-xl border bg-card p-8',
        className,
      )}
    >
      <ServerCrash className='h-8 w-8 text-muted-foreground' aria-hidden='true' />
      {inline ? (
        <p className='font-medium'>{t('loadError.title', { what })}</p>
      ) : (
        <h2 className='text-lg font-semibold'>{t('loadError.title', { what })}</h2>
      )}
      <p className='text-sm text-muted-foreground'>{t('loadError.body')}</p>
      {onRetry && (
        <Button variant='outline' onClick={onRetry}>
          <RefreshCw className='h-4 w-4' aria-hidden='true' />
          {t('loadError.retry')}
        </Button>
      )}
    </div>
  )
}
