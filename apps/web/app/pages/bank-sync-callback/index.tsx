'use client'

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  finishBankLinkAndDiscoverAccounts,
  type SyncConnection,
} from '@/lib/bank-sync-client'
import { listAccounts, type FinanceAccount } from '@/lib/finance-client'

import { MapDiscoveredAccounts } from '@/components/map-discovered-accounts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Typography from '@/components/ui/typography'

/** Where GoCardless redirects the user back to after they finish
 * authenticating at their bank (see FINTRACK_FRONTEND_URL /
 * bank_sync_gocardless.start_link). The connection id round-trips through
 * the URL itself, so nothing needs to persist across the redirect. */
export default function BankSyncCallbackPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const connectionId = searchParams.get('connection')

  const [connection, setConnection] = useState<SyncConnection | null>(null)
  const [accounts, setAccounts] = useState<FinanceAccount[]>([])
  // A server-provided detail is shown as-is; our own messages are stored as
  // a kind and translated at render time.
  const [error, setError] = useState<'' | 'missing' | 'failed' | { detail: string }>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!connectionId) {
      setError('missing')
      setLoading(false)
      return
    }

    let cancelled = false
    Promise.all([finishBankLinkAndDiscoverAccounts(Number(connectionId)), listAccounts()])
      .then(([syncConnection, accountRows]) => {
        if (cancelled) return
        setConnection(syncConnection)
        setAccounts(accountRows)
      })
      .catch((err) => {
        if (cancelled) return
        const detail =
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        setError(detail ? { detail } : 'failed')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [connectionId])

  const errorMessage =
    error === 'missing'
      ? t('bankSyncCallback.missingConnection')
      : error === 'failed'
        ? t('bankSyncCallback.failed')
        : error
          ? error.detail
          : ''

  return (
    <div className='mx-auto flex max-w-lg flex-col gap-4 py-10'>
      <Typography variant='h2' as='h1'>{t('bankSyncCallback.title')}</Typography>

      <Card>
        <CardHeader>
          <CardTitle>{connection?.institution_name || t('bankSyncCallback.bankSync')}</CardTitle>
          <CardDescription>
            {loading
              ? t('bankSyncCallback.confirming')
              : error
                ? t('bankSyncCallback.somethingWrong')
                : t('bankSyncCallback.chooseWhere')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className='flex items-center justify-center gap-2 py-10 text-muted-foreground'>
              <Loader2 className='h-5 w-5 animate-spin' /> {t('bankSyncCallback.loading')}
            </div>
          )}

          {!loading && error && (
            <div className='space-y-4 text-center'>
              <p className='text-sm text-destructive'>{errorMessage}</p>
              <Button onClick={() => navigate('/accounts')}>{t('bankSyncCallback.backToAccounts')}</Button>
            </div>
          )}

          {!loading && !error && connection && (
            <MapDiscoveredAccounts
              connection={connection}
              existingAccounts={accounts}
              onDone={() => {
                toast.success(t('bankSyncCallback.connected'))
                navigate('/accounts')
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
