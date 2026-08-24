import { Plus, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { SplitLeg } from '@/lib/ledger'

interface CategoryOption {
  id: number
  name: string
}

/**
 * One category select + amount per split, an "Add split" affordance, and a
 * running "remaining to allocate" total against the transaction's overall
 * amount - the total is what the user actually typed at the top of the
 * dialog; this only decides how it's divided across categories.
 */
export function SplitPostingsEditor({
  categories,
  totalAmount,
  splits,
  onChange,
}: {
  categories: CategoryOption[]
  totalAmount: string
  splits: SplitLeg[]
  onChange: (splits: SplitLeg[]) => void
}) {
  const { t } = useTranslation()
  const total = Math.abs(Number(totalAmount || 0))
  const allocated = splits.reduce((sum, split) => sum + Math.abs(Number(split.amount || 0)), 0)
  const remaining = Math.round((total - allocated) * 100) / 100

  const updateSplit = (index: number, patch: Partial<SplitLeg>) => {
    onChange(splits.map((split, i) => (i === index ? { ...split, ...patch } : split)))
  }

  const addSplit = () => {
    onChange([
      ...splits,
      { categoryId: 0, amount: remaining > 0 ? remaining.toFixed(2) : '' },
    ])
  }

  const removeSplit = (index: number) => {
    onChange(splits.filter((_, i) => i !== index))
  }

  return (
    <div className='space-y-2'>
      {splits.map((split, index) => (
        <div key={index} className='flex items-center gap-2'>
          <Select
            value={split.categoryId ? String(split.categoryId) : ''}
            onValueChange={(value) => updateSplit(index, { categoryId: parseInt(value) })}
          >
            <SelectTrigger className='flex-1' aria-label={t('quickAdd.category')}>
              <SelectValue placeholder={t('quickAdd.category')} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={String(category.id)}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type='number'
            min='0'
            step='0.01'
            className='w-28'
            placeholder='0.00'
            value={split.amount}
            onChange={(e) => updateSplit(index, { amount: e.target.value })}
          />
          {splits.length > 1 && (
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='h-9 w-9 shrink-0'
              onClick={() => removeSplit(index)}
              aria-label={t('transactions.removeSplit')}
            >
              <X className='h-4 w-4' />
            </Button>
          )}
        </div>
      ))}
      <div className='flex items-center justify-between'>
        <Button type='button' variant='outline' size='sm' onClick={addSplit}>
          <Plus className='mr-1 h-3 w-3' />
          {t('transactions.addSplit')}
        </Button>
        {splits.length > 1 && (
          <span
            className={cn(
              'text-sm tabular-nums',
              remaining !== 0 ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {t('transactions.splitRemaining', { amount: remaining.toFixed(2) })}
          </span>
        )}
      </div>
    </div>
  )
}
