'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Landmark } from 'lucide-react'
import { LoadError } from '@/components/load-error'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { EmptyPlaceholder } from '@/components/ui/empty-placeholder'
import { AnimateSpinner } from '@/components/spinner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@/components/ui/segmented-control'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, useCurrency } from '@/context/currency-context'
import { useDebtPayoff, type DebtPayoffStrategy } from '@/lib/ledger'

// Same treatment as the net worth chart: a single series over time needs no
// legend and no series-identity color, just one consistent hue (the
// dataviz skill's validated default, slot 1). Not read here as "debt = bad,
// so red" - the line trends down, which is the good outcome, and red in
// this app already means "expense/outflow" elsewhere, which would misread
// a declining-is-good chart as the opposite.
const chartConfig = {
  total_balance: { label: 'Remaining balance', color: 'var(--chart-2)' },
} satisfies ChartConfig

function useChartConfig() {
  const { t } = useTranslation()
  return useMemo(
    () =>
      ({
        total_balance: { ...chartConfig.total_balance, label: t('insights.remainingBalance') },
      }) satisfies ChartConfig,
    [t],
  )
}

function useDebounced<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

export function DebtPayoffPanel() {
  const { t } = useTranslation()
  const { currency } = useCurrency()
  const localizedChartConfig = useChartConfig()
  const [strategy, setStrategy] = useState<DebtPayoffStrategy>('avalanche')
  const [extraPaymentInput, setExtraPaymentInput] = useState('0')
  const extraPayment = useDebounced(extraPaymentInput, 400)

  const { data, isLoading, error, mutate } = useDebtPayoff(strategy, extraPayment)

  const chartData = useMemo(
    () => (data?.schedule ?? []).map((point) => ({ month: point.month, total_balance: Number(point.total_balance) })),
    [data],
  )

  const hasDebts = Boolean(data?.payoff_order.length)
  const hasExcluded = Boolean(data?.excluded.length)

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-end gap-4'>
        <div className='space-y-1.5'>
          <Label id='debt-strategy-label'>{t('insights.strategy')}</Label>
          <SegmentedControl
            aria-labelledby='debt-strategy-label'
            value={strategy}
            onValueChange={(value) => setStrategy(value as DebtPayoffStrategy)}
          >
            <SegmentedControlItem value='avalanche'>{t('insights.avalanche')}</SegmentedControlItem>
            <SegmentedControlItem value='snowball'>{t('insights.snowball')}</SegmentedControlItem>
          </SegmentedControl>
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor='debt-extra-payment'>{t('insights.extraPayment')}</Label>
          <Input
            id='debt-extra-payment'
            type='number'
            step='0.01'
            min='0'
            className='w-40'
            value={extraPaymentInput}
            onChange={(e) => setExtraPaymentInput(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <AnimateSpinner size={48} />
      ) : error && !data ? (
        <LoadError inline what={t('loadError.debtPlan')} onRetry={() => void mutate()} />
      ) : !hasDebts ? (
        <EmptyPlaceholder
          icon={<Landmark className='w-12 h-12' />}
          title={t('insights.debtEmptyTitle')}
          description={
            hasExcluded
              ? t('insights.debtEmptyExcluded')
              : t('insights.debtEmptyDescription')
          }
          action={
            <Button asChild variant='link' className='underline'>
              <Link to='/accounts'>{t('insights.goToAccounts')}</Link>
            </Button>
          }
        />
      ) : (
        <>
          <p className='text-sm text-muted-foreground'>
            {data!.months_to_debt_free === null ? (
              <span className='text-destructive'>{t('insights.neverPaidOff')}</span>
            ) : (
              <>
                {t('insights.debtFreeIn')}{' '}
                <span className='text-foreground font-semibold'>
                  {t('insights.monthsCount', { count: data!.months_to_debt_free })}
                </span>
                {t('insights.debtFreePaying')}{' '}
                <span className='text-foreground font-semibold'>
                  {formatCurrency(Number(data!.total_interest_paid), currency.code)}
                </span>{' '}
                {t('insights.debtFreeInterest')}
              </>
            )}
          </p>

          {chartData.length > 0 && (
            <ChartContainer config={localizedChartConfig} className='aspect-auto h-[260px] w-full'>
              <AreaChart data={chartData} margin={{ top: 20 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey='month'
                  tickMargin={10}
                  fontSize={12}
                  label={{ value: t('insights.monthsFromNow'), position: 'insideBottom', offset: -5 }}
                />
                <YAxis
                  width={80}
                  tickFormatter={(value) =>
                    formatCurrency(Number(value), currency.code, { maximumFractionDigits: 0 })
                  }
                />
                <ChartTooltip
                  cursor={{ opacity: 0.1 }}
                  content={
                    <ChartTooltipContent
                      formatter={(value) => [formatCurrency(Number(value), currency.code), ` ${t('insights.remaining')}`]}
                    />
                  }
                />
                <Area
                  dataKey='total_balance'
                  stroke='var(--color-total_balance)'
                  fill='var(--color-total_balance)'
                  fillOpacity={0.1}
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ChartContainer>
          )}

          <div className='overflow-x-auto'>
            <Table scrollLabel={t('insights.payoffTimeline')}>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('insights.account')}</TableHead>
                  <TableHead>{t('insights.paidOff')}</TableHead>
                  <TableHead className='text-right'>{t('insights.interestPaid')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data!.payoff_order.map((row) => (
                  <TableRow key={row.account_id}>
                    <TableCell className='font-medium'>{row.account}</TableCell>
                    <TableCell className='text-muted-foreground'>
                      {row.payoff_month === null
                        ? t('insights.neverAtCurrentPayments')
                        : t('insights.monthsCount', { count: row.payoff_month })}
                    </TableCell>
                    <TableCell className='text-right tabular-nums'>
                      {formatCurrency(Number(row.interest_paid), currency.code)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {hasExcluded && (
            <p className='text-xs text-muted-foreground'>
              {t('insights.debtExcludedNote', {
                accounts: data!.excluded.map((row) => row.account).join(', '),
              })}{' '}
              <Link to='/accounts' className='underline underline-offset-4'>
                {t('insights.fixOnAccounts')}
              </Link>
              .
            </p>
          )}
        </>
      )}
    </div>
  )
}
