'use client'

import { useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Wallet } from 'lucide-react'

import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { EmptyPlaceholder } from '@/components/ui/empty-placeholder'
import { AnimateSpinner } from '@/components/spinner'
import { formatCurrency, useCurrency } from '@/context/currency-context'
import { useNetWorthSeries, type NetWorthSeriesPoint } from '@/lib/ledger'

// The dataviz skill's validated default categorical palette, slot 1 (blue) -
// a single series needs no legend box and no series-identity color scheme,
// just one consistent hue.
const chartConfig = {
  total: { label: 'Net worth', theme: { light: '#2a78d6', dark: '#3987e5' } },
} satisfies ChartConfig

interface ChartPoint {
  label: string
  total: number
  missing_rate: boolean
}

function pointsToChartData(points: NetWorthSeriesPoint[]): ChartPoint[] {
  return points.map((point) => ({
    label: new Date(`${point.date}T00:00:00`).toLocaleDateString('default', {
      month: 'short',
      year: '2-digit',
    }),
    total: Number(point.total),
    missing_rate: point.missing_rate,
  }))
}

// A hollow, dashed-ring dot marks a month whose total excludes an account
// with no FX rate for that date yet (see compute_net_worth_series) - a
// partial total, not a wrong one, but one the reader shouldn't read as final.
function NetWorthDot({ cx, cy, payload }: { cx?: number; cy?: number; payload?: ChartPoint }) {
  if (cx === undefined || cy === undefined) return null
  if (payload?.missing_rate) {
    return (
      <circle cx={cx} cy={cy} r={4} fill='var(--background)' stroke='var(--color-total)' strokeWidth={2} />
    )
  }
  return <circle cx={cx} cy={cy} r={4} fill='var(--color-total)' />
}

export function NetWorthOverTimeChart() {
  const { currency } = useCurrency()
  const { data, isLoading } = useNetWorthSeries()

  const chartData = useMemo(() => pointsToChartData(data?.points ?? []), [data])
  const hasMissingRate = chartData.some((point) => point.missing_rate)

  if (isLoading) {
    return <AnimateSpinner size={48} />
  }

  if (!chartData.length) {
    return (
      <EmptyPlaceholder
        icon={<Wallet className='w-12 h-12' />}
        title='No net worth history yet'
        description='Add an account and a few transactions to start tracking your net worth over time.'
      />
    )
  }

  return (
    <div className='space-y-2'>
      <ChartContainer config={chartConfig} className='aspect-auto h-[320px] w-full'>
        <AreaChart data={chartData} margin={{ top: 20 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey='label' tickMargin={10} fontSize={12} />
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
                formatter={(value) => [formatCurrency(Number(value), currency.code), ' Net worth']}
              />
            }
          />
          <Area
            dataKey='total'
            stroke='var(--color-total)'
            fill='var(--color-total)'
            fillOpacity={0.1}
            strokeWidth={2}
            dot={<NetWorthDot />}
          />
        </AreaChart>
      </ChartContainer>
      {hasMissingRate && (
        <p className='text-xs text-muted-foreground'>
          Hollow points are missing an exchange rate for that month, so their total excludes at least
          one account - a partial figure, not a wrong one.
        </p>
      )}
    </div>
  )
}
