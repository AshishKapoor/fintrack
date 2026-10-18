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
import { v1FinanceTransactionsDestroy } from '@/client/gen/pft/v1/v1'
import { useInvalidateLedger } from '@/lib/ledger'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export function DeleteTransactionAlert({
  open,
  onOpenChange,
  transactionId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  transactionId: string
  currentPage?: number
}) {
  const { t } = useTranslation()
  const refreshLedger = useInvalidateLedger()

  const handleDeleteTransaction = async () => {
    try {
      await v1FinanceTransactionsDestroy(transactionId)
      await refreshLedger()
      toast.success(t('deleteTransaction.deleted'))
      onOpenChange(false)
    } catch (err) {
      console.error('Failed to delete transaction:', err)
      toast.error(t('deleteTransaction.deleteFailed'))
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('deleteTransaction.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('deleteTransaction.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteTransaction}
            className='bg-destructive text-destructive-foreground'
          >
            {t('deleteTransaction.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
