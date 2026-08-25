'use client'

import { formatDateForApi } from '@/lib/date'
import { useDateStore } from '@/hooks/use-date-store'
import { DatePickerWithRange } from '@/components/date-range-picker'
import { CategoryTrendsChart } from '@/components/insights/category-trends-chart'
import { NetWorthOverTimeChart } from '@/components/insights/net-worth-over-time-chart'
import { CashFlowSankeyChart } from '@/components/insights/cash-flow-sankey-chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Typography from '@/components/ui/typography'

export default function InsightsPage() {
  const { dateRange } = useDateStore()
  const startDate = dateRange?.from ? formatDateForApi(dateRange.from) : undefined
  const endDate = dateRange?.to ? formatDateForApi(dateRange.to) : undefined

  return (
    <div className='space-y-6 p-6'>
      <Typography variant='h2'>Insights</Typography>

      <Card>
        <CardHeader>
          <CardTitle>Net worth over time</CardTitle>
          <CardDescription>The last 12 months, across every account.</CardDescription>
        </CardHeader>
        <CardContent>
          <NetWorthOverTimeChart />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='flex flex-row flex-wrap items-start justify-between gap-4 space-y-0'>
          <div className='space-y-1.5'>
            <CardTitle>Spending by category</CardTitle>
            <CardDescription>How your spending on each category has moved, month over month.</CardDescription>
          </div>
          <DatePickerWithRange />
        </CardHeader>
        <CardContent>
          <CategoryTrendsChart startDate={startDate} endDate={endDate} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cash flow</CardTitle>
          <CardDescription>Where money came from, and where it went, for the selected period.</CardDescription>
        </CardHeader>
        <CardContent>
          <CashFlowSankeyChart startDate={startDate} endDate={endDate} />
        </CardContent>
      </Card>
    </div>
  )
}
