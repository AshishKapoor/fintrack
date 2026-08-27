import { useAllCategories } from '@/lib/finance-lists'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, Check, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import useSWR from 'swr'

import type { LedgerTransaction } from '@/client/gen/pft/ledgerTransaction'
import {
  v1FinanceTransactionsCreate,
  v1FinanceTransactionsUpdate,
} from '@/client/gen/pft/v1/v1'
import { PayeeCombobox } from '@/components/payee-combobox'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TableCell, TableRow } from '@/components/ui/table'
import { getDefaultBudgetFile, getDefaultBudgetFileId } from '@/lib/finance-client'
import {
  buildPostings,
  displayFields,
  resolveDefaultAccountId,
  useInvalidateLedger,
  type TransactionKind,
} from '@/lib/ledger'

interface DraftState {
  date: Date
  payeeId: number | null
  categoryId: string
  amount: string
  kind: TransactionKind
  memo: string
}

function emptyDraft(): DraftState {
  return { date: new Date(), payeeId: null, categoryId: '', amount: '', kind: 'expense', memo: '' }
}

function draftFromTransaction(transaction: LedgerTransaction): DraftState {
  const display = displayFields(transaction)
  return {
    date: new Date(transaction.transaction_date),
    payeeId: transaction.payee ?? null,
    categoryId: display.categoryId ? String(display.categoryId) : '',
    amount: display.amount.toFixed(2),
    kind: display.kind,
    memo: display.title,
  }
}

/**
 * One table row, editable in place - the "keyboard-first" register entry
 * ROADMAP.md's Phase 1 asks for. Used two ways: pinned at the top of the
 * table with no `transaction` prop (always-open quick-add), and swapped in
 * for a specific row when its Edit action is clicked. Split transactions
 * (more than one category leg) fall back to the full dialog instead of
 * rendering here - a single amount/category pair per row doesn't have room
 * for an arbitrary split, and the dialog already handles that case well.
 */
export function InlineTransactionRow({
  transaction,
  onDone,
  onCancel,
}: {
  transaction?: LedgerTransaction
  onDone: () => void
  onCancel?: () => void
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<DraftState>(() =>
    transaction ? draftFromTransaction(transaction) : emptyDraft(),
  )
  const [saving, setSaving] = useState(false)
  const amountRef = useRef<HTMLInputElement>(null)

  const { data: categories } = useAllCategories()
  const { data: activeFile } = useSWR('active-budget-file', getDefaultBudgetFile)
  const refreshLedger = useInvalidateLedger()

  useEffect(() => {
    if (!transaction) amountRef.current?.focus()
  }, [transaction])

  const filteredCategories = (categories ?? []).filter(
    (category) =>
      category.kind === draft.kind &&
      !category.is_archived &&
      (activeFile ? category.budget_file === activeFile.id : true),
  )

  const canSave = draft.amount !== '' && Number(draft.amount) > 0 && !!draft.categoryId

  const reset = () => setDraft(emptyDraft())

  const save = async () => {
    if (!canSave || saving) return
    setSaving(true)
    try {
      const postings = buildPostings(
        transaction
          ? (transaction.posting_lines.find((line) => line.account !== null)?.account ??
              (await resolveDefaultAccountId()))
          : await resolveDefaultAccountId(),
        parseInt(draft.categoryId),
        draft.amount,
        draft.kind,
      )
      if (transaction) {
        await v1FinanceTransactionsUpdate(String(transaction.id), {
          budget_file: transaction.budget_file,
          transaction_date: format(draft.date, 'yyyy-MM-dd'),
          memo: draft.memo,
          payee: draft.payeeId,
          postings,
        } as never)
        toast.success('Transaction updated successfully')
      } else {
        const budgetFileId = await getDefaultBudgetFileId()
        await v1FinanceTransactionsCreate({
          budget_file: budgetFileId,
          transaction_date: format(draft.date, 'yyyy-MM-dd'),
          memo: draft.memo || (draft.payeeId ? '' : 'Transaction'),
          payee: draft.payeeId,
          postings,
        } as never)
        toast.success('Transaction created successfully')
        reset()
      }
      await refreshLedger()
      onDone()
    } catch (err) {
      console.error('Failed to save transaction:', err)
      toast.error('Failed to save transaction')
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      void save()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      if (transaction) onCancel?.()
      else reset()
    }
  }

  return (
    <TableRow className='bg-muted/30' onKeyDown={handleKeyDown}>
      <TableCell>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant='outline' size='sm' className='w-full justify-start font-normal'>
              <CalendarIcon className='mr-2 h-3.5 w-3.5' />
              {format(draft.date, 'dd MMM')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-auto p-0'>
            <Calendar
              mode='single'
              selected={draft.date}
              onSelect={(date) => date && setDraft((d) => ({ ...d, date }))}
            />
          </PopoverContent>
        </Popover>
      </TableCell>
      <TableCell>
        <div className='flex items-center gap-2'>
          <Select
            value={draft.kind}
            onValueChange={(value) =>
              setDraft((d) => ({ ...d, kind: value as TransactionKind, categoryId: '' }))
            }
          >
            <SelectTrigger className='w-28 shrink-0'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='expense'>{t('quickAdd.expense')}</SelectItem>
              <SelectItem value='income'>{t('quickAdd.income')}</SelectItem>
            </SelectContent>
          </Select>
          <div className='min-w-0 flex-1'>
            <PayeeCombobox
              budgetFileId={activeFile?.id ?? transaction?.budget_file ?? null}
              value={draft.payeeId}
              onChange={(payeeId) => setDraft((d) => ({ ...d, payeeId }))}
            />
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Select
          value={draft.categoryId}
          onValueChange={(value) => setDraft((d) => ({ ...d, categoryId: value }))}
        >
          <SelectTrigger aria-label={t('quickAdd.category')}>
            <SelectValue placeholder={t('quickAdd.category')} />
          </SelectTrigger>
          <SelectContent>
            {filteredCategories.map((category) => (
              <SelectItem key={category.id} value={String(category.id)}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          ref={amountRef}
          type='number'
          min='0'
          step='0.01'
          placeholder='0.00'
          className='w-24'
          value={draft.amount}
          onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
        />
      </TableCell>
      <TableCell>
        <div className='flex items-center gap-1'>
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8'
            disabled={!canSave || saving}
            onClick={save}
            aria-label={t('common.save')}
          >
            <Check className='h-4 w-4 text-emerald-600' />
          </Button>
          {transaction && (
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8'
              onClick={onCancel}
              aria-label={t('common.cancel')}
            >
              <X className='h-4 w-4' />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}
