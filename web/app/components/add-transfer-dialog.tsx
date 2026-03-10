'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'

import { createTransferTransaction, listV2Accounts, V2_ENABLED, type V2Account } from '@/lib/v2-client'
import { cn } from '@/lib/utils'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CalendarIcon } from 'lucide-react'

export function AddTransferDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
}) {
  const [accounts, setAccounts] = useState<V2Account[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [fromAccountId, setFromAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [transferDate, setTransferDate] = useState<Date>(new Date())

  useEffect(() => {
    if (!open || !V2_ENABLED) return
    let cancelled = false

    const load = async () => {
      try {
        setIsLoading(true)
        const data = await listV2Accounts()
        if (!cancelled) {
          setAccounts(data)
          if (data.length >= 2) {
            setFromAccountId((prev) => prev || String(data[0].id))
            setToAccountId((prev) => prev || String(data[1].id))
          }
        }
      } catch {
        if (!cancelled) {
          toast.error('Failed to load accounts for transfer')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [open])

  const reset = () => {
    setAmount('')
    setMemo('')
    setTransferDate(new Date())
  }

  const handleCreateTransfer = async () => {
    if (!V2_ENABLED) {
      toast.error('Transfers are available only in v2 mode')
      return
    }

    const parsedAmount = Number(amount)
    if (!fromAccountId || !toAccountId || !parsedAmount || parsedAmount <= 0) {
      toast.error('Select source/destination accounts and a valid amount')
      return
    }
    if (fromAccountId === toAccountId) {
      toast.error('Source and destination accounts must be different')
      return
    }

    try {
      await createTransferTransaction({
        fromAccountId: Number(fromAccountId),
        toAccountId: Number(toAccountId),
        amount: parsedAmount,
        transactionDate: format(transferDate, 'yyyy-MM-dd'),
        memo: memo.trim() || `Transfer ${parsedAmount.toFixed(2)}`,
      })
      toast.success('Transfer created')
      onCreated?.()
      onOpenChange(false)
      reset()
    } catch {
      toast.error('Failed to create transfer')
    }
  }

  if (!V2_ENABLED) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[480px]'>
        <DialogHeader>
          <DialogTitle>Add Transfer</DialogTitle>
          <DialogDescription>
            Create a paired transfer between two accounts with one balanced ledger transaction.
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4 py-2'>
          <div className='grid gap-2'>
            <Label htmlFor='transfer-from'>From account</Label>
            <Select value={fromAccountId} onValueChange={setFromAccountId}>
              <SelectTrigger id='transfer-from'>
                <SelectValue placeholder='Select source account' />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={String(account.id)}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='grid gap-2'>
            <Label htmlFor='transfer-to'>To account</Label>
            <Select value={toAccountId} onValueChange={setToAccountId}>
              <SelectTrigger id='transfer-to'>
                <SelectValue placeholder='Select destination account' />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={String(account.id)}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='grid gap-2'>
            <Label htmlFor='transfer-amount'>Amount</Label>
            <Input
              id='transfer-amount'
              type='number'
              min='0'
              step='0.01'
              placeholder='0.00'
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className='grid gap-2'>
            <Label htmlFor='transfer-date'>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id='transfer-date'
                  variant='outline'
                  className={cn('justify-start text-left font-normal', !transferDate && 'text-muted-foreground')}
                >
                  <CalendarIcon className='mr-2 h-4 w-4' />
                  {transferDate ? format(transferDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-auto p-0' align='start'>
                <Calendar mode='single' selected={transferDate} onSelect={(d) => d && setTransferDate(d)} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          <div className='grid gap-2'>
            <Label htmlFor='transfer-memo'>Memo</Label>
            <Input
              id='transfer-memo'
              placeholder='Optional memo'
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateTransfer} disabled={isLoading}>
            Create Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
