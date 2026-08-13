'use client'

import { AnimateSpinner } from '@/components/spinner'
import { Button } from '@/components/ui/button'
import { CurrencyDisplay } from '@/components/ui/currency-display'
import { EmptyPlaceholder } from '@/components/ui/empty-placeholder'
import { Progress } from '@/components/ui/progress'
import { useCurrentEnvelopeSnapshot } from '@/lib/ledger'
import { cn } from '@/lib/utils'
import { CircleDollarSign, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

/**
 * Current-month budget bars, straight from the envelope snapshot.
 *
 * One request replaces three: the server computes assigned and spent per
 * category (api/pft/finance_services.build_envelope_snapshot), where the old
 * version fetched budgets, categories and a month of transactions and summed
 * client-side - over a paginated list, so totals could silently miss rows.
 */
export function BudgetProgress() {
  const { data: snapshot, isLoading } = useCurrentEnvelopeSnapshot()

  if (isLoading) {
    return <AnimateSpinner size={64} />
  }

  const rows = (snapshot?.assignments ?? []).filter((row) => Number(row.assigned) > 0)

  if (!rows.length) {
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
      {rows.map((row) => {
        const spent = Number(row.spent)
        const limit = Number(row.assigned) + Number(row.carryover)
        const percentage = limit ? Math.round((spent / limit) * 100) : 0

        return (
          <div key={row.category_id} className='space-y-2'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium'>{row.category}</p>
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
              value={Math.min(percentage, 100)}
              className={cn(
                percentage >= 100 ? 'text-rose-600' : percentage >= 85 ? 'text-amber-600' : '',
              )}
            />
          </div>
        )
      })}
    </div>
  )
}
