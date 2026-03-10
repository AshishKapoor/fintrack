'use client'

import { TypeEnum } from '@/client/gen/pft/typeEnum'
import { useV1CategoriesList, useV1TransactionsList } from '@/client/gen/pft/v1/v1'
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
import { Link } from 'react-router-dom'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const categoryIcons: Record<string, any> = {
  Salary: { icon: Briefcase, color: 'text-emerald-500 bg-emerald-100' },
  Housing: { icon: HomeIcon, color: 'text-blue-500 bg-blue-100' },
  Food: { icon: ShoppingBag, color: 'text-orange-500 bg-orange-100' },
  Coffee: { icon: Coffee, color: 'text-amber-500 bg-amber-100' },
  Transportation: { icon: Car, color: 'text-indigo-500 bg-indigo-100' },
}

export function RecentTransactions() {
  const { data: transactions, isLoading } = useV1TransactionsList()
  const { data: categories } = useV1CategoriesList()

  if (isLoading) {
    return <AnimateSpinner size={64} />
  }

  if (!transactions?.results?.length) {
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
      {transactions.results.slice(0, 5).map((transaction: any) => {
        const categoryName =
          categories?.results?.find((category) => category.id === transaction.category)?.name || ''
        const categoryInfo = categoryIcons[categoryName] || {
          icon: ShoppingBag,
          color: 'text-gray-500 bg-gray-100',
        }
        const Icon = categoryInfo.icon

        return (
          <div key={transaction.id} className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className={cn('p-2 rounded-full', categoryInfo.color)}>
                <Icon className='h-4 w-4' />
              </div>
              <div>
                <p className='text-sm font-medium leading-none'>{transaction.title}</p>
                <p className='text-xs text-muted-foreground'>
                  {categoryName} •{' '}
                  {new Date(transaction.transaction_date).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <span
                className={cn(
                  'text-sm font-medium',
                  transaction.type === TypeEnum.income ? 'text-emerald-600' : 'text-rose-600',
                )}
              >
                {transaction.type === TypeEnum.income ? (
                  <span className='flex items-center'>
                    <ArrowUpIcon className='mr-1 h-3 w-3' />
                    <CurrencyDisplay amount={Number(transaction.amount)} />
                  </span>
                ) : (
                  <span className='flex items-center'>
                    <ArrowDownIcon className='mr-1 h-3 w-3' />
                    <CurrencyDisplay amount={Number(transaction.amount)} />
                  </span>
                )}
              </span>
              {/* <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='ghost' size='icon' className='h-8 w-8'>
                    <MoreHorizontal className='h-4 w-4' />
                    <span className='sr-only'>More</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuItem>Edit</DropdownMenuItem>
                  <DropdownMenuItem>Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu> */}
            </div>
          </div>
        )
      })}
      <Link to='/transactions'>
        <Button variant='outline' className='w-full'>
          View All Transactions
        </Button>
      </Link>
    </div>
  )
}
