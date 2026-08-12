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
import {
  useInvalidateTransactions,
  useV1TransactionsDestroy,
} from '@/client/pft/v1/v1'
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
  const { trigger: deleteTransaction } = useV1TransactionsDestroy(transactionId)
  const refreshTransactions = useInvalidateTransactions()

  const handleDeleteTransaction = async () => {
    try {
      await deleteTransaction()
      await refreshTransactions()
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
