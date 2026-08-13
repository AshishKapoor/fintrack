'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useV1FinanceCategoriesList, v1FinanceTransactionsCreate } from '@/client/gen/pft/v1/v1'
import { getDefaultBudgetFile, getDefaultBudgetFileId } from '@/lib/finance-client'
import {
  buildPostings,
  resolveDefaultAccountId,
  useInvalidateLedger,
  type TransactionKind,
} from '@/lib/ledger'
import { toast } from 'sonner'
import useSWR from 'swr'

export function AddTransactionDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [kind, setKind] = useState<TransactionKind>('expense')
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [saving, setSaving] = useState(false)

  // Native finance categories through the generated SDK: the classification
  // field is `kind`, and ids are CategoryV2 ids. No adapter, no /me round-trip
  // (the old create path fetched the user only to send an id the API ignored).
  const { data: categories, isLoading: isLoadingCategories } = useV1FinanceCategoriesList()
  const { data: activeFile } = useSWR('active-budget-file', getDefaultBudgetFile)
  const refreshLedger = useInvalidateLedger()

  const handleCreateTransaction = async () => {
    if (!date || saving) return
    setSaving(true)
    try {
      const [budgetFileId, accountId] = await Promise.all([
        getDefaultBudgetFileId(),
        resolveDefaultAccountId(),
      ])
      await v1FinanceTransactionsCreate({
        budget_file: budgetFileId,
        transaction_date: format(date, 'yyyy-MM-dd'),
        memo: title,
        postings: buildPostings(accountId, parseInt(selectedCategory), amount, kind),
      })
      await refreshLedger()
      toast.success('Transaction created successfully')
      onOpenChange(false)
      // Reset form
      setTitle('')
      setAmount('')
      setSelectedCategory('')
      setDate(new Date())
      setKind('expense')
    } catch (err) {
      console.error('Failed to create transaction:', err)
      toast.error('Failed to create transaction')
    } finally {
      setSaving(false)
    }
  }

  if (isLoadingCategories) {
    return null
  }

  const filteredCategories = (categories ?? []).filter(
    (category) =>
      category.kind === kind &&
      !category.is_archived &&
      (activeFile ? category.budget_file === activeFile.id : true),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Transaction</DialogTitle>
          <DialogDescription>Enter the details of your transaction below.</DialogDescription>
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
              className='flex gap-4'
            >
              <div className='flex items-center space-x-2'>
                <RadioGroupItem value='expense' id='expense' />
                <Label htmlFor='expense' className='cursor-pointer'>
                  Expense
                </Label>
              </div>
              <div className='flex items-center space-x-2'>
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
              min='0'
              step='0.01'
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='category'>Category</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger id='category'>
                <SelectValue placeholder='Select a category' />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.map((category) => (
                  <SelectItem key={category.id} value={String(category.id)}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                <Calendar mode='single' selected={date} onSelect={setDate} autoFocus />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type='submit'
            onClick={handleCreateTransaction}
            disabled={!title || !amount || !selectedCategory || saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
