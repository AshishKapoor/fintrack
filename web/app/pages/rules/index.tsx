'use client'

import { useEffect, useMemo, useState } from 'react'
import { Play, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { useV1CategoriesList } from '@/client/gen/pft/v1/v1'
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
  const [rules, setRules] = useState<TransactionRule[]>([])
  const [scheduled, setScheduled] = useState<ScheduledTransaction[]>([])
  const [accounts, setAccounts] = useState<FinanceAccount[]>([])

  const [ruleForm, setRuleForm] = useState<RuleForm>(DEFAULT_RULE_FORM)
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null)

  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>(DEFAULT_SCHEDULE_FORM)
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null)

  const [loading, setLoading] = useState(false)

  const { data: categoriesData } = useV1CategoriesList()
  const categories = categoriesData?.results || []

  const expenseCategories = useMemo(
    () => categories.filter((item) => item.type === 'expense'),
    [categories],
  )
  const incomeCategories = useMemo(
    () => categories.filter((item) => item.type === 'income'),
    [categories],
  )

  const loadAll = async () => {
    try {
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
      toast.error('Failed to load rules/recurring data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAll()
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
      toast.error('Rule name is required')
      return
    }

    const payload = buildRulePayload()

    try {
      if (editingRuleId) {
        await updateTransactionRule(editingRuleId, payload)
      } else {
        await createTransactionRule(payload)
      }
      toast.success('Rule saved')
      resetRuleForm()
      await loadAll()
    } catch {
      toast.error('Failed to save rule')
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
      toast.success('Rule deleted')
      await loadAll()
    } catch {
      toast.error('Failed to delete rule')
    }
  }

  const buildScheduleTemplate = () => {
    const amount = Math.abs(Number(scheduleForm.amount || 0))
    if (!amount) {
      throw new Error('Amount is required')
    }

    if (scheduleForm.kind === 'transfer') {
      if (!scheduleForm.accountId || !scheduleForm.toAccountId) {
        throw new Error('Both source and destination accounts are required')
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
      throw new Error('Account and category are required')
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
      toast.error('Recurring transaction name is required')
      return
    }

    let template: Record<string, unknown>
    try {
      template = buildScheduleTemplate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid schedule configuration')
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
      toast.success('Recurring transaction saved')
      resetScheduleForm()
      await loadAll()
    } catch {
      toast.error('Failed to save recurring transaction')
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
      toast.success('Recurring transaction deleted')
      await loadAll()
    } catch {
      toast.error('Failed to delete recurring transaction')
    }
  }

  const handleRunDue = async () => {
    try {
      const response = await runDueScheduledTransactions()
      const count = response.created_transaction_ids.length
      toast.success(`Created ${count} scheduled transaction${count === 1 ? '' : 's'}`)
      await loadAll()
    } catch {
      toast.error('Failed to run due recurring transactions')
    }
  }

  const accountOptions = accounts
    .filter((item) => !item.is_archived)
    .map((item) => ({ id: String(item.id), name: item.name }))

  return (
    <div className='space-y-6 p-6'>
      <div className='flex items-center justify-between'>
        <Typography variant='h2'>Rules & Recurring</Typography>
        <div className='flex gap-2'>
          <Button variant='outline' onClick={() => void loadAll()} disabled={loading}>
            <RefreshCw className='mr-2 h-4 w-4' />
            Refresh
          </Button>
          <Button variant='outline' onClick={() => void handleRunDue()}>
            <Play className='mr-2 h-4 w-4' />
            Run Due
          </Button>
        </div>
      </div>

      <Tabs defaultValue='rules' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='rules'>Rules</TabsTrigger>
          <TabsTrigger value='recurring'>Recurring</TabsTrigger>
        </TabsList>

        <TabsContent value='rules' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>{editingRuleId ? 'Edit Rule' : 'Create Rule'}</CardTitle>
              <CardDescription>
                Define condition/action automation for payee, memo, and amount based categorization.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid gap-4 md:grid-cols-3'>
                <div className='space-y-2 md:col-span-2'>
                  <Label>Name</Label>
                  <Input
                    value={ruleForm.name}
                    onChange={(e) => setRuleForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder='e.g. Auto-tag subscriptions'
                  />
                </div>
                <div className='space-y-2'>
                  <Label>Priority</Label>
                  <Input
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
                  <Label>Memo contains</Label>
                  <Input
                    value={ruleForm.memoContains}
                    onChange={(e) =>
                      setRuleForm((prev) => ({ ...prev, memoContains: e.target.value }))
                    }
                    placeholder='e.g. netflix'
                  />
                </div>
                <div className='space-y-2'>
                  <Label>Payee contains</Label>
                  <Input
                    value={ruleForm.payeeContains}
                    onChange={(e) =>
                      setRuleForm((prev) => ({ ...prev, payeeContains: e.target.value }))
                    }
                    placeholder='e.g. uber'
                  />
                </div>
                <div className='space-y-2'>
                  <Label>Minimum abs amount</Label>
                  <Input
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
                  <Label>Append memo</Label>
                  <Input
                    value={ruleForm.appendMemo}
                    onChange={(e) =>
                      setRuleForm((prev) => ({ ...prev, appendMemo: e.target.value }))
                    }
                    placeholder='e.g. #subscription'
                  />
                </div>
                <div className='flex items-end gap-4 pb-2'>
                  <div className='flex items-center gap-2'>
                    <Switch
                      checked={ruleForm.setCleared}
                      onCheckedChange={(value) =>
                        setRuleForm((prev) => ({ ...prev, setCleared: value }))
                      }
                    />
                    <Label>Set cleared</Label>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Switch
                      checked={ruleForm.setImported}
                      onCheckedChange={(value) =>
                        setRuleForm((prev) => ({ ...prev, setImported: value }))
                      }
                    />
                    <Label>Set imported</Label>
                  </div>
                </div>
              </div>

              <div className='flex items-center gap-2'>
                <Switch
                  checked={ruleForm.isActive}
                  onCheckedChange={(value) =>
                    setRuleForm((prev) => ({ ...prev, isActive: value }))
                  }
                />
                <Label>Rule active</Label>
              </div>

              <div className='flex gap-2'>
                <Button onClick={() => void handleSaveRule()}>
                  <Plus className='mr-2 h-4 w-4' />
                  {editingRuleId ? 'Update Rule' : 'Create Rule'}
                </Button>
                {editingRuleId && (
                  <Button variant='outline' onClick={resetRuleForm}>
                    Cancel edit
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Existing Rules</CardTitle>
              <CardDescription>Rules are evaluated in ascending priority order.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className='w-[220px]'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className='text-center text-muted-foreground'>
                        No rules yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell>{rule.name}</TableCell>
                        <TableCell>{rule.priority}</TableCell>
                        <TableCell>{rule.is_active ? 'Yes' : 'No'}</TableCell>
                        <TableCell>
                          <div className='flex gap-2'>
                            <Button variant='outline' size='sm' onClick={() => handleEditRule(rule)}>
                              Edit
                            </Button>
                            <Button
                              variant='ghost'
                              size='sm'
                              className='text-destructive hover:text-destructive'
                              onClick={() => void handleDeleteRule(rule.id)}
                            >
                              <Trash2 className='mr-2 h-4 w-4' />
                              Delete
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
              <CardTitle>{editingScheduleId ? 'Edit Recurring Transaction' : 'Create Recurring Transaction'}</CardTitle>
              <CardDescription>
                Configure recurrence, template postings, and transfer-aware schedules.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid gap-4 md:grid-cols-4'>
                <div className='space-y-2 md:col-span-2'>
                  <Label>Name</Label>
                  <Input
                    value={scheduleForm.name}
                    onChange={(e) => setScheduleForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder='e.g. Monthly Rent'
                  />
                </div>
                <div className='space-y-2'>
                  <Label>Frequency</Label>
                  <Select
                    value={scheduleForm.frequency}
                    onValueChange={(value) =>
                      setScheduleForm((prev) => ({
                        ...prev,
                        frequency: value as ScheduledTransaction['frequency'],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Frequency' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='daily'>Daily</SelectItem>
                      <SelectItem value='weekly'>Weekly</SelectItem>
                      <SelectItem value='monthly'>Monthly</SelectItem>
                      <SelectItem value='yearly'>Yearly</SelectItem>
                      <SelectItem value='custom'>Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-2'>
                  <Label>Interval</Label>
                  <Input
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
                  <Label>Start date</Label>
                  <Input
                    type='date'
                    value={scheduleForm.startDate}
                    onChange={(e) => setScheduleForm((prev) => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div className='space-y-2'>
                  <Label>Next run date</Label>
                  <Input
                    type='date'
                    value={scheduleForm.nextRunDate}
                    onChange={(e) =>
                      setScheduleForm((prev) => ({ ...prev, nextRunDate: e.target.value }))
                    }
                  />
                </div>
                <div className='space-y-2'>
                  <Label>Kind</Label>
                  <Select
                    value={scheduleForm.kind}
                    onValueChange={(value) =>
                      setScheduleForm((prev) => ({ ...prev, kind: value as ScheduleKind }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Type' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='expense'>Expense</SelectItem>
                      <SelectItem value='income'>Income</SelectItem>
                      <SelectItem value='transfer'>Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-2'>
                  <Label>Amount</Label>
                  <Input
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
                  <Label>Primary account</Label>
                  <Select
                    value={scheduleForm.accountId}
                    onValueChange={(value) => setScheduleForm((prev) => ({ ...prev, accountId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Select account' />
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
                    <Label>Destination account</Label>
                    <Select
                      value={scheduleForm.toAccountId}
                      onValueChange={(value) =>
                        setScheduleForm((prev) => ({ ...prev, toAccountId: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='Select destination account' />
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
                    <Label>Category</Label>
                    <Select
                      value={scheduleForm.categoryId}
                      onValueChange={(value) =>
                        setScheduleForm((prev) => ({ ...prev, categoryId: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='Select category' />
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
                  <Label>Memo</Label>
                  <Input
                    value={scheduleForm.memo}
                    onChange={(e) => setScheduleForm((prev) => ({ ...prev, memo: e.target.value }))}
                    placeholder='Optional memo'
                  />
                </div>
              </div>

              <div className='flex items-center gap-2'>
                <Switch
                  checked={scheduleForm.isActive}
                  onCheckedChange={(value) =>
                    setScheduleForm((prev) => ({ ...prev, isActive: value }))
                  }
                />
                <Label>Schedule active</Label>
              </div>

              <div className='flex gap-2'>
                <Button onClick={() => void handleSaveSchedule()}>
                  <Plus className='mr-2 h-4 w-4' />
                  {editingScheduleId ? 'Update Recurring' : 'Create Recurring'}
                </Button>
                {editingScheduleId && (
                  <Button variant='outline' onClick={resetScheduleForm}>
                    Cancel edit
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recurring Transactions</CardTitle>
              <CardDescription>Manage execution schedules and template postings.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Next run</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className='w-[220px]'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduled.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className='text-center text-muted-foreground'>
                        No recurring transactions yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    scheduled.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.next_run_date}</TableCell>
                        <TableCell>
                          {item.frequency} / {item.interval}
                        </TableCell>
                        <TableCell>{item.is_active ? 'Yes' : 'No'}</TableCell>
                        <TableCell>
                          <div className='flex gap-2'>
                            <Button variant='outline' size='sm' onClick={() => handleEditSchedule(item)}>
                              Edit
                            </Button>
                            <Button
                              variant='ghost'
                              size='sm'
                              className='text-destructive hover:text-destructive'
                              onClick={() => void handleDeleteSchedule(item.id)}
                            >
                              <Trash2 className='mr-2 h-4 w-4' />
                              Delete
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
