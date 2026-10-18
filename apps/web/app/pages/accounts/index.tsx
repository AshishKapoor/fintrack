'use client'

import { formatDateForApi } from '@/lib/date'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { formatCurrency, currencies as CURRENCIES, useCurrency } from '@/context/currency-context'
import {
  deleteBankConnection,
  disconnectBankConnection,
  listSyncConnections,
  syncBankConnection,
  type SyncConnection,
} from '@/lib/bank-sync-client'
import {
  createAccount,
  deleteAccount,
  getBudgetFileBalances,
  listAccounts,
  syncFxRatesNow,
  updateAccount,
  type AccountBalanceRow,
  type FinanceAccount,
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConnectBankDialog } from '@/components/connect-bank-dialog'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Typography from '@/components/ui/typography'

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'cash', label: 'Cash' },
  { value: 'credit', label: 'Credit Card' },
  { value: 'asset', label: 'Asset' },
  { value: 'liability', label: 'Liability' },
]

// Catalogue key per account type; ACCOUNT_TYPES keeps the English labels.
const ACCOUNT_TYPE_KEYS: Record<string, string> = {
  checking: 'accounts.typeChecking',
  savings: 'accounts.typeSavings',
  cash: 'accounts.typeCash',
  credit: 'accounts.typeCredit',
  asset: 'accounts.typeAsset',
  liability: 'accounts.typeLiability',
}

const STATUS_VARIANT: Record<SyncConnection['status'], 'secondary' | 'destructive' | 'outline'> = {
  active: 'secondary',
  error: 'destructive',
  pending: 'outline',
  revoked: 'outline',
}

type AccountForm = {
  name: string
  type: string
  opening_balance: string
  currency_code: string
  interest_rate: string
  minimum_payment: string
}

const DEBT_TYPES = new Set(['credit', 'liability'])

