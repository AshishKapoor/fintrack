'use client'

import type { LedgerTransaction } from '@/client/gen/pft/ledgerTransaction'
import { useV1FinanceCategoriesList, v1FinanceTransactionsUpdate } from '@/client/gen/pft/v1/v1'
import {
  buildPostings,
  displayFields,
  resolveDefaultAccountId,
  useInvalidateLedger,
  type TransactionKind,
} from '@/lib/ledger'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export function EditTransactionDialog({
  open,
  onOpenChange,
  transaction,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: LedgerTransaction
}) {
  const [kind, setKind] = useState<TransactionKind>('expense')
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

  const { data: categories, isLoading: isLoadingCategories } = useV1FinanceCategoriesList()
  const refreshLedger = useInvalidateLedger()

  // Initialize form with transaction data. Deferred a tick so the setState
  // burst runs outside the effect body (react-hooks/set-state-in-effect).
  useEffect(() => {
    const id = setTimeout(initialise, 0)
    return () => clearTimeout(id)

    function initialise() {
      if (!transaction) return
      const display = displayFields(transaction)
      setKind(display.kind)
      setTitle(display.title)
      setAmount(display.amount.toFixed(2))
      setSelectedCategory(display.categoryId ? String(display.categoryId) : '')

      if (transaction.transaction_date) {
        setDate(new Date(transaction.transaction_date))
      }
    }
  }, [transaction])

  const handleUpdateTransaction = async () => {
    if (!date) return

    try {
      // A PUT replaces the posting set wholesale: the API deletes the old legs
      // and writes the new balanced pair, keeping the invariant intact.
      const accountLeg = transaction.posting_lines.find((line) => line.account !== null)
      const accountId = accountLeg?.account ?? (await resolveDefaultAccountId())
      await v1FinanceTransactionsUpdate(String(transaction.id), {
        budget_file: transaction.budget_file,
        transaction_date: format(date, 'yyyy-MM-dd'),
        memo: title,
        postings: buildPostings(accountId, parseInt(selectedCategory), amount, kind),
      })

      await refreshLedger()

      toast.success('Transaction updated successfully')
      onOpenChange(false)
    } catch (err) {
      console.error('Failed to update transaction:', err)
      toast.error('Failed to update transaction')
    }
  }

  if (isLoadingCategories) {
    return null
  }

  const filteredCategories = (categories ?? []).filter(
    (category) => category.kind === kind && !category.is_archived,
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
          <DialogDescription>Update the details of your transaction.</DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <div className='grid gap-2'>
            <Label htmlFor='transaction-type'>Transaction Type</Label>
            <RadioGroup
              id='transaction-type'
              value={kind}
              onValueChange={(value) => {
                setKind(value as TransactionKind)
                setSelectedCategory('')
              }}
              className='flex'
            >
              <div className='flex items-center space-x-2'>
                <RadioGroupItem value='expense' id='expense' />
                <Label htmlFor='expense' className='cursor-pointer'>
                  Expense
                </Label>
              </div>
              <div className='flex items-center space-x-2 ml-4'>
                <RadioGroupItem value='income' id='income' />
                <Label htmlFor='income' className='cursor-pointer'>
                  Income
                </Label>
              </div>
            </RadioGroup>
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='title'>Title</Label>
            <Input
              id='title'
              placeholder='e.g., Grocery Shopping'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='amount'>Amount</Label>
            <Input
              id='amount'
              type='number'
              placeholder='0.00'
              step='0.01'
              min='0'
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='date'>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id='date'
                  variant='outline'
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground',
                  )}
                >
                  <CalendarIcon className='mr-2 h-4 w-4' />
                  {date ? format(date, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-auto p-0'>
                <Calendar mode='single' selected={date} onSelect={setDate} />
              </PopoverContent>
            </Popover>
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='category'>Category</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger id='category'>
                <SelectValue placeholder='Select a category' />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.length === 0 ? (
                  <div className='p-2 text-sm text-center text-muted-foreground'>
                    No {kind} categories found
                  </div>
                ) : (
                  filteredCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type='submit' onClick={handleUpdateTransaction}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
