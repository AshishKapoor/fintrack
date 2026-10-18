'use client'

import { useTranslation } from 'react-i18next'
import { RefreshCw } from 'lucide-react'

import { LoadError } from '@/components/load-error'
import { EmptyPlaceholder } from '@/components/ui/empty-placeholder'
import { AnimateSpinner } from '@/components/spinner'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, useCurrency } from '@/context/currency-context'
import { useSubscriptions, type DetectedSubscription } from '@/lib/ledger'

function useCadenceLabels(): Record<DetectedSubscription['cadence'], string> {
  const { t } = useTranslation()
  return {
    weekly: t('insights.cadenceWeekly'),
    biweekly: t('insights.cadenceBiweekly'),
    monthly: t('insights.cadenceMonthly'),
    quarterly: t('insights.cadenceQuarterly'),
    yearly: t('insights.cadenceYearly'),
  }
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
  const { t } = useTranslation()
  const { currency } = useCurrency()
  const cadenceLabel = useCadenceLabels()
  const { data, isLoading, error, mutate } = useSubscriptions()
  const subscriptions = data?.subscriptions ?? []

  if (isLoading) {
    return <AnimateSpinner size={48} />
  }

  if (error && !data) {
    return <LoadError inline what={t('loadError.subscriptions')} onRetry={() => void mutate()} />
  }

  if (!subscriptions.length) {
    return (
      <EmptyPlaceholder
        icon={<RefreshCw className='w-12 h-12' />}
        title={t('insights.subscriptionsEmptyTitle')}
        description={t('insights.subscriptionsEmptyDescription')}
      />
    )
  }

  return (
    <div className='space-y-4'>
      <p className='text-sm text-muted-foreground'>
        <span className='text-foreground font-semibold'>{subscriptions.length}</span>{' '}
        {t('insights.recurringChargesTotaling', { count: subscriptions.length })}{' '}
        <span className='text-foreground font-semibold'>
          {formatCurrency(Number(data?.total_monthly_equivalent ?? 0), currency.code)}
        </span>
        {t('insights.perMonth')}
      </p>
      <div className='overflow-x-auto'>
        <Table scrollLabel={t('insights.recurringCharges')}>
          <TableHeader>
            <TableRow>
              <TableHead>{t('insights.payee')}</TableHead>
              <TableHead>{t('insights.cadence')}</TableHead>
              <TableHead className='text-right'>{t('insights.amount')}</TableHead>
              <TableHead className='text-right'>{t('insights.monthlyEquivalent')}</TableHead>
              <TableHead>{t('insights.lastCharged')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptions.map((subscription) => (
              <TableRow key={subscription.payee_id}>
                <TableCell className='font-medium'>{subscription.payee}</TableCell>
                <TableCell>
                  <Badge variant='outline'>{cadenceLabel[subscription.cadence]}</Badge>
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
