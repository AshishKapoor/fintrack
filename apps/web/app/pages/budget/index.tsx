import { LoadError } from '@/components/load-error'
import { AnimateSpinner } from '@/components/spinner'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Typography from '@/components/ui/typography'
import { formatCurrency, useCurrency } from '@/context/currency-context'
import { useAllCategories } from '@/lib/finance-lists'
import { envelopeView, sortEnvelopes, type EnvelopeView } from '@/lib/home'
import {
  moveBetweenEnvelopes,
  runEnvelopeAction,
  upsertEnvelopeAssignment,
  useCurrentEnvelopeSnapshot,
  useInvalidateLedger,
} from '@/lib/ledger'
import { cn } from '@/lib/utils'
import { Check, ChevronDown, Copy, Eraser, Pencil, Plus, Sigma } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

/**
 * This month's envelopes: money that is ready to assign, and for every
 * envelope what was assigned, what was spent and what is still available.
 *
 * Envelope budgeting, said plainly: an envelope spent exactly as planned is
 * done, not "over budget by $0.00"; an overspent one gets a way forward
 * ("Cover") instead of a red bar.
 */
export default function BudgetsPage() {
  const { t, i18n } = useTranslation()
  const { currency } = useCurrency()
  const money = (amount: number) => formatCurrency(amount, currency.code)

  const {
    data: snapshot,
    isLoading: isLoadingBudgets,
    error: budgetsError,
    mutate: retryBudgets,
  } = useCurrentEnvelopeSnapshot()
  const {
    data: categories,
    isLoading: isLoadingCategories,
    error: categoriesError,
    mutate: retryCategories,
  } = useAllCategories()
  const refreshLedger = useInvalidateLedger()

  const [assigning, setAssigning] = useState<{ categoryId: string; amount: string } | null>(null)
  const [covering, setCovering] = useState<EnvelopeView | null>(null)
  const [confirmZero, setConfirmZero] = useState(false)
  const [saving, setSaving] = useState(false)

  const monthTitle = new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(
    new Date(),
  )

  if (isLoadingBudgets || isLoadingCategories) {
    return <AnimateSpinner size={64} />
  }

  // Checked before any empty state: a failed request is not an empty budget.
  if ((budgetsError && !snapshot) || (categoriesError && !categories)) {
    return (
      <div className='space-y-4 p-4 sm:p-6'>
        <Typography variant='h2' as='h1'>
          {t('budgets.title', { month: monthTitle })}
        </Typography>
        <LoadError
          what={t('loadError.budgets')}
          onRetry={() => {
            void retryBudgets()
            void retryCategories()
          }}
        />
      </div>
    )
  }

  const expenseCategories = (categories ?? []).filter(
    (category) => category.kind === 'expense' && !category.is_archived,
  )
  const rows = snapshot?.assignments ?? []
  const envelopes = sortEnvelopes(rows.map(envelopeView))
  const assignedById = new Map(rows.map((row) => [row.category_id, Number(row.assigned)]))
  const readyToAssign = snapshot ? Number(snapshot.available_to_budget) : 0

  const save = async (work: () => Promise<unknown>, done: string, failed: string) => {
    if (saving) return false
    setSaving(true)
    try {
      await work()
      toast.success(done)
      await refreshLedger()
      return true
    } catch (error) {
      console.error(error)
      toast.error(failed)
      return false
    } finally {
      setSaving(false)
    }
  }

  const openAssign = (categoryId?: number) =>
    setAssigning({
      categoryId: categoryId ? String(categoryId) : '',
      amount: categoryId ? (assignedById.get(categoryId) ?? 0).toFixed(2) : '',
    })

  if (!expenseCategories.length) {
    return (
      <div className='mx-auto max-w-xl space-y-3 p-6 pt-12'>
        <Typography variant='h2' as='h1'>
          {t('budgets.title', { month: monthTitle })}
        </Typography>
        <p className='text-muted-foreground'>{t('budgets.noCategories')}</p>
        <Button asChild>
          <Link to='/categories'>{t('budgets.createCategories')}</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className='mx-auto max-w-5xl space-y-6 p-4 sm:p-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div className='space-y-1'>
          <Typography variant='h2' as='h1'>
            {t('budgets.title', { month: monthTitle })}
          </Typography>
          <p className='text-sm text-muted-foreground'>{t('budgets.subtitle')}</p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' disabled={saving}>
                {t('budgets.fillFrom')}
                <ChevronDown className='h-4 w-4' aria-hidden='true' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem
                onSelect={() =>
                  void save(
                    () => runEnvelopeAction('copy-previous'),
                    t('budgets.copied'),
                    t('budgets.actionFailed'),
                  )
                }
              >
                <Copy className='h-4 w-4' aria-hidden='true' />
                {t('budgets.copyLastMonth')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  void save(
                    () => runEnvelopeAction('three-month-average'),
                    t('budgets.averaged'),
                    t('budgets.actionFailed'),
                  )
                }
              >
                <Sigma className='h-4 w-4' aria-hidden='true' />
                {t('budgets.threeMonthAverage')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant='destructive' onSelect={() => setConfirmZero(true)}>
                <Eraser className='h-4 w-4' aria-hidden='true' />
                {t('budgets.zeroOut')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => openAssign()} disabled={saving}>
            <Plus className='h-4 w-4' aria-hidden='true' />
            {t('budgets.addEnvelope')}
          </Button>
        </div>
      </div>

      {/* Ready to assign: the envelope method's first question. */}
      <section
        aria-label={t('budgets.readyLabel')}
        className={cn(
          'flex flex-wrap items-baseline justify-between gap-2 rounded-xl border p-4 sm:p-5',
          readyToAssign < -0.004 ? 'border-expense/40' : 'bg-card',
        )}
      >
        <p className='text-sm text-muted-foreground'>
          {readyToAssign < -0.004 ? t('budgets.overAssignedLabel') : t('budgets.readyLabel')}
        </p>
        <p
          className={cn(
            'text-2xl font-semibold tabular-nums',
            readyToAssign < -0.004 && 'text-expense',
          )}
        >
          {money(Math.abs(readyToAssign))}
        </p>
        <p className='w-full text-xs text-muted-foreground'>
          {readyToAssign < -0.004 ? t('budgets.overAssignedHint') : t('budgets.readyHint')}
        </p>
      </section>

      {envelopes.length === 0 ? (
        <div className='rounded-xl border bg-card p-8 text-center'>
          <p className='font-medium'>{t('budgets.emptyTitle')}</p>
          <p className='mt-1 text-sm text-muted-foreground'>{t('budgets.emptyBody')}</p>
          <Button className='mt-4' onClick={() => openAssign()}>
            {t('budgets.planThisMonth')}
          </Button>
        </div>
      ) : (
        <div className='rounded-xl border bg-card'>
          <table className='w-full text-sm'>
            <caption className='sr-only'>{t('budgets.tableCaption', { month: monthTitle })}</caption>
            <thead className='border-b text-xs text-muted-foreground'>
              <tr>
                <th scope='col' className='px-4 py-2.5 text-left font-medium'>
                  {t('budgets.envelope')}
                </th>
                <th scope='col' className='hidden px-4 py-2.5 text-right font-medium sm:table-cell'>
                  {t('budgets.assigned')}
                </th>
                <th scope='col' className='hidden px-4 py-2.5 text-right font-medium sm:table-cell'>
                  {t('budgets.spent')}
                </th>
                <th scope='col' className='px-4 py-2.5 text-right font-medium'>
                  {t('budgets.available')}
                </th>
                <th scope='col' className='w-0 px-2 py-2.5'>
                  <span className='sr-only'>{t('budgets.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody className='divide-y'>
              {envelopes.map((envelope) => {
                const row = rows.find((item) => item.category_id === envelope.categoryId)
                const carryover = Number(row?.carryover ?? 0)
                return (
                  <tr key={envelope.categoryId}>
                    <th scope='row' className='px-4 py-3 text-left font-medium'>
                      <span>{envelope.name}</span>
                      {/* Phones drop the two middle columns; keep the figures. */}
                      <span className='mt-0.5 block text-xs font-normal text-muted-foreground sm:hidden'>
                        {t('budgets.assignedSpent', {
                          assigned: money(envelope.budget),
                          spent: money(envelope.spent),
                        })}
                      </span>
                    </th>
                    <td className='hidden px-4 py-3 text-right tabular-nums sm:table-cell'>
                      {money(envelope.budget)}
                      {carryover !== 0 && (
                        <span className='block text-xs text-muted-foreground'>
                          {t('budgets.carryover', { amount: money(carryover) })}
                        </span>
                      )}
                    </td>
                    <td className='hidden px-4 py-3 text-right tabular-nums sm:table-cell'>
                      {money(envelope.spent)}
                    </td>
                    <td className='px-4 py-3 text-right tabular-nums'>
                      <AvailableCell envelope={envelope} money={money} />
                    </td>
                    <td className='px-2 py-3'>
                      <div className='flex items-center justify-end gap-1'>
                        {envelope.state === 'over' && (
                          <Button size='sm' variant='outline' onClick={() => setCovering(envelope)}>
                            {t('budgets.cover')}
                          </Button>
                        )}
                        <Button
                          size='icon'
                          variant='ghost'
                          onClick={() => openAssign(envelope.categoryId)}
                        >
                          <Pencil className='h-4 w-4' aria-hidden='true' />
                          <span className='sr-only'>{t('budgets.changeAssigned', { name: envelope.name })}</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign money to an envelope (new or existing). */}
      <Dialog open={assigning !== null} onOpenChange={(open) => !open && setAssigning(null)}>
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle>{t('budgets.assignTitle')}</DialogTitle>
            <DialogDescription>{t('budgets.assignDescription', { month: monthTitle })}</DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-2'>
            <div className='grid gap-2'>
              <Label htmlFor='category'>{t('budgets.envelope')}</Label>
              <Select
                value={assigning?.categoryId ?? ''}
                onValueChange={(value) =>
                  setAssigning((current) => ({
                    categoryId: value,
                    amount:
                      current?.amount || (assignedById.get(Number(value)) ?? 0).toFixed(2),
                  }))
                }
              >
                <SelectTrigger id='category'>
                  <SelectValue placeholder={t('budgets.chooseEnvelope')} />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='amount'>{t('budgets.assignAmount')}</Label>
              <Input
                id='amount'
                inputMode='decimal'
                placeholder='0.00'
                value={assigning?.amount ?? ''}
                onChange={(event) =>
                  setAssigning((current) => current && { ...current, amount: event.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setAssigning(null)}>
              {t('budgets.cancel')}
            </Button>
            <Button
              disabled={saving || !assigning?.categoryId || assigning.amount === ''}
              onClick={async () => {
                if (!assigning) return
                const ok = await save(
                  () => upsertEnvelopeAssignment(Number(assigning.categoryId), assigning.amount),
                  t('budgets.saved'),
                  t('budgets.saveFailed'),
                )
                if (ok) setAssigning(null)
              }}
            >
              {t('budgets.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {covering && (
        <CoverDialog
          target={covering}
          // Most available first, so the default source covers as much as it can.
          sources={envelopes
            .filter((envelope) => envelope.categoryId !== covering.categoryId && envelope.available > 0)
            .sort((a, b) => b.available - a.available)}
          assignedById={assignedById}
          money={money}
          saving={saving}
          onClose={() => setCovering(null)}
          onCover={async (source, amount) => {
            const ok = await save(
              () =>
                moveBetweenEnvelopes(
                  { categoryId: source.categoryId, assigned: assignedById.get(source.categoryId) ?? 0 },
                  { categoryId: covering.categoryId, assigned: assignedById.get(covering.categoryId) ?? 0 },
                  amount,
                ),
              t('budgets.covered', { amount: money(amount), from: source.name, to: covering.name }),
              t('budgets.saveFailed'),
            )
            if (ok) setCovering(null)
          }}
        />
      )}

      <AlertDialog open={confirmZero} onOpenChange={setConfirmZero}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('budgets.zeroTitle', { month: monthTitle })}</AlertDialogTitle>
            <AlertDialogDescription>{t('budgets.zeroBody')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('budgets.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              onClick={() =>
                void save(() => runEnvelopeAction('zero-out'), t('budgets.zeroed'), t('budgets.actionFailed'))
              }
            >
              {t('budgets.zeroConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function AvailableCell({ envelope, money }: { envelope: EnvelopeView; money: (n: number) => string }) {
  const { t } = useTranslation()
  if (envelope.state === 'over') {
    return <span className='font-medium text-expense'>{t('budgets.overBy', { amount: money(envelope.over) })}</span>
  }
  if (envelope.state === 'done') {
    return (
      <span className='inline-flex items-center gap-1 text-muted-foreground'>
        <Check className='h-3.5 w-3.5' aria-hidden='true' />
        {t('budgets.spentAsPlanned')}
      </span>
    )
  }
  return (
    <span className={cn('font-medium', envelope.state === 'low' && 'text-caution')}>
      {money(envelope.available)}
    </span>
  )
}

function CoverDialog({
  target,
  sources,
  assignedById,
  money,
  saving,
  onClose,
  onCover,
}: {
  target: EnvelopeView
  sources: EnvelopeView[]
  assignedById: Map<number, number>
  money: (n: number) => string
  saving: boolean
  onClose: () => void
  onCover: (source: EnvelopeView, amount: number) => void
}) {
  const { t } = useTranslation()
  const [sourceId, setSourceId] = useState(sources[0] ? String(sources[0].categoryId) : '')
  const source = sources.find((envelope) => String(envelope.categoryId) === sourceId)
  const suggested = source ? Math.min(target.over, source.available) : target.over
  const [amount, setAmount] = useState(suggested.toFixed(2))
  const parsed = Number(amount)
  const valid = Boolean(source) && parsed > 0 && source !== undefined && parsed <= source.available + 0.004

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>{t('budgets.coverTitle', { name: target.name })}</DialogTitle>
          <DialogDescription>
            {t('budgets.coverDescription', { name: target.name, amount: money(target.over) })}
          </DialogDescription>
        </DialogHeader>
        {sources.length === 0 ? (
          <p className='text-sm text-muted-foreground'>{t('budgets.coverNoSources')}</p>
        ) : (
          <div className='grid gap-4 py-2'>
            <div className='grid gap-2'>
              <Label htmlFor='cover-from'>{t('budgets.coverFrom')}</Label>
              <Select
                value={sourceId}
                onValueChange={(value) => {
                  setSourceId(value)
                  const next = sources.find((envelope) => String(envelope.categoryId) === value)
                  if (next) setAmount(Math.min(target.over, next.available).toFixed(2))
                }}
              >
                <SelectTrigger id='cover-from'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sources.map((envelope) => (
                    <SelectItem key={envelope.categoryId} value={String(envelope.categoryId)}>
                      {t('budgets.coverSource', { name: envelope.name, amount: money(envelope.available) })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='cover-amount'>{t('budgets.coverAmount')}</Label>
              <Input
                id='cover-amount'
                inputMode='decimal'
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                aria-describedby='cover-hint'
              />
              {source && (
                <p id='cover-hint' className='text-xs text-muted-foreground'>
                  {t('budgets.coverHint', {
                    name: source.name,
                    amount: money(assignedById.get(source.categoryId) ?? 0),
                  })}
                </p>
              )}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            {t('budgets.cancel')}
          </Button>
          {sources.length > 0 && (
            <Button disabled={!valid || saving} onClick={() => source && onCover(source, parsed)}>
              {t('budgets.coverConfirm', { amount: money(Number.isFinite(parsed) ? parsed : 0) })}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
