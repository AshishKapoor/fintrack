'use client'

import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { PieChart as PieChartIcon } from 'lucide-react'

import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { EmptyPlaceholder } from '@/components/ui/empty-placeholder'
import { AnimateSpinner } from '@/components/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, useCurrency } from '@/context/currency-context'
import { useSpendingTrends } from '@/lib/ledger'
import { OTHER_CATEGORY_LABEL, pivotCategoryTrends } from '@/lib/insights'

interface CategoryTrendsChartProps {
  startDate?: string
  endDate?: string
}

// The dataviz skill's validated default categorical palette (references/palette.md),
// fixed hue order, first 6 slots (a 7th "Other" series stays a neutral muted
// tone below - it is a catch-all bucket, not a category identity, so it never
// takes a hue slot). Category-to-slot assignment is by rank-within-the-current
// range, not a stable per-category identity - this app has no persisted
// per-category color anywhere else, so a given category's color can shift if
// the selected range changes which categories rank highest.
const PALETTE: { light: string; dark: string }[] = [
  { light: '#2a78d6', dark: '#3987e5' },
  { light: '#eb6834', dark: '#d95926' },
  { light: '#1baf7a', dark: '#199e70' },
  { light: '#eda100', dark: '#c98500' },
  { light: '#e87ba4', dark: '#d55181' },
  { light: '#008300', dark: '#008300' },
]
const OTHER_COLOR = { light: '#898781', dark: '#898781' }

function seriesKey(index: number) {
  return `series-${index}`
}

/**
 * ChartLegendContent looks a series' label up in ChartConfig by its dataKey -
 * which here is the real category name, while ChartConfig is keyed by the
 * synthetic seriesKey() slugs (category names can contain spaces/punctuation
 * that would produce an invalid `--color-{key}` CSS custom property). Unlike
 * ChartTooltipContent, ChartLegendContent has no fallback to item.value when
 * the config lookup misses, so it silently renders swatches with no text.
 * Read the label straight off the payload instead of through that lookup.
 */
function CategoryLegend({ payload }: { payload?: Array<{ value?: string; color?: string }> }) {
  if (!payload?.length) return null
  return (
    <div className='flex flex-wrap items-center justify-center gap-4 pt-3'>
      {payload.map((item) => (
        <div key={item.value} className='flex items-center gap-1.5'>
          <div className='h-2 w-2 shrink-0 rounded-[2px]' style={{ backgroundColor: item.color }} />
          <span className='text-muted-foreground text-xs'>{item.value}</span>
        </div>
      ))}
    </div>
  )
}

export function CategoryTrendsChart({ startDate, endDate }: CategoryTrendsChartProps) {
  const { currency } = useCurrency()
  const [view, setView] = useState<'chart' | 'table'>('chart')
  const { data, isLoading } = useSpendingTrends(startDate, endDate)

  const { points, categories } = useMemo(
    () => pivotCategoryTrends(data?.rows ?? [], 6),
    [data],
  )

  const chartConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = {}
    categories.forEach((category, index) => {
      config[seriesKey(index)] =
        category === OTHER_CATEGORY_LABEL ? { theme: OTHER_COLOR } : { theme: PALETTE[index] }
    })
    return config
  }, [categories])

  if (isLoading) {
    return <AnimateSpinner size={48} />
  }

  if (!points.length) {
    return (
      <EmptyPlaceholder
        icon={<PieChartIcon className='w-12 h-12' />}
        title='No spending to compare yet'
        description='Add expense transactions across a couple of months to see how your spending shifts by category.'
      />
    )
  }

  return (
    <Tabs value={view} onValueChange={(value) => setView(value as 'chart' | 'table')}>
      <div className='flex justify-end'>
        <TabsList>
          <TabsTrigger value='chart'>Chart</TabsTrigger>
          <TabsTrigger value='table'>Table</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value='chart'>
        <ChartContainer config={chartConfig} className='aspect-auto h-[320px] w-full'>
          <BarChart data={points} margin={{ top: 20 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey='period' tickMargin={10} fontSize={12} />
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
                  formatter={(value, name) => [
                    formatCurrency(Number(value), currency.code),
                    ` ${name}`,
                  ]}
                />
              }
            />
            <ChartLegend content={<CategoryLegend />} />
            {categories.map((category, index) => (
              <Bar
                key={category}
                dataKey={category}
                name={category}
                stackId='spend'
                fill={`var(--color-${seriesKey(index)})`}
              />
            ))}
          </BarChart>
        </ChartContainer>
      </TabsContent>

      <TabsContent value='table'>
        <div className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                {categories.map((category) => (
                  <TableHead key={category} className='text-right'>
                    {category}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {points.map((point) => (
                <TableRow key={point.period}>
                  <TableCell className='font-medium'>{point.period}</TableCell>
                  {categories.map((category) => (
                    <TableCell key={category} className='text-right tabular-nums'>
                      {formatCurrency(Number(point[category] ?? 0), currency.code)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>
  )
}