export default function AccountsPage() {
  // ?tab= deep-links straight to a tab (the sidebar's Setup entries use it).
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('tab')
  const tab = requested === 'accounts' || requested === 'bank-sync' ? requested : 'accounts'
  const setTab = (value: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('tab', value)
    setSearchParams(next, { replace: true })
  }
  const { t } = useTranslation()
  const { currency: homeCurrency } = useCurrency()
  const accountTypeLabel = (value: string) => {
    const key = ACCOUNT_TYPE_KEYS[value]
    return key ? t(key) : value
  }
  const statusLabel: Record<SyncConnection['status'], string> = {
    active: t('accounts.statusActive'),
    error: t('accounts.statusError'),
    pending: t('accounts.statusPending'),
    revoked: t('accounts.statusRevoked'),
  }

  const [accounts, setAccounts] = useState<FinanceAccount[]>([])
  const [balancesByAccount, setBalancesByAccount] = useState<Record<number, AccountBalanceRow>>({})
  const [netWorth, setNetWorth] = useState<{ total: string; missing_rate: boolean } | null>(null)
  const [connections, setConnections] = useState<SyncConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<AccountForm>({
    name: '',
    type: 'checking',
    opening_balance: '0.00',
    currency_code: homeCurrency.code,
    interest_rate: '',
    minimum_payment: '',
  })
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<FinanceAccount | null>(null)

  const [connectOpen, setConnectOpen] = useState(false)
  const [busyConnectionId, setBusyConnectionId] = useState<number | null>(null)
  const [syncingRates, setSyncingRates] = useState(false)

  const loadAll = async () => {
    try {
      setLoadFailed(false)
      setLoading(true)
      const [accountRows, balances, connectionRows] = await Promise.all([
        listAccounts(),
        // As of today, so future-dated entries don't count toward today's balance.
        getBudgetFileBalances(formatDateForApi(new Date())),
        listSyncConnections(),
      ])
      setAccounts(accountRows)
      setBalancesByAccount(
        Object.fromEntries(balances.accounts.map((row) => [row.account_id, row])),
      )
      setNetWorth(balances.net_worth)
      setConnections(connectionRows)
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
    setForm({
      name: '',
      type: 'checking',
      opening_balance: '0.00',
      currency_code: homeCurrency.code,
      interest_rate: '',
      minimum_payment: '',
    })
    setFormOpen(true)
  }

  const openEdit = (account: FinanceAccount) => {
    setEditingId(account.id)
    setForm({
      name: account.name,
      type: account.type,
      opening_balance: account.opening_balance,
      currency_code: account.currency_code || homeCurrency.code,
      interest_rate: account.interest_rate ?? '',
      minimum_payment: account.minimum_payment ?? '',
    })
    setFormOpen(true)
  }

  const submitForm = async () => {
    if (!form.name.trim()) {
      toast.error(t('accounts.nameRequired'))
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        interest_rate: form.interest_rate.trim() || null,
        minimum_payment: form.minimum_payment.trim() || null,
      }
      if (editingId) {
        await updateAccount(editingId, payload)
        toast.success(t('accounts.updated'))
      } else {
        await createAccount(payload)
        toast.success(t('accounts.created'))
      }
      setFormOpen(false)
      await loadAll()
    } catch {
      // The httpPFTClient interceptor already toasts the server's reason.
    } finally {
      setSaving(false)
    }
  }

  const toggleArchived = async (account: FinanceAccount) => {
    await updateAccount(account.id, { is_archived: !account.is_archived })
    await loadAll()
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteAccount(deleteTarget.id)
      toast.success(t('accounts.deleted'))
      setDeleteTarget(null)
      await loadAll()
    } catch {
      // toasted by the interceptor
    }
  }

  const runSync = async (connection: SyncConnection) => {
    setBusyConnectionId(connection.id)
    try {
      await syncBankConnection(connection.id)
      toast.success(t('accounts.syncStarted'))
      await loadAll()
    } catch {
      // toasted
    } finally {
      setBusyConnectionId(null)
    }
  }

  const runDisconnect = async (connection: SyncConnection) => {
    setBusyConnectionId(connection.id)
    try {
      await disconnectBankConnection(connection.id)
      toast.success(t('accounts.connectionDisconnected'))
      await loadAll()
    } finally {
      setBusyConnectionId(null)
    }
  }

  const removeConnection = async (connection: SyncConnection) => {
    setBusyConnectionId(connection.id)
    try {
      await deleteBankConnection(connection.id)
      toast.success(t('accounts.connectionRemoved'))
      await loadAll()
    } finally {
      setBusyConnectionId(null)
    }
  }

  const runFxSync = async () => {
    setSyncingRates(true)
    try {
      const result = await syncFxRatesNow()
      toast.success(t('accounts.ratesFetched', { count: result.stored }))
      await loadAll()
    } catch {
      // toasted by the interceptor
    } finally {
      setSyncingRates(false)
    }
  }


  // A failed load is not an empty list: say so instead of "No ... yet".
  if (loadFailed) {
    return (
      <div className='space-y-4 p-6'>
        <Typography variant='h2' as='h1'>
          {t('accounts.title')}
        </Typography>
        <LoadError what={t('loadError.accounts')} onRetry={() => void loadAll()} />
      </div>
    )
  }
  return (
    <div className='space-y-4 p-6'>
      <div className='flex items-center justify-between'>
        <Typography variant='h2' as='h1'>{t('accounts.title')}</Typography>
      </div>

      <Tabs value={tab} onValueChange={setTab} className='space-y-4'>
        <TabsList>
          <TabsTrigger value='accounts'>{t('accounts.tabAll')}</TabsTrigger>
          <TabsTrigger value='bank-sync'>{t('accounts.tabBankSync')}</TabsTrigger>
        </TabsList>

        <TabsContent value='accounts' className='space-y-4'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between gap-4 space-y-0'>
              <div>
                <CardTitle>{t('accounts.yourAccounts')}</CardTitle>
                <CardDescription>
                  {netWorth &&
                    t(netWorth.missing_rate ? 'accounts.netWorthPartial' : 'accounts.netWorth', {
                      amount: formatCurrency(Number(netWorth.total), homeCurrency.code),
                    })}
                </CardDescription>
              </div>
              <div className='flex items-center gap-2'>
                {netWorth?.missing_rate && (
                  <Button variant='outline' size='sm' disabled={syncingRates} onClick={runFxSync}>
                    <RefreshCw className='mr-1 h-3 w-3' />
                    {syncingRates ? t('accounts.fetchingRates') : t('accounts.fetchRates')}
                  </Button>
                )}
                <Button onClick={openCreate}>
                  <Plus className='mr-1 h-4 w-4' /> {t('accounts.addAccount')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!loading && accounts.length === 0 && (
                <p className='py-8 text-center text-sm text-muted-foreground'>
                  {t('accounts.empty')}
                </p>
              )}
              {accounts.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('accounts.name')}</TableHead>
                      <TableHead>{t('accounts.type')}</TableHead>
                      <TableHead>{t('accounts.currency')}</TableHead>
                      <TableHead className='text-right'>{t('accounts.balance')}</TableHead>
                      <TableHead className='text-right'>{t('accounts.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((account) => {
                      const row = balancesByAccount[account.id]
                      const showConverted =
                        row && row.currency_code !== homeCurrency.code && row.converted_balance != null
                      return (
                        <TableRow key={account.id} className={account.is_archived ? 'opacity-50' : undefined}>
                          <TableCell className='font-medium'>{account.name}</TableCell>
                          <TableCell>
                            <Badge variant='outline'>
                              {accountTypeLabel(account.type)}
                            </Badge>
                          </TableCell>
                          <TableCell>{account.currency_code || homeCurrency.code}</TableCell>
                          <TableCell className='text-right'>
                            {row ? formatCurrency(Number(row.balance), row.currency_code) : '—'}
                            {showConverted && (
                              <div className='text-xs text-muted-foreground'>
                                ≈ {formatCurrency(Number(row.converted_balance), homeCurrency.code)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className='space-x-1 text-right'>
                            <Button variant='ghost' size='sm' onClick={() => openEdit(account)}>
                              {t('accounts.edit')}
                            </Button>
                            <Button variant='ghost' size='sm' onClick={() => toggleArchived(account)}>
                              {account.is_archived ? t('accounts.unarchive') : t('accounts.archive')}
                            </Button>
                            <Button
                              variant='ghost'
                              size='sm'
                              className='text-destructive hover:text-destructive'
                              onClick={() => setDeleteTarget(account)}
                            >
                              {t('accounts.delete')}
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='bank-sync' className='space-y-4'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between gap-4 space-y-0'>
              <div>
                <CardTitle>{t('accounts.bankConnections')}</CardTitle>
                <CardDescription>
                  {t('accounts.bankConnectionsDescription')}
                </CardDescription>
              </div>
              <Button onClick={() => setConnectOpen(true)}>
                <Plus className='mr-1 h-4 w-4' /> {t('accounts.connectBank')}
              </Button>
            </CardHeader>
            <CardContent className='space-y-3'>
              {connections.length === 0 && (
                <p className='py-8 text-center text-sm text-muted-foreground'>
                  {t('accounts.noConnections')}
                </p>
              )}
              {connections.map((connection) => (
                <div key={connection.id} className='space-y-2 rounded-md border p-3'>
                  <div className='flex items-center justify-between gap-2'>
                    <div>
                      <div className='font-medium'>
                        {connection.institution_name || connection.provider_label}
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        {connection.linked_accounts.length > 0
                          ? connection.linked_accounts
                              .map((linked) => linked.account_name || linked.display_name)
                              .join(', ')
                          : t('accounts.noAccountsLinked')}
                      </div>
                    </div>
                    <Badge variant={STATUS_VARIANT[connection.status]}>{statusLabel[connection.status] ?? connection.status}</Badge>
                  </div>
                  {connection.last_error && (
                    <p className='text-xs text-destructive'>{connection.last_error}</p>
                  )}
                  <div className='flex flex-wrap gap-2'>
                    <Button
                      size='sm'
                      variant='outline'
                      disabled={busyConnectionId === connection.id || connection.status !== 'active'}
                      onClick={() => runSync(connection)}
                    >
                      <RefreshCw className='mr-1 h-3 w-3' /> {t('accounts.syncNow')}
                    </Button>
                    {connection.status === 'active' && (
                      <Button
                        size='sm'
                        variant='outline'
                        disabled={busyConnectionId === connection.id}
                        onClick={() => runDisconnect(connection)}
                      >
                        {t('accounts.disconnect')}
                      </Button>
                    )}
                    <Button
                      size='sm'
                      variant='ghost'
                      className='text-destructive hover:text-destructive'
                      disabled={busyConnectionId === connection.id}
                      onClick={() => removeConnection(connection)}
                    >
                      {t('accounts.remove')}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className='sm:max-w-[420px]'>
          <DialogHeader>
            <DialogTitle>{editingId ? t('accounts.editAccount') : t('accounts.addAccount')}</DialogTitle>
          </DialogHeader>
          <div className='space-y-3'>
            <div className='space-y-1'>
              <Label htmlFor='account-name'>{t('accounts.name')}</Label>
              <Input
                id='account-name'
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className='space-y-1'>
              <Label htmlFor='account-type'>{t('accounts.type')}</Label>
              <Select value={form.type} onValueChange={(value) => setForm((prev) => ({ ...prev, type: value }))}>
                <SelectTrigger id='account-type'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {accountTypeLabel(item.value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-1'>
              <Label htmlFor='account-opening-balance'>{t('accounts.openingBalance')}</Label>
              <Input
                id='account-opening-balance'
                type='number'
                step='0.01'
                value={form.opening_balance}
                onChange={(e) => setForm((prev) => ({ ...prev, opening_balance: e.target.value }))}
              />
            </div>
            <div className='space-y-1'>
              <Label htmlFor='account-currency'>{t('accounts.currency')}</Label>
              <Select
                value={form.currency_code}
                onValueChange={(value) => setForm((prev) => ({ ...prev, currency_code: value }))}
              >
                <SelectTrigger id='account-currency'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((item) => (
                    <SelectItem key={item.code} value={item.code}>
                      {item.flag} {item.code} · {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {DEBT_TYPES.has(form.type) && (
              <>
                <div className='space-y-1'>
                  <Label htmlFor='account-interest-rate'>{t('accounts.interestRate')}</Label>
                  <Input
                    id='account-interest-rate'
                    type='number'
                    step='0.01'
                    min='0'
                    placeholder={t('accounts.interestRatePlaceholder')}
                    value={form.interest_rate}
                    onChange={(e) => setForm((prev) => ({ ...prev, interest_rate: e.target.value }))}
                  />
                </div>
                <div className='space-y-1'>
                  <Label htmlFor='account-minimum-payment'>{t('accounts.minimumPayment')}</Label>
                  <Input
                    id='account-minimum-payment'
                    type='number'
                    step='0.01'
                    min='0'
                    placeholder={t('accounts.minimumPaymentPlaceholder')}
                    value={form.minimum_payment}
                    onChange={(e) => setForm((prev) => ({ ...prev, minimum_payment: e.target.value }))}
                  />
                </div>
                <p className='text-xs text-muted-foreground'>
                  {t('accounts.debtHint')}
                </p>
              </>
            )}
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
            <AlertDialogTitle>{t('accounts.deleteTitle', { name: deleteTarget?.name ?? '' })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('accounts.deleteBody')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
              {t('accounts.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ConnectBankDialog
        open={connectOpen}
        onOpenChange={setConnectOpen}
        existingAccounts={accounts}
        onLinked={loadAll}
      />
    </div>
  )
}
