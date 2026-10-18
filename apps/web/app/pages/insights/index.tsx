'use client'

import { formatDateForApi } from '@/lib/date'
import { useDateStore } from '@/hooks/use-date-store'
import { DatePickerWithRange } from '@/components/date-range-picker'
import { CategoryTrendsChart } from '@/components/insights/category-trends-chart'
import { NetWorthOverTimeChart } from '@/components/insights/net-worth-over-time-chart'
import { CashFlowSankeyChart } from '@/components/insights/cash-flow-sankey-chart'
import { SubscriptionsPanel } from '@/components/insights/subscriptions-panel'
import { DebtPayoffPanel } from '@/components/insights/debt-payoff-panel'
import { Overview } from '@/components/overview'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Typography from '@/components/ui/typography'
import { useTranslation } from 'react-i18next'

export default function InsightsPage() {
  const { t } = useTranslation()
  const { dateRange } = useDateStore()
  const startDate = dateRange?.from ? formatDateForApi(dateRange.from) : undefined
  const endDate = dateRange?.to ? formatDateForApi(dateRange.to) : undefined

  return (
    <div className='space-y-6 p-6'>
      <Typography variant='h2' as='h1'>{t('insights.title')}</Typography>

      <Card>
        <CardHeader>
          <CardTitle>{t('insights.netWorthTitle')}</CardTitle>
          <CardDescription>{t('insights.netWorthDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <NetWorthOverTimeChart />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='flex flex-row flex-wrap items-start justify-between gap-4 space-y-0'>
          <div className='space-y-1.5'>
            <CardTitle>{t('insights.incomeExpensesTitle')}</CardTitle>
            <CardDescription>{t('insights.incomeExpensesDescription')}</CardDescription>
          </div>
          <DatePickerWithRange />
        </CardHeader>
        <CardContent>
          <Overview startDate={startDate} endDate={endDate} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('insights.debtTitle')}</CardTitle>
          <CardDescription>{t('insights.debtDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <DebtPayoffPanel />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('insights.subscriptionsTitle')}</CardTitle>
          <CardDescription>{t('insights.subscriptionsDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <SubscriptionsPanel />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='flex flex-row flex-wrap items-start justify-between gap-4 space-y-0'>
          <div className='space-y-1.5'>
            <CardTitle>{t('insights.categoryTitle')}</CardTitle>
            <CardDescription>{t('insights.categoryDescription')}</CardDescription>
          </div>
          <DatePickerWithRange />
        </CardHeader>
        <CardContent>
          <CategoryTrendsChart startDate={startDate} endDate={endDate} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('insights.cashFlowTitle')}</CardTitle>
          <CardDescription>{t('insights.cashFlowDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <CashFlowSankeyChart startDate={startDate} endDate={endDate} />
        </CardContent>
      </Card>
    </div>
  )
}
