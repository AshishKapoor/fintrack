'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PiggyBank, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { useCurrency, formatCurrency } from '@/context/currency-context'
import {
  createSavingsGoal,
  deleteSavingsGoal,
  listAccounts,
  listSavingsGoals,
  updateSavingsGoal,
  type FinanceAccount,
  type SavingsGoal,
} from '@/lib/finance-client'

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
import { LoadError } from '@/components/load-error'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmptyPlaceholder } from '@/components/ui/empty-placeholder'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AnimateSpinner } from '@/components/spinner'
import Typography from '@/components/ui/typography'

type GoalForm = {
  account: string
  name: string
  target_amount: string
  target_date: string
}

const EMPTY_FORM: GoalForm = { account: '', name: '', target_amount: '', target_date: '' }

export default function SavingsGoalsPage() {
  const { t } = useTranslation()
  const { currency } = useCurrency()

  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [accounts, setAccounts] = useState<FinanceAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<GoalForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<SavingsGoal | null>(null)

  const loadAll = async () => {
    try {
      setLoadFailed(false)
      setLoading(true)
      const [goalRows, accountRows] = await Promise.all([listSavingsGoals(), listAccounts()])
      setGoals(goalRows)
      setAccounts(accountRows.filter((account) => !account.is_archived))
    } catch {
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAll()
  }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, account: accounts[0] ? String(accounts[0].id) : '' })
    setFormOpen(true)
  }

  const openEdit = (goal: SavingsGoal) => {
    setEditingId(goal.id)
    setForm({
      account: String(goal.account),
      name: goal.name,
      target_amount: goal.target_amount,
      target_date: goal.target_date ?? '',
    })
    setFormOpen(true)
  }

  const submitForm = async () => {
    if (!form.name.trim()) {
      toast.error(t('savingsGoals.nameRequired'))
      return
    }
    if (!form.account) {
      toast.error(t('savingsGoals.accountRequired'))
      return
    }
    if (!(Number(form.target_amount) > 0)) {
      toast.error(t('savingsGoals.targetRequired'))
      return
    }
    setSaving(true)
    try {
      const payload = {
        account: Number(form.account),
        name: form.name,
        target_amount: form.target_amount,
        target_date: form.target_date || null,
      }
      if (editingId) {
        await updateSavingsGoal(editingId, payload)
        toast.success(t('savingsGoals.updated'))
      } else {
        await createSavingsGoal(payload)
        toast.success(t('savingsGoals.created'))
      }
      setFormOpen(false)
      await loadAll()
    } catch {
      // The httpPFTClient interceptor already toasts the server's reason.
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteSavingsGoal(deleteTarget.id)
      toast.success(t('savingsGoals.deleted'))
      setDeleteTarget(null)
      await loadAll()
    } catch {
      // toasted by the interceptor
    }
  }


  // A failed load is not an empty list: say so instead of "No ... yet".
  if (loadFailed) {
    return (
      <div className='space-y-4 p-6'>
        <Typography variant='h2' as='h1'>
          {t('savingsGoals.title')}
        </Typography>
        <LoadError what={t('loadError.savingsGoals')} onRetry={() => void loadAll()} />
      </div>
    )
  }
  return (
    <div className='space-y-4 p-6'>
      <div className='flex items-center justify-between'>
        <Typography variant='h2' as='h1'>{t('savingsGoals.title')}</Typography>
        <Button onClick={openCreate}>
          <Plus className='mr-1 h-4 w-4' /> {t('savingsGoals.addGoal')}
        </Button>
      </div>

      {loading ? (
        <AnimateSpinner size={48} />
      ) : goals.length === 0 ? (
        <EmptyPlaceholder
          icon={<PiggyBank className='w-12 h-12' />}
          title={t('savingsGoals.emptyTitle')}
          description={t('savingsGoals.emptyDescription')}
          action={
            <Button onClick={openCreate}>
              <Plus className='mr-1 h-4 w-4' /> {t('savingsGoals.addGoal')}
            </Button>
          }
        />
      ) : (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {goals.map((goal) => {
            const percent = goal.progress_percent ?? 0
            return (
              <Card key={goal.id}>
                <CardHeader>
                  <CardTitle>{goal.name}</CardTitle>
                  <CardDescription>{goal.account_name}</CardDescription>
                </CardHeader>
                <CardContent className='space-y-3'>
                  <Progress
                    value={percent}
                    aria-label={t('savingsGoals.progressLabel', { name: goal.name })}
                    getValueLabel={() => t('savingsGoals.progressValue', { percent: percent.toFixed(0) })}
                  />
                  <div className='flex items-baseline justify-between text-sm'>
                    <span className='font-medium'>
                      {formatCurrency(Number(goal.current_amount), currency.code)}
                    </span>
                    <span className='text-muted-foreground'>
                      {t('savingsGoals.ofTarget', {
                        target: formatCurrency(Number(goal.target_amount), currency.code),
                        percent: percent.toFixed(0),
                      })}
                    </span>
                  </div>
                  {goal.target_date && (
                    <p className='text-xs text-muted-foreground'>
                      {t('savingsGoals.targetDateValue', {
                        date: new Date(`${goal.target_date}T00:00:00`).toLocaleDateString('default', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        }),
                      })}
                    </p>
                  )}
                  <div className='flex justify-end gap-1 pt-1'>
                    <Button variant='ghost' size='sm' onClick={() => openEdit(goal)}>
                      {t('savingsGoals.edit')}
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='text-destructive hover:text-destructive'
                      onClick={() => setDeleteTarget(goal)}
                    >
                      {t('savingsGoals.delete')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className='sm:max-w-[420px]'>
          <DialogHeader>
            <DialogTitle>{editingId ? t('savingsGoals.editGoal') : t('savingsGoals.addGoal')}</DialogTitle>
          </DialogHeader>
          <div className='space-y-3'>
            <div className='space-y-1'>
              <Label htmlFor='goal-name'>{t('savingsGoals.name')}</Label>
              <Input
                id='goal-name'
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={t('savingsGoals.namePlaceholder')}
              />
            </div>
            <div className='space-y-1'>
              <Label htmlFor='goal-account'>{t('savingsGoals.account')}</Label>
              <Select
                value={form.account}
                onValueChange={(value) => setForm((prev) => ({ ...prev, account: value }))}
              >
                <SelectTrigger id='goal-account'>
                  <SelectValue placeholder={t('savingsGoals.accountPlaceholder')} />
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
            <div className='space-y-1'>
              <Label htmlFor='goal-target-amount'>{t('savingsGoals.targetAmount')}</Label>
              <Input
                id='goal-target-amount'
                type='number'
                step='0.01'
                min='0.01'
                value={form.target_amount}
                onChange={(e) => setForm((prev) => ({ ...prev, target_amount: e.target.value }))}
              />
            </div>
            <div className='space-y-1'>
              <Label htmlFor='goal-target-date'>{t('savingsGoals.targetDate')}</Label>
              <Input
                id='goal-target-date'
                type='date'
                value={form.target_date}
                onChange={(e) => setForm((prev) => ({ ...prev, target_date: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setFormOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submitForm} disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget != null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('savingsGoals.deleteTitle', { name: deleteTarget?.name })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('savingsGoals.deleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
              {t('savingsGoals.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
