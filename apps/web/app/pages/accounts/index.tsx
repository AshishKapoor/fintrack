'use client'

import { useEffect, useState } from 'react'
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
}

export default function AccountsPage() {
  const { currency: homeCurrency } = useCurrency()

  const [accounts, setAccounts] = useState<FinanceAccount[]>([])
  const [balancesByAccount, setBalancesByAccount] = useState<Record<number, AccountBalanceRow>>({})
  const [netWorth, setNetWorth] = useState<{ total: string; missing_rate: boolean } | null>(null)
  const [connections, setConnections] = useState<SyncConnection[]>([])
  const [loading, setLoading] = useState(true)

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<AccountForm>({
    name: '',
    type: 'checking',
    opening_balance: '0.00',
    currency_code: homeCurrency.code,
  })
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<FinanceAccount | null>(null)

  const [connectOpen, setConnectOpen] = useState(false)
  const [busyConnectionId, setBusyConnectionId] = useState<number | null>(null)
  const [syncingRates, setSyncingRates] = useState(false)

  const loadAll = async () => {
    try {
      setLoading(true)
      const [accountRows, balances, connectionRows] = await Promise.all([
        listAccounts(),
        getBudgetFileBalances(),
        listSyncConnections(),
      ])
      setAccounts(accountRows)
      setBalancesByAccount(
        Object.fromEntries(balances.accounts.map((row) => [row.account_id, row])),
      )
      setNetWorth(balances.net_worth)
      setConnections(connectionRows)
    } catch {
      toast.error('Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAll()
  }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm({ name: '', type: 'checking', opening_balance: '0.00', currency_code: homeCurrency.code })
    setFormOpen(true)
  }

  const openEdit = (account: FinanceAccount) => {
    setEditingId(account.id)
    setForm({
      name: account.name,
      type: account.type,
      opening_balance: account.opening_balance,
      currency_code: account.currency_code || homeCurrency.code,
    })
    setFormOpen(true)
  }

  const submitForm = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await updateAccount(editingId, form)
        toast.success('Account updated')
      } else {
        await createAccount(form)
        toast.success('Account created')
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
      toast.success('Account deleted')
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
      toast.success('Sync started')
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
      toast.success('Bank connection disconnected')
      await loadAll()
    } finally {
      setBusyConnectionId(null)
    }
  }

  const removeConnection = async (connection: SyncConnection) => {
    setBusyConnectionId(connection.id)
    try {
      await deleteBankConnection(connection.id)
      toast.success('Bank connection removed')
      await loadAll()
    } finally {
      setBusyConnectionId(null)
    }
  }

  const runFxSync = async () => {
    setSyncingRates(true)
    try {
      const result = await syncFxRatesNow()
      toast.success(`Fetched exchange rates for ${result.stored} currencies`)
      await loadAll()
    } catch {
      // toasted by the interceptor
    } finally {
      setSyncingRates(false)
    }
  }

  return (
    <div className='space-y-4 p-6'>
      <div className='flex items-center justify-between'>
        <Typography variant='h2'>Accounts</Typography>
      </div>

      <Tabs defaultValue='accounts' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='accounts'>Accounts</TabsTrigger>
          <TabsTrigger value='bank-sync'>Bank Sync</TabsTrigger>
        </TabsList>

        <TabsContent value='accounts' className='space-y-4'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between gap-4 space-y-0'>
              <div>
                <CardTitle>Your accounts</CardTitle>
                <CardDescription>
                  {netWorth &&
                    `Net worth: ${formatCurrency(Number(netWorth.total), homeCurrency.code)}${
                      netWorth.missing_rate ? ' (partial - some balances have no exchange rate yet)' : ''
                    }`}
                </CardDescription>
              </div>
              <div className='flex items-center gap-2'>
                {netWorth?.missing_rate && (
                  <Button variant='outline' size='sm' disabled={syncingRates} onClick={runFxSync}>
                    <RefreshCw className='mr-1 h-3 w-3' />
                    {syncingRates ? 'Fetching rates…' : 'Fetch exchange rates'}
                  </Button>
                )}
                <Button onClick={openCreate}>
                  <Plus className='mr-1 h-4 w-4' /> Add account
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!loading && accounts.length === 0 && (
                <p className='py-8 text-center text-sm text-muted-foreground'>
                  No accounts yet - add one, or connect a bank from the Bank Sync tab.
                </p>
              )}
              {accounts.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead className='text-right'>Balance</TableHead>
                      <TableHead className='text-right'>Actions</TableHead>
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
                            <Badge variant='outline'>{account.type}</Badge>
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
                              Edit
                            </Button>
                            <Button variant='ghost' size='sm' onClick={() => toggleArchived(account)}>
                              {account.is_archived ? 'Unarchive' : 'Archive'}
                            </Button>
                            <Button
                              variant='ghost'
                              size='sm'
                              className='text-destructive hover:text-destructive'
                              onClick={() => setDeleteTarget(account)}
                            >
                              Delete
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
                <CardTitle>Bank connections</CardTitle>
                <CardDescription>
                  Synced transactions flow through the same dedup and rules as file imports.
                </CardDescription>
              </div>
              <Button onClick={() => setConnectOpen(true)}>
                <Plus className='mr-1 h-4 w-4' /> Connect a bank
              </Button>
            </CardHeader>
            <CardContent className='space-y-3'>
              {connections.length === 0 && (
                <p className='py-8 text-center text-sm text-muted-foreground'>
                  No bank connections yet.
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
                          : 'No accounts linked'}
                      </div>
                    </div>
                    <Badge variant={STATUS_VARIANT[connection.status]}>{connection.status}</Badge>
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
                      <RefreshCw className='mr-1 h-3 w-3' /> Sync now
                    </Button>
                    {connection.status === 'active' && (
                      <Button
                        size='sm'
                        variant='outline'
                        disabled={busyConnectionId === connection.id}
                        onClick={() => runDisconnect(connection)}
                      >
                        Disconnect
                      </Button>
                    )}
                    <Button
                      size='sm'
                      variant='ghost'
                      className='text-destructive hover:text-destructive'
                      disabled={busyConnectionId === connection.id}
                      onClick={() => removeConnection(connection)}
                    >
                      Remove
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
            <DialogTitle>{editingId ? 'Edit account' : 'Add account'}</DialogTitle>
          </DialogHeader>
          <div className='space-y-3'>
            <div className='space-y-1'>
              <Label htmlFor='account-name'>Name</Label>
              <Input
                id='account-name'
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className='space-y-1'>
              <Label htmlFor='account-type'>Type</Label>
              <Select value={form.type} onValueChange={(value) => setForm((prev) => ({ ...prev, type: value }))}>
                <SelectTrigger id='account-type'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-1'>
              <Label htmlFor='account-opening-balance'>Opening balance</Label>
              <Input
                id='account-opening-balance'
                type='number'
                step='0.01'
                value={form.opening_balance}
                onChange={(e) => setForm((prev) => ({ ...prev, opening_balance: e.target.value }))}
              />
            </div>
            <div className='space-y-1'>
              <Label htmlFor='account-currency'>Currency</Label>
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
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitForm} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget != null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the account and every transaction posted against it. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className='bg-destructive text-white hover:bg-destructive/90'>
              Delete
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
