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
  const refreshLedger = useInvalidateLedger()

  const handleDeleteTransaction = async () => {
    try {
      await v1FinanceTransactionsDestroy(transactionId)
      await refreshLedger()
      toast.success('Transaction deleted successfully')
      onOpenChange(false)
    } catch (err) {
      console.error('Failed to delete transaction:', err)
      toast.error('Failed to delete transaction')
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the transaction from your
            account.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteTransaction}
            className='bg-destructive text-destructive-foreground'
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
