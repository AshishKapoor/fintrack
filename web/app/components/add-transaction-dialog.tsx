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
import {
  useV1CategoriesList,
  useV1TransactionsCreate,
  useV1TransactionsList,
} from '@/client/gen/pft/v1/v1'
import { toast } from 'sonner'
import { getUser } from '@/lib/auth'
import { TypeEnum } from '@/client/gen/pft/typeEnum'

export function AddTransactionDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [type, setType] = useState<TypeEnum>(TypeEnum.expense)
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

  const { data: categories, isLoading: isLoadingCategories } = useV1CategoriesList()
  const { mutate: refreshTransactions } = useV1TransactionsList()
  const { trigger: createTransaction } = useV1TransactionsCreate()

  const handleCreateTransaction = async () => {
    if (!date) return

    try {
      const user = await getUser()
      await createTransaction({
        type,
        title,
        amount,
        category: parseInt(selectedCategory),
        transaction_date: format(date, 'yyyy-MM-dd'),
        user: user.id,
      })
      refreshTransactions(undefined, {
        revalidate: true,
      })
      toast.success('Transaction created successfully')
      onOpenChange(false)
      // Reset form
      setTitle('')
      setAmount('')
      setSelectedCategory('')
      setDate(new Date()) // Reset to today's date
      setType(TypeEnum.expense)
    } catch (err) {
      console.error('Failed to create transaction:', err)
      toast.error('Failed to create transaction')
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
          <DialogTitle>Transaction</DialogTitle>
          <DialogDescription>Enter the details of your transaction below.</DialogDescription>
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
                  variant={'outline'}
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground',
                  )}
                >
                  <CalendarIcon className='mr-2 h-4 w-4' />
                  {date ? format(date, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-auto p-0' align='start'>
                <Calendar
                  mode='single'
                  selected={date}
                  onSelect={setDate}
                  disabled={(date) => date > new Date()}
                />
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
            disabled={!title || !amount || !selectedCategory}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
