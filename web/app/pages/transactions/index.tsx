'use client'

import { Transaction } from '@/client/gen/pft/transaction'
import { TypeEnum } from '@/client/gen/pft/typeEnum'

import { useV1CategoriesList, useV1TransactionsList } from '@/client/gen/pft/v1/v1'
import { AddTransactionDialog } from '@/components/add-transaction-dialog'
import { AddTransferDialog } from '@/components/add-transfer-dialog'
import { DeleteTransactionAlert } from '@/components/delete-transaction-alert'
import { EditTransactionDialog } from '@/components/edit-transaction-dialog'
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
  Plus,
  Repeat,
  Search,
  Trash,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

export default function TransactionsPage() {
  const [showAddTransaction, setShowAddTransaction] = useState(false)
  const [showAddTransfer, setShowAddTransfer] = useState(false)
  const [showEditTransaction, setShowEditTransaction] = useState(false)
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState('')
  const [transactionType, setTransactionType] = useState<'all' | 'income' | 'expense'>('all')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest')
  const [currentPage, setCurrentPage] = useState(1)

  const {
    data: transactions,
    isLoading: isLoadingTransactions,
    mutate: refreshTransactions,
  } = useV1TransactionsList({
    page: currentPage,
  })

  useEffect(() => {
    if (transactions?.count === 0 && currentPage > 1) {
      setCurrentPage(1)
    }
  }, [transactions?.count, currentPage])

  const { data: categories, isLoading: isLoadingCategories } = useV1CategoriesList()

  if (isLoadingTransactions || isLoadingCategories) {
    return <AnimateSpinner size={64} />
  }

  // Check if there are any categories first
  if (!categories?.results?.length) {
    return (
      <div className='p-6'>
        <EmptyPlaceholder
          icon={<CircleDollarSign className='w-12 h-12' />}
          title='No categories available'
          description='You need to create categories before adding transactions. Head over to the categories page to create some!'
          action={
            <Link to='/categories'>
              <Button>
                <Plus className='mr-2 h-4 w-4' /> Create Categories
              </Button>
            </Link>
          }
        />
      </div>
    )
  }

  // Show empty state for no transactions
  if (!transactions?.results?.length) {
    return (
      <div className='p-6'>
        <EmptyPlaceholder
          icon={<CircleDollarSign className='w-12 h-12' />}
          title='No transactions yet'
          description='Start tracking your finances by adding your first transaction.'
          action={<Button onClick={() => setShowAddTransaction(true)}>Add Transaction</Button>}
        />
        <AddTransactionDialog open={showAddTransaction} onOpenChange={setShowAddTransaction} />
      </div>
    )
  }

  const filteredTransactions = Array.isArray(transactions?.results)
    ? transactions?.results
        ?.filter((transaction) => {
          const matchesSearch = transaction.title.toLowerCase().includes(searchQuery.toLowerCase())
          const matchesType = transactionType === 'all' || transaction.type === transactionType
          const matchesDate = !date || transaction.transaction_date === format(date, 'yyyy-MM-dd')
          return matchesSearch && matchesType && matchesDate
        })
        .sort((a, b) => {
          switch (sortOrder) {
            case 'newest':
              return new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
            case 'oldest':
              return new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
            case 'highest':
              return parseFloat(b.amount) - parseFloat(a.amount)
            case 'lowest':
              return parseFloat(a.amount) - parseFloat(b.amount)
            default:
              return 0
          }
        })
    : []

  const getCategoryName = (categoryId: number | null | undefined) =>
    categories?.results?.find((category) => category.id === categoryId)?.name || 'Uncategorized'

  const escapeCsvCell = (value: string | number, sanitizeFormula = false) => {
    const rawValue = String(value)
    const safeValue =
      sanitizeFormula && /^[=+\-@]/.test(rawValue.trimStart()) ? `'${rawValue}` : rawValue
    return `"${safeValue.replace(/"/g, '""')}"`
  }

  const exportTransactions = (format: 'csv' | 'json') => {
    if (!filteredTransactions.length) {
      toast.error('No transactions available for export')
      return
    }

    const exportRows = filteredTransactions.map((transaction) => ({
      id: transaction.id,
      date: transaction.transaction_date,
      title: transaction.title,
      category: getCategoryName(transaction.category),
      type: transaction.type,
      amount: transaction.amount,
    }))

    const dateStamp = formatDateForApi(new Date())
    const baseFilename = `fintrack-transactions-${dateStamp}`
    let content = ''
    let mimeType = ''
    let extension = ''

    if (format === 'json') {
      content = JSON.stringify(exportRows, null, 2)
      mimeType = 'application/json'
      extension = 'json'
    } else {
      const header = ['id', 'date', 'title', 'category', 'type', 'amount']
      const lines = exportRows.map((row) =>
        [
          escapeCsvCell(row.id),
          escapeCsvCell(row.date),
          escapeCsvCell(row.title, true),
          escapeCsvCell(row.category, true),
          escapeCsvCell(row.type),
          escapeCsvCell(row.amount),
        ].join(','),
      )
      content = [header.join(','), ...lines].join('\\n')
      mimeType = 'text/csv;charset=utf-8'
      extension = 'csv'
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${baseFilename}.${extension}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success(`Transactions exported as ${extension.toUpperCase()}`)
  }

  return (
    <div className='space-y-4 p-6'>
      <div className='flex items-center justify-between'>
        <Typography variant='h2'>Transactions</Typography>
        <div className='flex items-center gap-2'>
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
              <Calendar mode='single' selected={date} onSelect={setDate} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
        <div className='flex items-center gap-2'>
          <Select
            value={sortOrder}
            onValueChange={(value) => setSortOrder(value as typeof sortOrder)}
          >
            <SelectTrigger className='w-[180px]'>
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
            {isLoadingTransactions ? (
              <TableRow>
                <TableCell colSpan={5} className='text-center'>
                  <AnimateSpinner size={14} />
                </TableCell>
              </TableRow>
            ) : filteredTransactions?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className='text-center'>
                  <EmptyPlaceholder title={''} description={''}>
                    No transactions found
                  </EmptyPlaceholder>
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions?.map((transaction) => {
                const category = categories?.results?.find((c) => c.id === transaction.category)
                const isTransfer = transaction.category === null && /transfer/i.test(transaction.title)
                const categoryName = isTransfer ? 'Transfer' : category?.name || 'Uncategorized'

                return (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {format(new Date(transaction.transaction_date), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell>{transaction.title}</TableCell>
                    <TableCell>{categoryName}</TableCell>
                    <TableCell>
                      <div className='flex items-center gap-2'>
                        {transaction.type === TypeEnum.income ? (
                          <ArrowUpIcon className='h-4 w-4 text-emerald-600' />
                        ) : (
                          <ArrowDownIcon className='h-4 w-4 text-rose-600' />
                        )}
                        <span
                          className={cn(
                            'tabular-nums',
                            transaction.type === TypeEnum.income
                              ? 'text-emerald-600'
                              : 'text-rose-600',
                          )}
                        >
                          <CurrencyDisplay amount={parseFloat(transaction.amount)} />
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
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedTransaction(transaction)
                              setShowEditTransaction(true)
                            }}
                          >
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
