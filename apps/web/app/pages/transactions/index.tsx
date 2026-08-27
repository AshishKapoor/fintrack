'use client'

import type { LedgerTransaction } from '@/client/gen/pft/ledgerTransaction'
import { useV1FinanceTransactionsList } from '@/client/gen/pft/v1/v1'
import { displayFields } from '@/lib/ledger'
import { AddTransactionDialog } from '@/components/add-transaction-dialog'
import { AddTransferDialog } from '@/components/add-transfer-dialog'
import { DeleteTransactionAlert } from '@/components/delete-transaction-alert'
import { EditTransactionDialog } from '@/components/edit-transaction-dialog'
import { ImportTransactionsDialog } from '@/components/import-transactions-dialog'
import { InlineTransactionRow } from '@/components/inline-transaction-row'
import { AnimateSpinner } from '@/components/spinner'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { CurrencyDisplay } from '@/components/ui/currency-display'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyPlaceholder } from '@/components/ui/empty-placeholder'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
import Typography from '@/components/ui/typography'
import { formatDateForApi } from '@/lib/date'
import { downloadFile, serializeExport } from '@/lib/export'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarIcon,
  CircleDollarSign,
  Download,
  Filter,
  MoreHorizontal,
  Pencil,
  Repeat,
  Search,
  Trash,
  Upload,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

const ORDERING: Record<'newest' | 'oldest' | 'highest' | 'lowest', string> = {
  newest: '-transaction_date',
  oldest: 'transaction_date',
  highest: '-amount',
  lowest: 'amount',
}

