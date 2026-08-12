'use client'

import { Transaction } from '@/client/gen/pft/transaction'
import { TypeEnum } from '@/client/gen/pft/typeEnum'

import {
  useV1CategoriesList,
  useV1TransactionsList,
  useV1TransactionsUpdate,
} from '@/client/gen/pft/v1/v1'
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
  transaction: Transaction
}) {
  const [type, setType] = useState<TypeEnum>(TypeEnum.expense)
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

  const { data: categories, isLoading: isLoadingCategories } = useV1CategoriesList()
  const { mutate: refreshTransactions } = useV1TransactionsList()
  const { trigger: updateTransaction } = useV1TransactionsUpdate(transaction?.id?.toString()) // Ensure id is a string

  // Initialize form with transaction data
  useEffect(() => {
    if (transaction) {
      const category = categories?.results?.find((c) => c.id === transaction.category)
      setType(category?.type || TypeEnum.expense)
      setTitle(transaction.title || '')
      setAmount(transaction.amount?.toString() || '')
      setSelectedCategory(transaction.category?.toString() || '')

      if (transaction.transaction_date) {
        setDate(new Date(transaction.transaction_date))
      }
    }
  }, [transaction, categories])

  const handleUpdateTransaction = async () => {
    if (!date) return

    try {
      await updateTransaction({
        type,
        title,
        amount,
        category: parseInt(selectedCategory),
        transaction_date: format(date, 'yyyy-MM-dd'),
        user: transaction.user,
      })

      refreshTransactions(undefined, {
        revalidate: true,
      })

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

  const filteredCategories = categories?.results?.filter((category) => category.type === type) || []

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
              value={type}
              onValueChange={(value) => {
                setType(value as TypeEnum)
                setSelectedCategory('')
              }}
              className='flex'
            >
              <div className='flex items-center space-x-2'>
                <RadioGroupItem value={TypeEnum.expense} id='expense' />
                <Label htmlFor='expense' className='cursor-pointer'>
                  Expense
                </Label>
              </div>
              <div className='flex items-center space-x-2 ml-4'>
                <RadioGroupItem value={TypeEnum.income} id='income' />
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
                    No {type === TypeEnum.income ? 'income' : 'expense'} categories found
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
