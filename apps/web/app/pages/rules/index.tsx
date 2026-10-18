'use client'

import { useAllCategories } from '@/lib/finance-lists'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Play, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  createScheduledTransaction,
  createTransactionRule,
  deleteScheduledTransaction,
  deleteTransactionRule,
  listAccounts,
  listScheduledTransactions,
  listTransactionRules,
  runDueScheduledTransactions,
  updateScheduledTransaction,
  updateTransactionRule,
  type FinanceAccount,
  type ScheduledTransaction,
  type TransactionRule,
} from '@/lib/finance-client'

import { LoadError } from '@/components/load-error'
import Typography from '@/components/ui/typography'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type RuleForm = {
  name: string
  isActive: boolean
  priority: number
  memoContains: string
  payeeContains: string
  minAbsAmount: string
  appendMemo: string
  setCleared: boolean
  setImported: boolean
}

type ScheduleKind = 'expense' | 'income' | 'transfer'

type ScheduleForm = {
  name: string
  isActive: boolean
  startDate: string
  nextRunDate: string
  frequency: ScheduledTransaction['frequency']
  interval: number
  kind: ScheduleKind
  accountId: string
  toAccountId: string
  categoryId: string
  amount: string
  memo: string
}

const today = new Date().toISOString().slice(0, 10)

const DEFAULT_RULE_FORM: RuleForm = {
  name: '',
  isActive: true,
  priority: 100,
  memoContains: '',
  payeeContains: '',
  minAbsAmount: '',
  appendMemo: '',
  setCleared: false,
  setImported: false,
}

const DEFAULT_SCHEDULE_FORM: ScheduleForm = {
  name: '',
  isActive: true,
  startDate: today,
  nextRunDate: today,
  frequency: 'monthly',
  interval: 1,
  kind: 'expense',
  accountId: '',
  toAccountId: '',
  categoryId: '',
  amount: '',
  memo: '',
}

const parseTemplate = (
  schedule: ScheduledTransaction,
): Pick<ScheduleForm, 'kind' | 'accountId' | 'toAccountId' | 'categoryId' | 'amount' | 'memo'> => {
  const template = (schedule.transaction_template || {}) as {
    postings?: Array<{
      account_id?: number
      category_id?: number
      amount?: string | number
    }>
    memo?: string
    is_transfer?: boolean
  }

  const postings = Array.isArray(template.postings) ? template.postings : []
  const accountPostings = postings.filter((item) => item.account_id)
  const categoryPosting = postings.find((item) => item.category_id)

  if (template.is_transfer || (accountPostings.length === 2 && !categoryPosting)) {
    const from = accountPostings.find((item) => Number(item.amount || 0) < 0) || accountPostings[0]
    const to = accountPostings.find((item) => Number(item.amount || 0) > 0) || accountPostings[1]
    return {
      kind: 'transfer',
      accountId: from?.account_id ? String(from.account_id) : '',
      toAccountId: to?.account_id ? String(to.account_id) : '',
      categoryId: '',
      amount: String(Math.abs(Number(from?.amount || to?.amount || 0)) || ''),
      memo: template.memo || '',
    }
  }

  const accountLeg = accountPostings[0]
  const accountAmount = Number(accountLeg?.amount || 0)
  return {
    kind: accountAmount >= 0 ? 'income' : 'expense',
    accountId: accountLeg?.account_id ? String(accountLeg.account_id) : '',
    toAccountId: '',
    categoryId: categoryPosting?.category_id ? String(categoryPosting.category_id) : '',
    amount: String(Math.abs(accountAmount || Number(categoryPosting?.amount || 0)) || ''),
    memo: template.memo || '',
  }
}

