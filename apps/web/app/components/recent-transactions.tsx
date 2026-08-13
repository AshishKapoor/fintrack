'use client'

import type { LedgerTransaction } from '@/client/gen/pft/ledgerTransaction'
import { useV1FinanceTransactionsList } from '@/client/gen/pft/v1/v1'
import { AnimateSpinner } from '@/components/spinner'
import { Button } from '@/components/ui/button'
import { CurrencyDisplay } from '@/components/ui/currency-display'
import { EmptyPlaceholder } from '@/components/ui/empty-placeholder'
import { cn } from '@/lib/utils'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Briefcase,
  Car,
  Coffee,
  HomeIcon,
  ShoppingBag,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

interface CategoryIcon {
  icon: LucideIcon
  color: string
}

const categoryIcons: Record<string, CategoryIcon> = {
  Salary: { icon: Briefcase, color: 'text-emerald-500 bg-emerald-100' },
  Housing: { icon: HomeIcon, color: 'text-blue-500 bg-blue-100' },
  Food: { icon: ShoppingBag, color: 'text-orange-500 bg-orange-100' },
  Coffee: { icon: Coffee, color: 'text-amber-500 bg-amber-100' },
  Transportation: { icon: Car, color: 'text-indigo-500 bg-indigo-100' },
}

/**
 * Read one ledger transaction into what this widget displays.
 *
 * The category leg carries the classification: its amount is negative for
 * income (money flows out of the income category into the account) and
 * positive for spending. This is the first component reading the finance API
 * natively through the generated SDK instead of the legacy-shape adapter -
 * which also means the category name arrives inline (posting_lines[].category_name)
 * rather than via a second categories request.
 */
function displayFields(transaction: LedgerTransaction) {
  const categoryLeg = transaction.posting_lines.find((line) => line.category !== null)
  const raw = Number(categoryLeg?.amount ?? transaction.posting_lines[0]?.amount ?? 0)
  const isIncome = raw < 0
  return {
    title: transaction.memo || `Transaction ${transaction.id}`,
    categoryName: categoryLeg?.category_name || '',
    amount: Math.abs(raw),
    isIncome,
  }
}

export function RecentTransactions() {
  const { data, isLoading } = useV1FinanceTransactionsList({ page_size: 5 })

  if (isLoading) {
    return <AnimateSpinner size={64} />
  }

  const transactions = data?.results ?? []

  if (!transactions.length) {
    return (
      <EmptyPlaceholder
        icon={<ShoppingBag className='w-12 h-12' />}
        title='No transactions yet'
        description='Your recent transactions will appear here once you add them.'
        action={
          <Link to='/transactions'>
            <Button>Add Transaction</Button>
          </Link>
        }
      />
    )
  }

  return (
    <div className='space-y-4'>
      {transactions.map((transaction) => {
        const { title, categoryName, amount, isIncome } = displayFields(transaction)
        const categoryInfo = categoryIcons[categoryName] || {
          icon: ShoppingBag,
          color: 'text-gray-500 bg-gray-100',
        }
        const Icon = categoryInfo.icon

        return (
          <div key={transaction.id} className='flex items-center'>
            <div className={cn('flex h-9 w-9 items-center justify-center rounded-full', categoryInfo.color)}>
              <Icon className='h-4 w-4' aria-hidden='true' />
            </div>
            <div className='ml-4 space-y-1'>
              <p className='text-sm font-medium leading-none'>{title}</p>
              <p className='text-xs text-muted-foreground'>
                {categoryName || 'Uncategorized'} ·{' '}
                {new Date(transaction.transaction_date).toLocaleDateString()}
              </p>
            </div>
            <div
              className={cn(
                'ml-auto text-sm font-medium flex items-center',
                isIncome ? 'text-emerald-600' : 'text-rose-600',
              )}
            >
              {isIncome ? (
                <ArrowUpIcon className='mr-1 h-3.5 w-3.5' aria-hidden='true' />
              ) : (
                <ArrowDownIcon className='mr-1 h-3.5 w-3.5' aria-hidden='true' />
              )}
              <CurrencyDisplay amount={amount} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
