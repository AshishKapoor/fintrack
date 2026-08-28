'use client'

import { useAllCategories } from '@/lib/finance-lists'

import type { LedgerTransaction } from '@/client/gen/pft/ledgerTransaction'
import { v1FinanceTransactionsUpdate } from '@/client/gen/pft/v1/v1'
import {
  buildSplitPostings,
  resolveDefaultAccountId,
  useInvalidateLedger,
  type SplitLeg,
  type TransactionKind,
} from '@/lib/ledger'
import { getDefaultBudgetFile } from '@/lib/finance-client'
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
import { PayeeCombobox } from '@/components/payee-combobox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SplitPostingsEditor } from '@/components/split-postings-editor'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import useSWR from 'swr'

export function EditTransactionDialog({
  open,
  onOpenChange,
  transaction,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: LedgerTransaction
}) {
  const { t } = useTranslation()
  const [kind, setKind] = useState<TransactionKind>('expense')
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [payeeId, setPayeeId] = useState<number | null>(null)
  const [splitMode, setSplitMode] = useState(false)
  const [splits, setSplits] = useState<SplitLeg[]>([{ categoryId: 0, amount: '' }])

  const { data: categories, isLoading: isLoadingCategories } = useAllCategories()
  const { data: activeFile } = useSWR('active-budget-file', getDefaultBudgetFile)
  const refreshLedger = useInvalidateLedger()

  // Initialize form with transaction data. Deferred a tick so the setState
  // burst runs outside the effect body (react-hooks/set-state-in-effect).
  useEffect(() => {
    const id = setTimeout(initialise, 0)
    return () => clearTimeout(id)

    function initialise() {
      if (!transaction) return
      const categoryLegs = transaction.posting_lines.filter((line) => line.category !== null)
      const raw = categoryLegs.reduce((sum, leg) => sum + Number(leg.amount), 0)
      const inferredKind: TransactionKind = raw < 0 ? 'income' : 'expense'
      const total = categoryLegs.reduce((sum, leg) => sum + Math.abs(Number(leg.amount)), 0)

      setKind(inferredKind)
      setTitle(transaction.memo || `Transaction ${transaction.id}`)
      setAmount(total.toFixed(2))
      setPayeeId(transaction.payee ?? null)

      if (categoryLegs.length > 1) {
        setSplitMode(true)
        setSplits(
          categoryLegs.map((leg) => ({
            categoryId: leg.category as number,
            amount: Math.abs(Number(leg.amount)).toFixed(2),
          })),
        )
        setSelectedCategory('')
      } else {
        setSplitMode(false)
        setSelectedCategory(categoryLegs[0]?.category ? String(categoryLegs[0].category) : '')
        setSplits([{ categoryId: categoryLegs[0]?.category ?? 0, amount: total.toFixed(2) }])
      }

      if (transaction.transaction_date) {
        setDate(new Date(transaction.transaction_date))
      }
    }
  }, [transaction])

  const toggleSplitMode = (enabled: boolean) => {
    setSplitMode(enabled)
    if (enabled) {
      setSplits([{ categoryId: parseInt(selectedCategory) || 0, amount }])
    } else if (splits[0]?.categoryId) {
      setSelectedCategory(String(splits[0].categoryId))
    }
  }

  const handleUpdateTransaction = async () => {
    if (!date) return

    try {
      // A PUT replaces the posting set wholesale: the API deletes the old legs
      // and writes the new balanced set, keeping the invariant intact.
      const accountLeg = transaction.posting_lines.find((line) => line.account !== null)
      const accountId = accountLeg?.account ?? (await resolveDefaultAccountId())
      const effectiveSplits = splitMode
        ? splits
        : [{ categoryId: parseInt(selectedCategory), amount }]
      await v1FinanceTransactionsUpdate(String(transaction.id), {
        budget_file: transaction.budget_file,
        transaction_date: format(date, 'yyyy-MM-dd'),
        memo: title,
        payee: payeeId,
        postings: buildSplitPostings(accountId, effectiveSplits, kind),
      } as never)

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
    (category) =>
      category.kind === kind &&
      !category.is_archived &&
      (activeFile ? category.budget_file === activeFile.id : true),
  )

  const splitTotalValid =
    !splitMode ||
    (splits.length > 0 &&
      splits.every((split) => split.categoryId && Number(split.amount) > 0) &&
      Math.abs(
        splits.reduce((sum, split) => sum + Math.abs(Number(split.amount || 0)), 0) -
          Math.abs(Number(amount || 0)),
      ) < 0.005)

  const canSave = !!title && !!amount && (splitMode ? splitTotalValid : !!selectedCategory)

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
            <Label>{t('transactions.payee')}</Label>
            <PayeeCombobox
              budgetFileId={activeFile?.id ?? transaction.budget_file ?? null}
              value={payeeId}
              onChange={setPayeeId}
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
          <div className='flex items-center justify-between'>
            <Label htmlFor='split-mode-edit' className='cursor-pointer font-normal'>
              {t('transactions.splitTransaction')}
            </Label>
            <Switch id='split-mode-edit' checked={splitMode} onCheckedChange={toggleSplitMode} />
          </div>
          {splitMode ? (
            <SplitPostingsEditor
              categories={filteredCategories}
              totalAmount={amount}
              splits={splits}
              onChange={setSplits}
            />
          ) : (
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
          )}
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type='submit' onClick={handleUpdateTransaction} disabled={!canSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