export default function RulesAndRecurringPage() {
  // ?tab= deep-links straight to a tab (the sidebar's Setup entries use it).
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('tab')
  const tab = requested === 'rules' || requested === 'recurring' ? requested : 'rules'
  const setTab = (value: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('tab', value)
    setSearchParams(next, { replace: true })
  }
  const { t } = useTranslation()
  const [rules, setRules] = useState<TransactionRule[]>([])
  const [scheduled, setScheduled] = useState<ScheduledTransaction[]>([])
  const [accounts, setAccounts] = useState<FinanceAccount[]>([])

  const [ruleForm, setRuleForm] = useState<RuleForm>(DEFAULT_RULE_FORM)
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null)

  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>(DEFAULT_SCHEDULE_FORM)
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null)

  const [loading, setLoading] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)

  const { data: categoriesData } = useAllCategories()
  // Native ledger category rows: the classification field is `kind`.
  const categories = useMemo(() => categoriesData ?? [], [categoriesData])

  const expenseCategories = useMemo(
    () => categories.filter((item) => item.kind === 'expense'),
    [categories],
  )
  const incomeCategories = useMemo(
    () => categories.filter((item) => item.kind === 'income'),
    [categories],
  )

  const loadAll = async () => {
    try {
      setLoadFailed(false)
      setLoading(true)
      const [ruleRows, scheduleRows, accountRows] = await Promise.all([
        listTransactionRules(),
        listScheduledTransactions(),
        listAccounts(),
      ])
      setRules(ruleRows)
      setScheduled(scheduleRows)
      setAccounts(accountRows)
    } catch {
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Deferred a tick so the synchronous part of the loader's setState calls
    // do not run inside the effect body itself (react-hooks/set-state-in-effect).
    const id = setTimeout(() => void loadAll(), 0)
    return () => clearTimeout(id)
  }, [])

  const resetRuleForm = () => {
    setRuleForm(DEFAULT_RULE_FORM)
    setEditingRuleId(null)
  }

  const resetScheduleForm = () => {
    setScheduleForm(DEFAULT_SCHEDULE_FORM)
    setEditingScheduleId(null)
  }

  const buildRulePayload = () => {
    const conditions: Record<string, unknown> = {}
    const actions: Record<string, unknown> = {}

    if (ruleForm.memoContains.trim()) conditions.memo_contains = ruleForm.memoContains.trim()
    if (ruleForm.payeeContains.trim()) conditions.payee_contains = ruleForm.payeeContains.trim()
    if (ruleForm.minAbsAmount.trim()) conditions.min_abs_amount = Number(ruleForm.minAbsAmount)

    if (ruleForm.appendMemo.trim()) actions.append_memo = ruleForm.appendMemo.trim()
    actions.cleared = ruleForm.setCleared
    actions.imported = ruleForm.setImported

    return {
      name: ruleForm.name.trim(),
      is_active: ruleForm.isActive,
      priority: ruleForm.priority,
      conditions,
      actions,
    }
  }

  const handleSaveRule = async () => {
    if (!ruleForm.name.trim()) {
      toast.error(t('rules.nameRequired'))
      return
    }

    const payload = buildRulePayload()

    try {
      if (editingRuleId) {
        await updateTransactionRule(editingRuleId, payload)
      } else {
        await createTransactionRule(payload)
      }
      toast.success(t('rules.ruleSaved'))
      resetRuleForm()
      await loadAll()
    } catch {
      toast.error(t('rules.ruleSaveFailed'))
    }
  }

  const handleEditRule = (rule: TransactionRule) => {
    const conditions = rule.conditions || {}
    const actions = rule.actions || {}

    setEditingRuleId(rule.id)
    setRuleForm({
      name: rule.name,
      isActive: rule.is_active,
      priority: rule.priority,
      memoContains: String(conditions.memo_contains || ''),
      payeeContains: String(conditions.payee_contains || ''),
      minAbsAmount:
        conditions.min_abs_amount !== undefined ? String(conditions.min_abs_amount) : '',
      appendMemo: String(actions.append_memo || ''),
      setCleared: Boolean(actions.cleared),
      setImported: Boolean(actions.imported),
    })
  }

  const handleDeleteRule = async (id: number) => {
    try {
      await deleteTransactionRule(id)
      toast.success(t('rules.ruleDeleted'))
      await loadAll()
    } catch {
      toast.error(t('rules.ruleDeleteFailed'))
    }
  }

  const buildScheduleTemplate = () => {
    const amount = Math.abs(Number(scheduleForm.amount || 0))
    if (!amount) {
      throw new Error(t('rules.amountRequired'))
    }

    if (scheduleForm.kind === 'transfer') {
      if (!scheduleForm.accountId || !scheduleForm.toAccountId) {
        throw new Error(t('rules.transferAccountsRequired'))
      }
      return {
        memo: scheduleForm.memo,
        is_transfer: true,
        postings: [
          {
            account_id: Number(scheduleForm.accountId),
            category_id: null,
            amount: (-amount).toFixed(2),
          },
          {
            account_id: Number(scheduleForm.toAccountId),
            category_id: null,
            amount: amount.toFixed(2),
          },
        ],
      }
    }

    if (!scheduleForm.accountId || !scheduleForm.categoryId) {
      throw new Error(t('rules.accountCategoryRequired'))
    }

    const accountAmount = scheduleForm.kind === 'income' ? amount : -amount
    return {
      memo: scheduleForm.memo,
      postings: [
        {
          account_id: Number(scheduleForm.accountId),
          category_id: null,
          amount: accountAmount.toFixed(2),
        },
        {
          account_id: null,
          category_id: Number(scheduleForm.categoryId),
          amount: (-accountAmount).toFixed(2),
        },
      ],
    }
  }

  const handleSaveSchedule = async () => {
    if (!scheduleForm.name.trim()) {
      toast.error(t('rules.scheduleNameRequired'))
      return
    }

    let template: Record<string, unknown>
    try {
      template = buildScheduleTemplate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('rules.invalidSchedule'))
      return
    }

    const payload = {
      name: scheduleForm.name.trim(),
      is_active: scheduleForm.isActive,
      start_date: scheduleForm.startDate,
      next_run_date: scheduleForm.nextRunDate,
      frequency: scheduleForm.frequency,
      interval: scheduleForm.interval,
      transaction_template: template,
    }

    try {
      if (editingScheduleId) {
        await updateScheduledTransaction(editingScheduleId, payload)
      } else {
        await createScheduledTransaction(payload)
      }
      toast.success(t('rules.scheduleSaved'))
      resetScheduleForm()
      await loadAll()
    } catch {
      toast.error(t('rules.scheduleSaveFailed'))
    }
  }

  const handleEditSchedule = (item: ScheduledTransaction) => {
    const parsed = parseTemplate(item)
    setEditingScheduleId(item.id)
    setScheduleForm({
      name: item.name,
      isActive: item.is_active,
      startDate: item.start_date,
      nextRunDate: item.next_run_date,
      frequency: item.frequency,
      interval: item.interval,
      kind: parsed.kind,
      accountId: parsed.accountId,
      toAccountId: parsed.toAccountId,
      categoryId: parsed.categoryId,
      amount: parsed.amount,
      memo: parsed.memo,
    })
  }

  const handleDeleteSchedule = async (id: number) => {
    try {
      await deleteScheduledTransaction(id)
      toast.success(t('rules.scheduleDeleted'))
      await loadAll()
    } catch {
      toast.error(t('rules.scheduleDeleteFailed'))
    }
  }

  const handleRunDue = async () => {
    try {
      const response = await runDueScheduledTransactions()
      const count = response.created_transaction_ids.length
      toast.success(count === 0 ? t('rules.nothingDue') : t('rules.postedDue', { count }))
      await loadAll()
    } catch {
      toast.error(t('rules.postDueFailed'))
    }
  }

  const accountOptions = accounts
    .filter((item) => !item.is_archived)
    .map((item) => ({ id: String(item.id), name: item.name }))


  // A failed load is not an empty list: say so instead of "No ... yet".
  if (loadFailed) {
    return (
      <div className='space-y-4 p-6'>
        <Typography variant='h2' as='h1'>
          {tab === 'recurring' ? t('rules.billsTitle') : t('rules.title')}
        </Typography>
        <LoadError what={t('loadError.rules')} onRetry={() => void loadAll()} />
      </div>
    )
  }
  return (
    <div className='space-y-6 p-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <Typography variant='h2' as='h1'>
          {tab === 'recurring' ? t('rules.billsTitle') : t('rules.title')}
        </Typography>
        <div className='flex gap-2'>
          <Button variant='outline' onClick={() => void loadAll()} disabled={loading}>
            <RefreshCw className='mr-2 h-4 w-4' />
            {t('rules.refresh')}
          </Button>
          <Button variant='outline' onClick={() => void handleRunDue()}>
            <Play className='mr-2 h-4 w-4' />
            {t('rules.postDue')}
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className='space-y-4'>
        <TabsList>
          <TabsTrigger value='recurring'>{t('rules.billsTitle')}</TabsTrigger>
          <TabsTrigger value='rules'>{t('rules.title')}</TabsTrigger>
        </TabsList>

        <TabsContent value='rules' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>{editingRuleId ? t('rules.editRule') : t('rules.newRule')}</CardTitle>
              <CardDescription>
                {t('rules.ruleDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid gap-4 md:grid-cols-3'>
                <div className='space-y-2 md:col-span-2'>
                  <Label htmlFor='rule-name'>{t('rules.name')}</Label>
                  <Input
                    id='rule-name'
                    value={ruleForm.name}
                    onChange={(e) => setRuleForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder={t('rules.namePlaceholder')}
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='rule-priority'>{t('rules.order')}</Label>
                  <Input
                    id='rule-priority'
                    type='number'
                    value={ruleForm.priority}
                    onChange={(e) =>
                      setRuleForm((prev) => ({
                        ...prev,
                        priority: Number(e.target.value || 100),
                      }))
                    }
                  />
                </div>
              </div>

              <div className='grid gap-4 md:grid-cols-3'>
                <div className='space-y-2'>
                  <Label htmlFor='rule-memo-contains'>{t('rules.noteContains')}</Label>
                  <Input
                    id='rule-memo-contains'
                    value={ruleForm.memoContains}
                    onChange={(e) =>
                      setRuleForm((prev) => ({ ...prev, memoContains: e.target.value }))
                    }
                    placeholder={t('rules.noteContainsPlaceholder')}
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='rule-payee-contains'>{t('rules.payeeContains')}</Label>
                  <Input
                    id='rule-payee-contains'
                    value={ruleForm.payeeContains}
                    onChange={(e) =>
                      setRuleForm((prev) => ({ ...prev, payeeContains: e.target.value }))
                    }
                    placeholder={t('rules.payeeContainsPlaceholder')}
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='rule-min-amount'>{t('rules.minAmount')}</Label>
                  <Input
                    id='rule-min-amount'
                    type='number'
                    min='0'
                    step='0.01'
                    value={ruleForm.minAbsAmount}
                    onChange={(e) =>
                      setRuleForm((prev) => ({ ...prev, minAbsAmount: e.target.value }))
                    }
                    placeholder='0.00'
                  />
                </div>
              </div>

              <div className='grid gap-4 md:grid-cols-3'>
                <div className='space-y-2 md:col-span-2'>
                  <Label htmlFor='rule-append-memo'>{t('rules.appendMemo')}</Label>
                  <Input
                    id='rule-append-memo'
                    value={ruleForm.appendMemo}
                    onChange={(e) =>
                      setRuleForm((prev) => ({ ...prev, appendMemo: e.target.value }))
                    }
                    placeholder={t('rules.appendMemoPlaceholder')}
                  />
                </div>
                <div className='flex items-end gap-4 pb-2'>
                  <div className='flex items-center gap-2'>
                    <Switch
                      id='rule-set-cleared'
                      checked={ruleForm.setCleared}
                      onCheckedChange={(value) =>
                        setRuleForm((prev) => ({ ...prev, setCleared: value }))
                      }
                    />
                    <Label htmlFor='rule-set-cleared'>{t('rules.markCleared')}</Label>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Switch
                      id='rule-set-imported'
                      checked={ruleForm.setImported}
                      onCheckedChange={(value) =>
                        setRuleForm((prev) => ({ ...prev, setImported: value }))
                      }
                    />
                    <Label htmlFor='rule-set-imported'>{t('rules.markImported')}</Label>
                  </div>
                </div>
              </div>

              <div className='flex items-center gap-2'>
                <Switch
                  id='rule-active'
                  checked={ruleForm.isActive}
                  onCheckedChange={(value) =>
                    setRuleForm((prev) => ({ ...prev, isActive: value }))
                  }
                />
                <Label htmlFor='rule-active'>{t('rules.ruleOn')}</Label>
              </div>

              <div className='flex gap-2'>
                <Button onClick={() => void handleSaveRule()}>
                  <Plus className='mr-2 h-4 w-4' />
                  {editingRuleId ? t('rules.saveRule') : t('rules.addRule')}
                </Button>
                {editingRuleId && (
                  <Button variant='outline' onClick={resetRuleForm}>
                    {t('rules.cancelEdit')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('rules.yourRules')}</CardTitle>
              <CardDescription>{t('rules.yourRulesDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('rules.name')}</TableHead>
                    <TableHead>{t('rules.priority')}</TableHead>
                    <TableHead>{t('rules.active')}</TableHead>
                    <TableHead className='w-[220px]'>{t('rules.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className='text-center text-muted-foreground'>
                        {t('rules.noRules')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    rules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell>{rule.name}</TableCell>
                        <TableCell>{rule.priority}</TableCell>
                        <TableCell>{rule.is_active ? t('rules.yes') : t('rules.no')}</TableCell>
                        <TableCell>
                          <div className='flex gap-2'>
                            <Button variant='outline' size='sm' onClick={() => handleEditRule(rule)}>
                              {t('rules.edit')}
                            </Button>
                            <Button
                              variant='ghost'
                              size='sm'
                              className='text-destructive hover:text-destructive'
                              onClick={() => void handleDeleteRule(rule.id)}
                            >
                              <Trash2 className='mr-2 h-4 w-4' />
                              {t('rules.delete')}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='recurring' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>{editingScheduleId ? t('rules.editSchedule') : t('rules.newSchedule')}</CardTitle>
              <CardDescription>
                {t('rules.scheduleDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid gap-4 md:grid-cols-4'>
                <div className='space-y-2 md:col-span-2'>
                  <Label htmlFor='schedule-name'>{t('rules.name')}</Label>
                  <Input
                    id='schedule-name'
                    value={scheduleForm.name}
                    onChange={(e) => setScheduleForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder={t('rules.scheduleNamePlaceholder')}
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='schedule-frequency'>{t('rules.frequency')}</Label>
                  <Select
                    value={scheduleForm.frequency}
                    onValueChange={(value) =>
                      setScheduleForm((prev) => ({
                        ...prev,
                        frequency: value as ScheduledTransaction['frequency'],
                      }))
                    }
                  >
                    <SelectTrigger id='schedule-frequency'>
                      <SelectValue placeholder={t('rules.frequency')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='daily'>{t('rules.daily')}</SelectItem>
                      <SelectItem value='weekly'>{t('rules.weekly')}</SelectItem>
                      <SelectItem value='monthly'>{t('rules.monthly')}</SelectItem>
                      <SelectItem value='yearly'>{t('rules.yearly')}</SelectItem>
                      <SelectItem value='custom'>{t('rules.custom')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='schedule-interval'>{t('rules.interval')}</Label>
                  <Input
                    id='schedule-interval'
                    type='number'
                    min='1'
                    value={scheduleForm.interval}
                    onChange={(e) =>
                      setScheduleForm((prev) => ({ ...prev, interval: Number(e.target.value || 1) }))
                    }
                  />
                </div>
              </div>

              <div className='grid gap-4 md:grid-cols-4'>
                <div className='space-y-2'>
                  <Label htmlFor='schedule-start-date'>{t('rules.startDate')}</Label>
                  <Input
                    id='schedule-start-date'
                    type='date'
                    value={scheduleForm.startDate}
                    onChange={(e) => setScheduleForm((prev) => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='schedule-next-run-date'>{t('rules.nextDate')}</Label>
                  <Input
                    id='schedule-next-run-date'
                    type='date'
                    value={scheduleForm.nextRunDate}
                    onChange={(e) =>
                      setScheduleForm((prev) => ({ ...prev, nextRunDate: e.target.value }))
                    }
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='schedule-kind'>{t('rules.type')}</Label>
                  <Select
                    value={scheduleForm.kind}
                    onValueChange={(value) =>
                      setScheduleForm((prev) => ({ ...prev, kind: value as ScheduleKind }))
                    }
                  >
                    <SelectTrigger id='schedule-kind'>
                      <SelectValue placeholder={t('rules.type')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='expense'>{t('rules.expense')}</SelectItem>
                      <SelectItem value='income'>{t('rules.income')}</SelectItem>
                      <SelectItem value='transfer'>{t('rules.transfer')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='schedule-amount'>{t('rules.amount')}</Label>
                  <Input
                    id='schedule-amount'
                    type='number'
                    min='0'
                    step='0.01'
                    value={scheduleForm.amount}
                    onChange={(e) => setScheduleForm((prev) => ({ ...prev, amount: e.target.value }))}
                    placeholder='0.00'
                  />
                </div>
              </div>

              <div className='grid gap-4 md:grid-cols-3'>
                <div className='space-y-2'>
                  <Label htmlFor='schedule-account'>{t('rules.account')}</Label>
                  <Select
                    value={scheduleForm.accountId}
                    onValueChange={(value) => setScheduleForm((prev) => ({ ...prev, accountId: value }))}
                  >
                    <SelectTrigger id='schedule-account'>
                      <SelectValue placeholder={t('rules.selectAccount')} />
                    </SelectTrigger>
                    <SelectContent>
                      {accountOptions.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {scheduleForm.kind === 'transfer' ? (
                  <div className='space-y-2'>
                    <Label htmlFor='schedule-to-account'>{t('rules.toAccount')}</Label>
                    <Select
                      value={scheduleForm.toAccountId}
                      onValueChange={(value) =>
                        setScheduleForm((prev) => ({ ...prev, toAccountId: value }))
                      }
                    >
                      <SelectTrigger id='schedule-to-account'>
                        <SelectValue placeholder={t('rules.selectToAccount')} />
                      </SelectTrigger>
                      <SelectContent>
                        {accountOptions.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className='space-y-2'>
                    <Label htmlFor='schedule-category'>{t('rules.category')}</Label>
                    <Select
                      value={scheduleForm.categoryId}
                      onValueChange={(value) =>
                        setScheduleForm((prev) => ({ ...prev, categoryId: value }))
                      }
                    >
                      <SelectTrigger id='schedule-category'>
                        <SelectValue placeholder={t('rules.selectCategory')} />
                      </SelectTrigger>
                      <SelectContent>
                        {(scheduleForm.kind === 'income' ? incomeCategories : expenseCategories).map(
                          (category) => (
                            <SelectItem key={category.id} value={String(category.id)}>
                              {category.name}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className='space-y-2'>
                  <Label htmlFor='schedule-memo'>{t('rules.memo')}</Label>
                  <Input
                    id='schedule-memo'
                    value={scheduleForm.memo}
                    onChange={(e) => setScheduleForm((prev) => ({ ...prev, memo: e.target.value }))}
                    placeholder={t('rules.memoPlaceholder')}
                  />
                </div>
              </div>

              <div className='flex items-center gap-2'>
                <Switch
                  id='schedule-active'
                  checked={scheduleForm.isActive}
                  onCheckedChange={(value) =>
                    setScheduleForm((prev) => ({ ...prev, isActive: value }))
                  }
                />
                <Label htmlFor='schedule-active'>{t('rules.scheduleOn')}</Label>
              </div>

              <div className='flex gap-2'>
                <Button onClick={() => void handleSaveSchedule()}>
                  <Plus className='mr-2 h-4 w-4' />
                  {editingScheduleId ? t('rules.save') : t('rules.add')}
                </Button>
                {editingScheduleId && (
                  <Button variant='outline' onClick={resetScheduleForm}>
                    {t('rules.cancelEdit')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('rules.yourSchedules')}</CardTitle>
              <CardDescription>
                {t('rules.yourSchedulesDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('rules.name')}</TableHead>
                    <TableHead>{t('rules.next')}</TableHead>
                    <TableHead>{t('rules.frequency')}</TableHead>
                    <TableHead>{t('rules.active')}</TableHead>
                    <TableHead className='w-[220px]'>{t('rules.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduled.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className='text-center text-muted-foreground'>
                        {t('rules.noSchedules')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    scheduled.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.next_run_date}</TableCell>
                        <TableCell>
                          {t(`rules.frequencyValue.${item.frequency}`, { defaultValue: item.frequency })} / {item.interval}
                        </TableCell>
                        <TableCell>{item.is_active ? t('rules.yes') : t('rules.no')}</TableCell>
                        <TableCell>
                          <div className='flex gap-2'>
                            <Button variant='outline' size='sm' onClick={() => handleEditSchedule(item)}>
                              {t('rules.edit')}
                            </Button>
                            <Button
                              variant='ghost'
                              size='sm'
                              className='text-destructive hover:text-destructive'
                              onClick={() => void handleDeleteSchedule(item.id)}
                            >
                              <Trash2 className='mr-2 h-4 w-4' />
                              {t('rules.delete')}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
