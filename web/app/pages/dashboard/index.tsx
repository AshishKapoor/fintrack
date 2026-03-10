import {
  useV1BudgetsList,
  useV1CategoriesList,
  useV1TransactionsList,
} from '@/client/gen/pft/v1/v1'
import { BudgetProgress } from '@/components/budget-progress'
import { Overview } from '@/components/overview'
import { PinnedReports } from '@/components/pinned-reports'
import { RecentTransactions } from '@/components/recent-transactions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Transaction } from '@/client/gen/pft/transaction'

import { AnimateSpinner } from '@/components/spinner'
import { EmptyPlaceholder } from '@/components/ui/empty-placeholder'
import { CircleDollarSign, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { CurrencyDisplay } from '@/components/ui/currency-display'
import { TypeEnum } from '@/client/gen/pft/typeEnum'

import { DatePickerWithRange } from '@/components/date-range-picker'
import { useSearchParams } from 'react-router-dom'
import { useEffect } from 'react'
import { useDateStore } from '@/hooks/use-date-store'
import { formatDateForApi, parseApiDate } from '@/lib/date'

export default function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { dateRange, setDateRange } = useDateStore()
  const startParam = searchParams.get('start')
  const endParam = searchParams.get('end')

  // On mount or when query params change, update store
  useEffect(() => {
    if (startParam && endParam) {
      const from = parseApiDate(startParam)
      const to = parseApiDate(endParam)
      if (!from || !to) return

      const currentStart = dateRange?.from ? formatDateForApi(dateRange.from) : undefined
      const currentEnd = dateRange?.to ? formatDateForApi(dateRange.to) : undefined

      if (
        !dateRange ||
        currentStart !== startParam ||
        currentEnd !== endParam
      ) {
        setDateRange({ from, to })
      }
    }
  }, [startParam, endParam, dateRange, setDateRange])

  // When store changes, update query params
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      const start = formatDateForApi(dateRange.from)
      const end = formatDateForApi(dateRange.to)
      if (searchParams.get('start') !== start || searchParams.get('end') !== end) {
        const params = new URLSearchParams(searchParams)
        params.set('start', start)
        params.set('end', end)
        setSearchParams(params, { replace: true })
      }
    }
    // Only depend on dateRange and setSearchParams
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, setSearchParams])

  // Use dateRange from store for filtering
  const selectedStart = dateRange?.from
  const selectedEnd = dateRange?.to
  const selectedStartParam = selectedStart ? formatDateForApi(selectedStart) : undefined
  const selectedEndParam = selectedEnd ? formatDateForApi(selectedEnd) : undefined

  let prevStartParam: string | undefined = undefined
  let prevEndParam: string | undefined = undefined
  if (selectedStart && selectedEnd) {
    const rangeDays =
      Math.ceil((selectedEnd.getTime() - selectedStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const prevStart = new Date(selectedStart)
    prevStart.setDate(prevStart.getDate() - rangeDays)
    const prevEnd = new Date(selectedStart)
    prevEnd.setDate(prevEnd.getDate() - 1)
    prevStartParam = formatDateForApi(prevStart)
    prevEndParam = formatDateForApi(prevEnd)
  }
  const hasPreviousRange = Boolean(prevStartParam && prevEndParam)

  const { isLoading: isLoadingCategories, data: categories } = useV1CategoriesList(
    {},
    { swr: { revalidateOnMount: true } },
  )
  const { isLoading: isLoadingBudgets } = useV1BudgetsList({}, { swr: { revalidateOnMount: true } })
  const { isLoading: isLoadingTransactions, data: transactions } = useV1TransactionsList(
    {
      start_date: selectedStartParam,
      end_date: selectedEndParam,
    },
    { swr: { revalidateOnMount: true } },
  )
  const { isLoading: isLoadingPreviousTransactions, data: previousTransactions } =
    useV1TransactionsList(
      {
        start_date: prevStartParam,
        end_date: prevEndParam,
      },
      {
        swr: {
          revalidateOnMount: true,
          isPaused: () => !hasPreviousRange,
        },
      },
    )

  if (
    isLoadingCategories ||
    isLoadingBudgets ||
    isLoadingTransactions ||
    (hasPreviousRange && isLoadingPreviousTransactions)
  ) {
    return <AnimateSpinner size={64} />
  }

  // Show empty state if no categories exist
  if (!categories?.results?.length) {
    return (
      <div className='p-6'>
        <EmptyPlaceholder
          icon={<CircleDollarSign className='w-12 h-12' />}
          title='Welcome to FinTrack!'
          description='Start by creating some categories to organize your transactions. This will help you track your income and expenses better.'
          action={
            <Link to='/categories'>
              <Button>
                <Plus className='mr-2 h-4 w-4' /> Create Categories
              </Button>
            </Link>
          }
        />
      </div>
    )
  }

  const filteredTransactions = transactions?.results || []

  // Calculate stats for selected range
  const stats = filteredTransactions.reduce(
    (acc, transaction: Transaction) => {
      const amount = Number(transaction.amount) || 0
      if (transaction.type === TypeEnum.income) {
        acc.totalBalance += amount
        acc.monthlyIncome += amount
      } else {
        acc.totalBalance -= amount
        acc.monthlyExpenses += amount
      }
      return acc
    },
    {
      totalBalance: 0,
      monthlyIncome: 0,
      monthlyExpenses: 0,
    },
  )

  // For comparison, calculate stats for previous period of same length
  let prevTransactions: Transaction[] = []
  let prevStats = { prevMonthIncome: 0, prevMonthExpenses: 0 }
  if (hasPreviousRange) {
    prevTransactions = previousTransactions?.results || []
    prevStats = prevTransactions.reduce(
      (acc, transaction: Transaction) => {
        const amount = Number(transaction.amount) || 0
        if (transaction.type === TypeEnum.income) {
          acc.prevMonthIncome += amount
        } else {
          acc.prevMonthExpenses += amount
        }
        return acc
      },
      {
        prevMonthIncome: 0,
        prevMonthExpenses: 0,
      },
    )
  }

  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  const incomeChange = calculatePercentageChange(stats.monthlyIncome, prevStats.prevMonthIncome)
  const expensesChange = calculatePercentageChange(
    stats.monthlyExpenses,
    prevStats.prevMonthExpenses,
  )
  const savingsRate =
    stats.monthlyIncome > 0
      ? ((stats.monthlyIncome - stats.monthlyExpenses) / stats.monthlyIncome) * 100
      : 0
  const prevSavingsRate =
    prevStats.prevMonthIncome > 0
      ? ((prevStats.prevMonthIncome - prevStats.prevMonthExpenses) / prevStats.prevMonthIncome) *
        100
      : 0
  const savingsRateChange = calculatePercentageChange(savingsRate, prevSavingsRate)

  // Show empty state if no transactions exist for the selected range
  if (!filteredTransactions.length) {
    return (
      <div className='p-6'>
        <EmptyPlaceholder
          icon={<CircleDollarSign className='w-12 h-12' />}
          title='No transactions yet'
          description='Add your first transaction to start tracking your finances. Your dashboard will come alive with insights as you add more data!'
          action={
            <Link to='/transactions'>
              <Button>Add Transaction</Button>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-4 p-6'>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              <CurrencyDisplay amount={~~stats.totalBalance.toFixed(2)} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-emerald-600'>
              <CurrencyDisplay amount={~~stats.monthlyIncome.toFixed(2)} />
            </div>
            <p className='text-xs text-muted-foreground'>
              {incomeChange >= 0 ? '+' : ''}
              {incomeChange.toFixed(1)}% from previous period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-rose-600'>
              <CurrencyDisplay amount={~~stats.monthlyExpenses.toFixed(2)} />
            </div>
            <p className='text-xs text-muted-foreground'>
              {expensesChange >= 0 ? '+' : ''}
              {expensesChange.toFixed(1)}% from previous period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Savings Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{savingsRate.toFixed(1)}%</div>
            <p className='text-xs text-muted-foreground'>
              {savingsRateChange >= 0 ? '+' : ''}
              {savingsRateChange.toFixed(1)}% from previous period
            </p>
          </CardContent>
        </Card>
      </div>
      <Tabs defaultValue='overview' className='space-y-4'>
        <div className='flex justify-between items-center'>
          <TabsList>
            <TabsTrigger value='overview'>Overview</TabsTrigger>
            <TabsTrigger value='budgets'>Budgets</TabsTrigger>
          </TabsList>
          <DatePickerWithRange />
        </div>
        <TabsContent value='overview' className='space-y-4'>
          <div className='grid gap-4 md:grid-cols-8'>
            <Card className='md:col-span-4'>
              <CardHeader>
                <CardTitle>Financial Overview</CardTitle>
              <CardDescription>Your income and expenses for the selected period</CardDescription>
              </CardHeader>
              <CardContent className=''>
                <Overview transactions={filteredTransactions} />
              </CardContent>
            </Card>
            <Card className='md:col-span-4'>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Your latest financial activities</CardDescription>
              </CardHeader>
              <CardContent>
                <RecentTransactions />
              </CardContent>
            </Card>
            <Card className='md:col-span-8'>
              <CardHeader>
                <CardTitle>Pinned Reports</CardTitle>
                <CardDescription>Quick access to saved and pinned analytics.</CardDescription>
              </CardHeader>
              <CardContent>
                <PinnedReports />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value='budgets' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Budget Progress</CardTitle>
              <CardDescription>Your monthly budget progress by category</CardDescription>
            </CardHeader>
            <CardContent>
              <BudgetProgress />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
