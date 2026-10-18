'use client'

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from 'recharts'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { LoadError } from '@/components/load-error'
import { EmptyPlaceholder } from '@/components/ui/empty-placeholder'
import { CircleDollarSign } from 'lucide-react'
import { formatCurrency, useCurrency } from '@/context/currency-context'
import { useMonthlyCashFlow } from '@/lib/ledger'
import { AnimateSpinner } from '@/components/spinner'

interface MonthlyData {
  name: string
  income: number
  expenses: number
}

const chartConfig = {
  income: {
    label: 'Income',
    color: 'var(--income)',
  },
  expenses: {
    label: 'Expenses',
    color: 'var(--expense)',
  },
} satisfies ChartConfig

interface OverviewProps {
  startDate?: string
  endDate?: string
}

export function Overview({ startDate, endDate }: OverviewProps) {
  const { t } = useTranslation()
  const { currency } = useCurrency()
  const localizedChartConfig = useMemo(
    () =>
      ({
        income: { ...chartConfig.income, label: t('overview.income') },
        expenses: { ...chartConfig.expenses, label: t('overview.expenses') },
      }) satisfies ChartConfig,
    [t],
  )
  // Server-side monthly series over the whole range - the previous version
  // bucketed a (paginated) transaction list in the browser.
  const { data, isLoading, error, mutate } = useMonthlyCashFlow(startDate, endDate)

  if (isLoading) {
    return <AnimateSpinner size={48} />
  }

  if (error && !data) {
    return <LoadError inline what={t('loadError.chart')} onRetry={() => void mutate()} />
  }

  const rows = data?.rows ?? []

  if (!rows.length) {
    return (
      <EmptyPlaceholder
        icon={<CircleDollarSign className='w-12 h-12' />}
        title={t('overview.emptyTitle')}
        description={t('overview.emptyDescription')}
      />
    )
  }

  const sortedData: MonthlyData[] = rows.slice(-6).map((row) => ({
    name: new Date(row.year, row.month - 1, 1).toLocaleString('default', {
      month: 'short',
      year: 'numeric',
    }),
    income: Number(row.income),
    expenses: Number(row.expenses),
  }))

  return (
    <ChartContainer config={localizedChartConfig}>
      <BarChart
        data={sortedData}
        margin={{
          top: 20,
        }}
      >
        <CartesianGrid vertical={true} />
        <XAxis
          dataKey='name'
          tickMargin={10}
          fontSize={12}
          label={{ value: t('overview.months'), position: 'right', offset: 0 }}
        />
        <YAxis
          label={{ value: t('overview.amountAxis', { symbol: currency.symbol }), angle: -90, position: 'left' }}
          tickFormatter={(value) => formatCurrency(Number(value), currency.code, { maximumFractionDigits: 0 })}
        />
        <ChartTooltip
          cursor={false}
          content={({ active, payload }) => (
            <ChartTooltipContent
              active={active}
              payload={payload}
              formatter={(label, value) => [`${value} - ${formatCurrency(Number(label), currency.code)}`, ' ']}
              labelFormatter={() => t('overview.total')}
            />
          )}
        />
        <Bar
          dataKey='income'
          fill='var(--color-income)'
          radius={[4, 4, 0, 0]}
          label={{
            position: 'top',
            formatter: (value: number) => t('overview.incomeLabel', { amount: formatCurrency(value, currency.code) }),
          }}
          name={t('overview.income')}
        />
        <Bar
          dataKey='expenses'
          fill='var(--color-expenses)'
          radius={[4, 4, 0, 0]}
          label={{
            position: 'top',
            formatter: (value: number) => t('overview.expensesLabel', { amount: formatCurrency(value, currency.code) }),
          }}
          name={t('overview.expenses')}
        />
        <Legend />
      </BarChart>
    </ChartContainer>
  )
}
