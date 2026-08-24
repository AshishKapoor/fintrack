'use client'

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const connectionId = searchParams.get('connection')

  const [connection, setConnection] = useState<SyncConnection | null>(null)
  const [accounts, setAccounts] = useState<FinanceAccount[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!connectionId) {
      setError('Missing connection - go back to Accounts and try connecting again.')
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
        setError(detail || "Couldn't finish connecting to your bank.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [connectionId])

  return (
    <div className='mx-auto flex max-w-lg flex-col gap-4 py-10'>
      <Typography variant='h2'>Connecting your bank</Typography>

      <Card>
        <CardHeader>
          <CardTitle>{connection?.institution_name || 'Bank sync'}</CardTitle>
          <CardDescription>
            {loading
              ? 'Confirming the connection…'
              : error
                ? 'Something went wrong'
                : 'Choose where each discovered account goes.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className='flex items-center justify-center gap-2 py-10 text-muted-foreground'>
              <Loader2 className='h-5 w-5 animate-spin' /> Loading…
            </div>
          )}

          {!loading && error && (
            <div className='space-y-4 text-center'>
              <p className='text-sm text-destructive'>{error}</p>
              <Button onClick={() => navigate('/accounts')}>Back to Accounts</Button>
            </div>
          )}

          {!loading && !error && connection && (
            <MapDiscoveredAccounts
              connection={connection}
              existingAccounts={accounts}
              onDone={() => {
                toast.success('Bank connected')
                navigate('/accounts')
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
