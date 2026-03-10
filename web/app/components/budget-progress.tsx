'use client'

import {
  useV1BudgetsList,
  useV1CategoriesList,
  useV1TransactionsList,
} from '@/client/gen/pft/v1/v1'
import { CurrencyDisplay } from '@/components/ui/currency-display'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'
import { AnimateSpinner } from '@/components/spinner'
import { Button } from '@/components/ui/button'
import { EmptyPlaceholder } from '@/components/ui/empty-placeholder'
import { CircleDollarSign, Plus } from 'lucide-react'
import { TypeEnum } from '@/client/gen/pft/typeEnum'
import { formatDateForApi } from '@/lib/date'

export function BudgetProgress() {
  const currentMonth = new Date()
  const currentMonthNumber = currentMonth.getMonth() + 1
  const currentYear = currentMonth.getFullYear()
  const firstDayOfMonth = new Date(currentYear, currentMonth.getMonth(), 1)
  const lastDayOfMonth = new Date(currentYear, currentMonth.getMonth() + 1, 0)

  const { data: budgets, isLoading } = useV1BudgetsList()
  const { data: categories, isLoading: isLoadingCategories } = useV1CategoriesList()
  const { data: transactions, isLoading: isLoadingTransactions } = useV1TransactionsList({
    start_date: formatDateForApi(firstDayOfMonth),
    end_date: formatDateForApi(lastDayOfMonth),
  })

  const calculateSpentAmount = (categoryId: number) => {
    if (!Array.isArray(transactions?.results)) return 0

    return transactions.results
      .filter((transaction) => {
        return (
          transaction.category === categoryId &&
          categories?.results?.find((c) => c.id === transaction.category)?.type === TypeEnum.expense
        )
      })
      .reduce((total, transaction) => total + parseFloat(transaction.amount), 0)
  }

  if (isLoading || isLoadingCategories || isLoadingTransactions) {
    return <AnimateSpinner size={64} />
  }

  // Check if categories exist first
  if (!categories?.results?.length) {
    return (
      <EmptyPlaceholder
        icon={<CircleDollarSign className='w-12 h-12' />}
        title='No categories available'
        description='Create expense categories first to set up budgets for them.'
        action={
          <Link to='/categories'>
            <Button>
              <Plus className='mr-2 h-4 w-4' /> Create Categories
            </Button>
          </Link>
        }
      />
    )
  }

  const budgetsForCurrentMonth =
    budgets?.results?.filter(
      (budget) => budget.month === currentMonthNumber && budget.year === currentYear,
    ) || []

  // Then check for current-month budgets
  if (!budgetsForCurrentMonth.length) {
    return (
      <EmptyPlaceholder
        icon={<CircleDollarSign className='w-12 h-12' />}
        title='No budgets set for this month'
        description='Track your spending by setting monthly budgets for your expense categories.'
        action={
          <Link to='/budgets'>
            <Button>
              <Plus className='mr-2 h-4 w-4' /> Create Budget
            </Button>
          </Link>
        }
      />
    )
  }

  return (
    <div className='space-y-6'>
      {budgetsForCurrentMonth.map((budget) => {
        const spent = calculateSpentAmount(budget.category) || 0
        const limit = parseFloat(budget.amount_limit)
        const percentage = limit ? Math.round((spent / limit) * 100) : 0

        return (
          <div key={budget.id} className='space-y-2'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium'>
                  {categories?.results?.find((c) => c.id === budget.category)?.name}
                </p>
                <p className='text-xs text-muted-foreground'>
                  <CurrencyDisplay amount={spent} /> of <CurrencyDisplay amount={limit} />
                </p>
              </div>
              <p
                className={cn(
                  'text-sm font-medium',
                  percentage >= 100
                    ? 'text-rose-600'
                    : percentage >= 85
                    ? 'text-amber-600'
                    : 'text-emerald-600',
                )}
              >
                {percentage}%
              </p>
            </div>
            <Progress
              value={percentage}
              className={cn(
                percentage >= 100 ? 'text-rose-600' : percentage >= 85 ? 'text-amber-600' : '',
              )}
            />
          </div>
        )
      })}
      <Link to='/budgets'>
        <Button variant='outline' className='w-full'>
          View All Budgets
        </Button>
      </Link>
    </div>
  )
}
