'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { currencies, useCurrency } from '@/context/currency-context'
import { useInvalidateLedger } from '@/lib/ledger'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

/**
 * The budget's home currency, set deliberately rather than from a top-bar pill.
 *
 * It is not a display preference. Accounts without a currency of their own
 * inherit it, so their amounts keep the same numbers under the new symbol -
 * nothing is converted - while totals that combine accounts in other
 * currencies are re-converted into it. That is worth a confirmation.
 */
export function BudgetCurrencySettings() {
  const { t } = useTranslation()
  const { currency, setCurrency } = useCurrency()
  const [pendingCode, setPendingCode] = useState(currency.code)
  const [confirming, setConfirming] = useState(false)
  const invalidateLedger = useInvalidateLedger()

  const pending = currencies.find((c) => c.code === pendingCode) ?? currency
  const changed = pending.code !== currency.code

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('budgetCurrency.title')}</CardTitle>
        <CardDescription>{t('budgetCurrency.description')}</CardDescription>
      </CardHeader>
      <CardContent className='flex flex-wrap items-end gap-3'>
        <div className='grid gap-2'>
          <Label htmlFor='budget-currency'>{t('budgetCurrency.label')}</Label>
          <Select value={pendingCode} onValueChange={setPendingCode}>
            <SelectTrigger id='budget-currency' className='w-64'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name} ({c.symbol}, {c.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button disabled={!changed} onClick={() => setConfirming(true)}>
          {t('budgetCurrency.change')}
        </Button>
      </CardContent>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('budgetCurrency.confirmTitle', { name: pending.name, code: pending.code })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('budgetCurrency.confirmBody', {
                from: currency.code,
                to: pending.code,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('budgetCurrency.cancel', { from: currency.code })}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await setCurrency(pending)
                  invalidateLedger()
                  toast.success(t('budgetCurrency.changed', { code: pending.code }))
                } catch {
                  setPendingCode(currency.code)
                  toast.error(t('budgetCurrency.failed'))
                }
              }}
            >
              {t('budgetCurrency.confirm', { code: pending.code })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
