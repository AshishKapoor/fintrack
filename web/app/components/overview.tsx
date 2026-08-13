'use client'

import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from 'recharts'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
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
    color: 'hsl(142.1 76.2% 36.3%)',
  },
  expenses: {
    label: 'Expenses',
    color: 'hsl(0 84.2% 60.2%)',
  },
} satisfies ChartConfig

interface OverviewProps {
  startDate?: string
  endDate?: string
}

export function Overview({ startDate, endDate }: OverviewProps) {
  const { currency } = useCurrency()
  // Server-side monthly series over the whole range - the previous version
  // bucketed a (paginated) transaction list in the browser.
  const { data, isLoading } = useMonthlyCashFlow(startDate, endDate)

  if (isLoading) {
    return <AnimateSpinner size={48} />
  }

  const rows = data?.rows ?? []

  if (!rows.length) {
    return (
      <EmptyPlaceholder
        icon={<CircleDollarSign className='w-12 h-12' />}
        title='No data to visualize'
        description='Add some transactions to see your financial overview here.'
      />
    )
  }

  const sortedData: MonthlyData[] = rows.slice(-6).map((row) => ({
    name: new Date(row.year, row.month - 1, 1).toLocaleString('default', {
      month: 'short',
      year: '2-digit',
    }),
    income: Number(row.income),
    expenses: Number(row.expenses),
  }))

  return (
    <ChartContainer config={chartConfig}>
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
          label={{ value: 'Months', position: 'right', offset: 0 }}
        />
        <YAxis
          label={{ value: `Amount (${currency.symbol})`, angle: -90, position: 'left' }}
          tickFormatter={(value) => formatCurrency(Number(value), currency.code, { maximumFractionDigits: 0 })}
        />
        <ChartTooltip
          cursor={false}
          content={({ active, payload }) => (
            <ChartTooltipContent
              active={active}
              payload={payload}
              formatter={(label, value) => [`${value} - ${formatCurrency(Number(label), currency.code)}`, ' ']}
              labelFormatter={() => `Total:`}
            />
          )}
        />
        <Bar
          dataKey='income'
          fill='var(--color-income)'
          radius={[4, 4, 0, 0]}
          label={{
            position: 'top',
            formatter: (value: number) => `Income ${formatCurrency(value, currency.code)}`,
          }}
          name='Income'
        />
        <Bar
          dataKey='expenses'
          fill='var(--color-expenses)'
          radius={[4, 4, 0, 0]}
          label={{
            position: 'top',
            formatter: (value: number) => `Expenses ${formatCurrency(value, currency.code)}`,
          }}
          name='Expenses'
        />
        <Legend />
      </BarChart>
    </ChartContainer>
  )
}
