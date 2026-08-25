'use client'

import { RefreshCw } from 'lucide-react'

import { EmptyPlaceholder } from '@/components/ui/empty-placeholder'
import { AnimateSpinner } from '@/components/spinner'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, useCurrency } from '@/context/currency-context'
import { useSubscriptions, type DetectedSubscription } from '@/lib/ledger'

const CADENCE_LABEL: Record<DetectedSubscription['cadence'], string> = {
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('default', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// A list of detected charges, not a magnitude/trend/part-to-whole - the
// dataviz skill's own "is it even a chart?" table calls this out: more than
// a handful of classes that all carry meaning is a table, not a chart.
export function SubscriptionsPanel() {
  const { currency } = useCurrency()
  const { data, isLoading } = useSubscriptions()
  const subscriptions = data?.subscriptions ?? []

  if (isLoading) {
    return <AnimateSpinner size={48} />
  }

  if (!subscriptions.length) {
    return (
      <EmptyPlaceholder
        icon={<RefreshCw className='w-12 h-12' />}
        title='No recurring charges detected yet'
        description='Once the same payee charges you a similar amount on a regular interval a few times, it will show up here automatically.'
      />
    )
  }

  return (
    <div className='space-y-4'>
      <p className='text-sm text-muted-foreground'>
        <span className='text-foreground font-semibold'>{subscriptions.length}</span> recurring{' '}
        {subscriptions.length === 1 ? 'charge' : 'charges'} totaling{' '}
        <span className='text-foreground font-semibold'>
          {formatCurrency(Number(data?.total_monthly_equivalent ?? 0), currency.code)}
        </span>
        /mo
      </p>
      <div className='overflow-x-auto'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Payee</TableHead>
              <TableHead>Cadence</TableHead>
              <TableHead className='text-right'>Amount</TableHead>
              <TableHead className='text-right'>Monthly equivalent</TableHead>
              <TableHead>Last charged</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptions.map((subscription) => (
              <TableRow key={subscription.payee_id}>
                <TableCell className='font-medium'>{subscription.payee}</TableCell>
                <TableCell>
                  <Badge variant='outline'>{CADENCE_LABEL[subscription.cadence]}</Badge>
                </TableCell>
                <TableCell className='text-right tabular-nums'>
                  {formatCurrency(Number(subscription.amount), currency.code)}
                </TableCell>
                <TableCell className='text-right tabular-nums'>
                  {formatCurrency(Number(subscription.monthly_equivalent), currency.code)}
                </TableCell>
                <TableCell className='text-muted-foreground'>
                  {formatDate(subscription.last_charge_date)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
