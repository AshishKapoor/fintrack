'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { createTransferTransaction, listAccounts, type FinanceAccount } from '@/lib/finance-client'
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
  const { t } = useTranslation()
  const [accounts, setAccounts] = useState<FinanceAccount[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [fromAccountId, setFromAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [transferDate, setTransferDate] = useState<Date>(new Date())

  useEffect(() => {
    if (!open) return
    let cancelled = false

    const load = async () => {
      try {
        setIsLoading(true)
        const data = await listAccounts()
        if (!cancelled) {
          setAccounts(data)
          if (data.length >= 2) {
            setFromAccountId((prev) => prev || String(data[0].id))
            setToAccountId((prev) => prev || String(data[1].id))
          }
        }
      } catch {
        if (!cancelled) {
          toast.error(t('addTransfer.loadAccountsFailed'))
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [open, t])

  const reset = () => {
    setAmount('')
    setMemo('')
    setTransferDate(new Date())
  }

  const handleCreateTransfer = async () => {
    const parsedAmount = Number(amount)
    if (!fromAccountId || !toAccountId || !parsedAmount || parsedAmount <= 0) {
      toast.error(t('addTransfer.invalidInput'))
      return
    }
    if (fromAccountId === toAccountId) {
      toast.error(t('addTransfer.sameAccount'))
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
      toast.success(t('addTransfer.created'))
      onCreated?.()
      onOpenChange(false)
      reset()
    } catch {
      toast.error(t('addTransfer.createFailed'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[480px]'>
        <DialogHeader>
          <DialogTitle>{t('addTransfer.title')}</DialogTitle>
          <DialogDescription>
            {t('addTransfer.description')}
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4 py-2'>
          <div className='grid gap-2'>
            <Label htmlFor='transfer-from'>{t('addTransfer.fromAccount')}</Label>
            <Select value={fromAccountId} onValueChange={setFromAccountId}>
              <SelectTrigger id='transfer-from'>
                <SelectValue placeholder={t('addTransfer.fromPlaceholder')} />
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
            <Label htmlFor='transfer-to'>{t('addTransfer.toAccount')}</Label>
            <Select value={toAccountId} onValueChange={setToAccountId}>
              <SelectTrigger id='transfer-to'>
                <SelectValue placeholder={t('addTransfer.toPlaceholder')} />
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
            <Label htmlFor='transfer-amount'>{t('addTransfer.amount')}</Label>
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
            <Label htmlFor='transfer-date'>{t('addTransfer.date')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id='transfer-date'
                  variant='outline'
                  className={cn('justify-start text-left font-normal', !transferDate && 'text-muted-foreground')}
                >
                  <CalendarIcon className='mr-2 h-4 w-4' />
                  {transferDate ? format(transferDate, 'PPP') : t('addTransfer.pickDate')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-auto p-0' align='start'>
                <Calendar mode='single' selected={transferDate} onSelect={(d) => d && setTransferDate(d)} />
              </PopoverContent>
            </Popover>
          </div>

          <div className='grid gap-2'>
            <Label htmlFor='transfer-memo'>{t('addTransfer.memo')}</Label>
            <Input
              id='transfer-memo'
              placeholder={t('addTransfer.memoPlaceholder')}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleCreateTransfer} disabled={isLoading}>
            {t('addTransfer.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
