'use client'

import { format } from 'date-fns'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import useSWR from 'swr'

import {
  useV1FinanceCategoriesList,
  v1FinancePayeesSuggestedCategoryRetrieve,
  v1FinanceTransactionsCreate,
} from '@/client/gen/pft/v1/v1'
import { InstallPrompt } from '@/components/install-prompt'
import { PayeeCombobox } from '@/components/payee-combobox'
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
import { getDefaultBudgetFile, getDefaultBudgetFileId } from '@/lib/finance-client'
import {
  buildPostings,
  resolveDefaultAccountId,
  useInvalidateLedger,
  type TransactionKind,
} from '@/lib/ledger'
import { cn } from '@/lib/utils'

/**
 * The mobile quick-capture screen ROADMAP.md's Phase 1 asks for:
 * amount -> payee (autocomplete that learns payee -> category) -> done.
 * Reachable from the sidebar, the command palette, and (once installed) the
 * manifest's "Quick Add" shortcut - see public/manifest.webmanifest. Saves
 * through the normal generated client, so it inherits httpPFTClient's
 * offline mutation queue for free: a save attempted with no connection is
 * queued and replayed automatically once one returns, rather than lost.
 */
export default function QuickAddPage() {
  const { t } = useTranslation()
  const amountRef = useRef<HTMLInputElement>(null)

  const [amount, setAmount] = useState('')
  const [kind, setKind] = useState<TransactionKind>('expense')
  const [payeeId, setPayeeId] = useState<number | null>(null)
  const [payeeName, setPayeeName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [categoryTouched, setCategoryTouched] = useState(false)
  const [wasSuggested, setWasSuggested] = useState(false)
  const [suggestionSource, setSuggestionSource] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const { data: categories } = useV1FinanceCategoriesList()
  const { data: activeFile } = useSWR('active-budget-file', getDefaultBudgetFile)
  const refreshLedger = useInvalidateLedger()

  useEffect(() => {
    amountRef.current?.focus()
  }, [])

  // Learn from history: the payee's most-used category, prefilled but never
  // overriding a category the person already picked for this entry. Clearing
  // the payee resets wasSuggested at the point it's cleared (the combobox's
  // onChange below), not reactively here - a bare early return keeps every
  // setState in this effect inside the fetch callback, not the effect body.
  useEffect(() => {
    if (!payeeId) return
    let cancelled = false
    v1FinancePayeesSuggestedCategoryRetrieve(String(payeeId)).then((result) => {
      if (cancelled) return
      if (result.category && !categoryTouched) {
        setCategoryId(String(result.category))
        setWasSuggested(true)
        setSuggestionSource(result.source ?? null)
      }
    })
    return () => {
      cancelled = true
    }
    // categoryTouched is read, not depended on: re-fetching on every keypress
    // that flips it would fight the user's own edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payeeId])

  const filteredCategories = (categories ?? []).filter(
    (category) =>
      category.kind === kind &&
      !category.is_archived &&
      (activeFile ? category.budget_file === activeFile.id : true),
  )

  const canSave = amount !== '' && Number(amount) > 0 && !!categoryId && !saving

  const resetForNext = () => {
    setAmount('')
    setPayeeId(null)
    setPayeeName('')
    setCategoryId('')
    setCategoryTouched(false)
    setWasSuggested(false)
    setSuggestionSource(null)
    amountRef.current?.focus()
  }

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      const [budgetFileId, accountId] = await Promise.all([
        getDefaultBudgetFileId(),
        resolveDefaultAccountId(),
      ])
      await v1FinanceTransactionsCreate({
        budget_file: budgetFileId,
        transaction_date: format(new Date(), 'yyyy-MM-dd'),
        payee: payeeId,
        postings: buildPostings(accountId, parseInt(categoryId), amount, kind),
      } as never)
      await refreshLedger()
      toast.success(t('quickAdd.saved'))
      resetForNext()
    } catch (err) {
      if (err && typeof err === 'object' && 'queued' in err) {
        toast.success(t('quickAdd.savedOffline'))
        resetForNext()
      } else {
        console.error('Failed to save transaction:', err)
        toast.error(t('quickAdd.error'))
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='mx-auto flex min-h-full max-w-sm flex-col gap-6 p-6'>
      <div>
        <h1 className='text-2xl font-semibold'>{t('quickAdd.title')}</h1>
        <p className='text-sm text-muted-foreground'>{t('quickAdd.subtitle')}</p>
      </div>

      <InstallPrompt />

      <div className='flex gap-2'>
        <Button
          type='button'
          variant={kind === 'expense' ? 'default' : 'outline'}
          className='flex-1'
          onClick={() => {
            setKind('expense')
            setCategoryId('')
            setCategoryTouched(false)
          }}
        >
          {t('quickAdd.expense')}
        </Button>
        <Button
          type='button'
          variant={kind === 'income' ? 'default' : 'outline'}
          className='flex-1'
          onClick={() => {
            setKind('income')
            setCategoryId('')
            setCategoryTouched(false)
          }}
        >
          {t('quickAdd.income')}
        </Button>
      </div>

      <div className='grid gap-2'>
        <Label htmlFor='quick-add-amount'>{t('quickAdd.amount')}</Label>
        <Input
          ref={amountRef}
          id='quick-add-amount'
          type='number'
          inputMode='decimal'
          min='0'
          step='0.01'
          placeholder='0.00'
          className='h-16 text-center text-4xl font-semibold tabular-nums'
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <div className='grid gap-2'>
        <Label>{t('quickAdd.payee')}</Label>
        <PayeeCombobox
          budgetFileId={activeFile?.id ?? null}
          value={payeeId}
          onChange={(id, name) => {
            setPayeeId(id)
            setPayeeName(name ?? '')
            if (!id) {
              setWasSuggested(false)
              setSuggestionSource(null)
            }
          }}
        />
      </div>

      <div className='grid gap-2'>
        <Label htmlFor='quick-add-category'>{t('quickAdd.category')}</Label>
        <Select
          value={categoryId}
          onValueChange={(value) => {
            setCategoryId(value)
            setCategoryTouched(true)
          }}
        >
          <SelectTrigger id='quick-add-category' className='h-12'>
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
        {wasSuggested && categoryId && !categoryTouched && (
          <p className='text-xs text-muted-foreground'>
            {suggestionSource === 'ai'
              ? t('quickAdd.categorySuggestedByAi')
              : t('quickAdd.categorySuggested', { payee: payeeName })}
          </p>
        )}
      </div>

      <Button
        size='lg'
        className={cn('h-14 text-lg')}
        disabled={!canSave}
        onClick={save}
      >
        {saving ? t('quickAdd.saving') : t('quickAdd.save')}
      </Button>
    </div>
  )
}