export default function TransactionsPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  // The command palette's "Add transaction" action lands here with ?new=1 so
  // opening the dialog does not need its own route - see command-menu.tsx.
  // Read directly into the initial state (rather than an effect) so the
  // dialog is already open on first paint, with no ?new=1 -> render -> effect
  // -> setState -> re-render round trip.
  const [showAddTransaction, setShowAddTransaction] = useState(
    () => searchParams.get('new') === '1',
  )
  const [showAddTransfer, setShowAddTransfer] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showEditTransaction, setShowEditTransaction] = useState(false)
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<LedgerTransaction | null>(null)
  const [inlineEditId, setInlineEditId] = useState<number | null>(null)
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState('')
  const [transactionType, setTransactionType] = useState<'all' | 'income' | 'expense'>('all')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest')
  const [currentPage, setCurrentPage] = useState(1)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Also has to run when ?new=1 arrives on a navigation that does not remount
  // this page. Triggering the palette's action while already on /transactions
  // only changes the search params, so the initializer above never re-runs and
  // the dialog would otherwise stay shut. Depends on searchParams for exactly
  // that case; deleting the param on the way through keeps it idempotent, and
  // makes the setState a no-op when the initializer already opened the dialog.
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowAddTransaction(true)
      const next = new URLSearchParams(searchParams)
      next.delete('new')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  // Debounced so typing does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const isFiltering = Boolean(debouncedSearch || transactionType !== 'all' || date)

  // Any filter change invalidates the current page number. Adjusting state
  // during render (with a tracked previous value) is React's sanctioned
  // alternative to a setState-in-effect cascade.
  const filterKey = `${debouncedSearch}|${transactionType}|${sortOrder}|${date?.toISOString() ?? ''}`
  const [previousFilterKey, setPreviousFilterKey] = useState(filterKey)
  if (filterKey !== previousFilterKey) {
    setPreviousFilterKey(filterKey)
    setCurrentPage(1)
  }

  const {
    data: transactions,
    isLoading: isLoadingTransactions,
    mutate: refreshTransactions,
  } = useV1FinanceTransactionsList({
    page: currentPage,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    // These are querystring filters the endpoint supports beyond the generated
    // params type (type / date range); the SDK passes unknown params through.
    ...(transactionType !== 'all' ? ({ type: transactionType } as object) : {}),
    ...(date
      ? ({ start_date: formatDateForApi(date), end_date: formatDateForApi(date) } as object)
      : {}),
    ordering: ORDERING[sortOrder],
  })

  // Landing past the last page (e.g. after deleting the only row on it)
  // snaps back to page 1 - also adjusted during render, not in an effect.
  if (transactions?.count === 0 && currentPage > 1) {
    setCurrentPage(1)
  }

  if (isLoadingTransactions) {
    return <AnimateSpinner size={64} />
  }

  // Search, type, date and ordering are applied by the API across the whole
  // ledger. Doing it here only ever filtered the current page, so the result
  // count disagreed with what was shown.
  const filteredTransactions = Array.isArray(transactions?.results) ? transactions.results : []
  // The whole ledger is empty (not just this filtered view) - the friendly
  // onboarding message below instead of the plain "No transactions found"
  // row. The inline add row above the table stays visible either way: a
  // brand new account is exactly when the fast, no-dialog entry point
  // matters most, so it must not hide behind an empty-state early return.
  const hasNoTransactionsAtAll = !isFiltering && transactions?.count === 0

  const exportTransactions = (format: 'csv' | 'json') => {
    if (!filteredTransactions.length) {
      toast.error('No transactions available for export')
      return
    }

    const rows = filteredTransactions.map((transaction) => {
      const display = displayFields(transaction)
      return {
        id: transaction.id,
        date: transaction.transaction_date,
        title: display.title,
        category: display.categoryName || 'Uncategorized',
        type: display.kind,
        amount: display.amount.toFixed(2),
      }
    })

    const { content, mimeType, extension } = serializeExport(rows, format)
    const filename = `fintrack-transactions-${formatDateForApi(new Date())}.${extension}`
    downloadFile(content, filename, mimeType)
    toast.success(`Transactions exported as ${extension.toUpperCase()}`)
  }

  return (
    <div className='space-y-4 p-6'>
      <div className='flex items-center justify-between'>
        <Typography variant='h2'>Transactions</Typography>
        <div className='flex items-center gap-2'>
          <Button variant='outline' onClick={() => setShowImport(true)}>
            <Upload className='mr-2 h-4 w-4' />
            Import
          </Button>
          <Button variant='outline' onClick={() => setShowAddTransfer(true)}>
            <Repeat className='mr-2 h-4 w-4' />
            Add Transfer
          </Button>
          <Button onClick={() => setShowAddTransaction(true)}>Add Transaction</Button>
        </div>
      </div>

      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div className='flex flex-1 items-center gap-2'>
          <div className='relative flex-1'>
            <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
            <Input
              type='search'
              placeholder='Search transactions...'
              className='w-full pl-8'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' className='gap-1'>
                <Filter className='h-4 w-4' /> Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-[200px]'>
              <DropdownMenuCheckboxItem
                checked={transactionType === 'all'}
                onCheckedChange={() => setTransactionType('all')}
              >
                All Transactions
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={transactionType === 'income'}
                onCheckedChange={() => setTransactionType('income')}
              >
                Income Only
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={transactionType === 'expense'}
                onCheckedChange={() => setTransactionType('expense')}
              >
                Expenses Only
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant='outline' className='gap-1 w-[180px] justify-start'>
                <CalendarIcon className='h-4 w-4' />
                {date ? format(date, 'MMM dd, yyyy') : 'Select date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-auto p-0'>
              <Calendar mode='single' selected={date} onSelect={setDate} />
            </PopoverContent>
          </Popover>
        </div>
        <div className='flex items-center gap-2'>
          <Select
            value={sortOrder}
            onValueChange={(value) => setSortOrder(value as typeof sortOrder)}
          >
            <SelectTrigger aria-label='Sort by' className='w-[180px]'>
              <SelectValue placeholder='Sort by' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='newest'>Newest first</SelectItem>
              <SelectItem value='oldest'>Oldest first</SelectItem>
              <SelectItem value='highest'>Highest amount</SelectItem>
              <SelectItem value='lowest'>Lowest amount</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' size='icon' className='h-9 w-9'>
                <Download className='h-4 w-4' />
                <span className='sr-only'>Export transactions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem onClick={() => exportTransactions('csv')}>
                Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportTransactions('json')}>
                Export JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className='text-left'>Amount</TableHead>
              <TableHead className='w-[80px]'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <InlineTransactionRow onDone={() => void refreshTransactions()} />
            {isLoadingTransactions ? (
              <TableRow>
                <TableCell colSpan={5} className='text-center'>
                  <AnimateSpinner size={14} />
                </TableCell>
              </TableRow>
            ) : filteredTransactions?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className='text-center'>
                  {hasNoTransactionsAtAll ? (
                    <EmptyPlaceholder
                      icon={<CircleDollarSign className='w-12 h-12' />}
                      title='No transactions yet'
                      description='Add one above, or import a statement to get started.'
                      action={
                        <Button variant='outline' onClick={() => setShowImport(true)}>
                          <Upload className='mr-2 h-4 w-4' />
                          Import statement
                        </Button>
                      }
                    />
                  ) : (
                    <EmptyPlaceholder title={''} description={''}>
                      No transactions found
                    </EmptyPlaceholder>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions?.map((transaction) => {
                if (inlineEditId === transaction.id) {
                  return (
                    <InlineTransactionRow
                      key={transaction.id}
                      transaction={transaction}
                      onDone={() => setInlineEditId(null)}
                      onCancel={() => setInlineEditId(null)}
                    />
                  )
                }

                const display = displayFields(transaction)
                // A transfer has two account legs and no category leg.
                const isTransfer = transaction.posting_lines.every((line) => line.category === null)
                const categoryLabel = isTransfer
                  ? t('transactions.transfer')
                  : display.isSplit
                    ? t('transactions.splitCount', { count: display.categoryCount })
                    : display.categoryName || t('transactions.uncategorized')

                const canEditInline = !isTransfer && !display.isSplit
                const openEdit = () => {
                  if (canEditInline) {
                    setInlineEditId(transaction.id)
                  } else {
                    setSelectedTransaction(transaction)
                    setShowEditTransaction(true)
                  }
                }

                return (
                  <TableRow
                    key={transaction.id}
                    tabIndex={0}
                    className='cursor-default focus-visible:bg-muted/50 focus-visible:outline-none'
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        openEdit()
                      } else if (e.key === 'Delete' || e.key === 'Backspace') {
                        e.preventDefault()
                        setSelectedTransaction(transaction)
                        setShowDeleteAlert(true)
                      }
                    }}
                  >
                    <TableCell>
                      {format(new Date(transaction.transaction_date), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell>{display.title}</TableCell>
                    <TableCell>
                      {display.isSplit ? (
                        <span className='text-muted-foreground'>{categoryLabel}</span>
                      ) : (
                        categoryLabel
                      )}
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-2'>
                        {display.kind === 'income' ? (
                          <ArrowUpIcon className='h-4 w-4 text-emerald-600' />
                        ) : (
                          <ArrowDownIcon className='h-4 w-4 text-rose-600' />
                        )}
                        <span
                          className={cn(
                            'tabular-nums',
                            display.kind === 'income' ? 'text-emerald-600' : 'text-rose-600',
                          )}
                        >
                          <CurrencyDisplay amount={display.amount} />
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant='ghost' size='icon' className='h-8 w-8'>
                            <MoreHorizontal className='h-4 w-4' />
                            <span className='sr-only'>Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuItem onClick={openEdit}>
                            <Pencil className='mr-2 h-4 w-4' />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedTransaction(transaction)
                              setShowDeleteAlert(true)
                            }}
                            className='text-destructive focus:text-destructive'
                          >
                            <Trash className='mr-2 h-4 w-4' />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className='flex items-center justify-between'>
        <div className='text-sm text-muted-foreground'>
          Showing <strong>{filteredTransactions.length}</strong> of{' '}
          <strong>{transactions?.count || 0}</strong> transactions
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            disabled={!transactions?.previous}
            onClick={() => setCurrentPage((prev) => prev - 1)}
          >
            Previous
          </Button>
          <Button
            variant='outline'
            size='sm'
            disabled={!transactions?.next}
            onClick={() => setCurrentPage((prev) => prev + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <AddTransactionDialog open={showAddTransaction} onOpenChange={setShowAddTransaction} />
      <ImportTransactionsDialog open={showImport} onOpenChange={setShowImport} />
      <AddTransferDialog
        open={showAddTransfer}
        onOpenChange={setShowAddTransfer}
        onCreated={() => {
          void refreshTransactions(undefined, { revalidate: true })
        }}
      />
      {selectedTransaction && (
        <>
          <EditTransactionDialog
            open={showEditTransaction}
            onOpenChange={setShowEditTransaction}
            transaction={selectedTransaction}
          />
          <DeleteTransactionAlert
            open={showDeleteAlert}
            onOpenChange={setShowDeleteAlert}
            transactionId={String(selectedTransaction.id)}
            currentPage={currentPage}
          />
        </>
      )}
    </div>
  )
}
