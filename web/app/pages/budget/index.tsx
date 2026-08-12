'use client'

import {
  useV1BudgetsCreate,
  useV1BudgetsList,
  useV1CategoriesList,
  useV1TransactionsList,
  v1BudgetsUpdate,
} from '@/client/pft/v1/v1'
import { AnimateSpinner } from '@/components/spinner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { CurrencyDisplay } from '@/components/ui/currency-display'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import Typography from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import { Edit, Plus, CircleDollarSign } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { EmptyPlaceholder } from '@/components/ui/empty-placeholder'
import { Link } from 'react-router-dom'
import { TypeEnum } from '@/client/pft/typeEnum'

export default function BudgetsPage() {
  const [showAddBudget, setShowAddBudget] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [budgetAmount, setBudgetAmount] = useState<string>('')
  const [editingBudget, setEditingBudget] = useState<{
    id: number
    category: number
    amount_limit: string
  } | null>(null)

  const { data: budgets, isLoading: isLoadingBudgets, mutate: refreshBudgets } = useV1BudgetsList()
  const { data: categories, isLoading: isLoadingCategories } = useV1CategoriesList()
  const { data: transactions, isLoading: isLoadingTransactions } = useV1TransactionsList()
  const { trigger: createBudget } = useV1BudgetsCreate()

  const currentMonth = new Date()
  const currentMonthDisplay = currentMonth.toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  })

  // Calculate spent amounts for each budget
  const calculateSpentAmount = (categoryId: number) => {
    if (!Array.isArray(transactions?.results)) return 0

    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

    return transactions.results
      .filter((transaction) => {
        const transactionDate = new Date(transaction.transaction_date)
        return (
          transaction.category === categoryId &&
          transactionDate >= firstDayOfMonth &&
          transactionDate <= lastDayOfMonth &&
          categories?.results?.find((c) => c.id === transaction.category)?.type === TypeEnum.expense
        )
      })
      .reduce((total, transaction) => total + parseFloat(transaction.amount), 0)
  }

  const handleCreateBudget = async () => {
    try {
      await createBudget({
        category: parseInt(selectedCategory),
        amount_limit: budgetAmount,
        month: currentMonth.getMonth() + 1,
        year: currentMonth.getFullYear(),
      })
      toast.success('Budget created successfully')
      setShowAddBudget(false)
      setSelectedCategory('')
      setBudgetAmount('')
      refreshBudgets()
    } catch (err) {
      console.error('Failed to create budget:', err)
      toast.error('Failed to create budget')
    }
  }

  const handleUpdateBudget = async () => {
    if (!editingBudget) return

    try {
      const payload = {
        category: editingBudget.category,
        amount_limit: editingBudget.amount_limit, // Keep as string
        month: currentMonth.getMonth() + 1,
        year: currentMonth.getFullYear(),
      }

      await v1BudgetsUpdate(String(editingBudget.id), payload)
      toast.success('Budget updated successfully')
      setEditingBudget(null)
      refreshBudgets()
    } catch (err) {
      console.error('Failed to update budget:', err)
      toast.error('Failed to update budget')
    }
  }

  if (isLoadingBudgets || isLoadingCategories || isLoadingTransactions) {
    return <AnimateSpinner size={64} />
  }

  const expenseCategories = Array.isArray(categories?.results)
    ? categories?.results.filter((category) => category?.type === TypeEnum?.expense)
    : []

  // Check if there are any expense categories first
  if (!expenseCategories?.length) {
    return (
      <div className='p-6'>
        <EmptyPlaceholder
          icon={<CircleDollarSign className='w-12 h-12' />}
          title='No expense categories'
          description='You need to create expense categories before setting up budgets. Head over to the categories page to create some!'
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

  // Then check if there are any budgets
  if (!budgets?.results?.length) {
    return (
      <div className='p-6'>
        <EmptyPlaceholder
          icon={<CircleDollarSign className='w-12 h-12' />}
          title='No budgets set'
          description='Start managing your finances by setting spending limits for your expense categories.'
          action={<Button onClick={() => setShowAddBudget(true)}>Create Budget</Button>}
        />

        <Dialog open={showAddBudget} onOpenChange={setShowAddBudget}>
          <DialogContent className='sm:max-w-[425px]'>
            <DialogHeader>
              <DialogTitle>Budget</DialogTitle>
              <DialogDescription>
                Set a spending limit for a category for the current month.
              </DialogDescription>
            </DialogHeader>
            <div className='grid gap-4 py-4'>
              <div className='grid gap-2'>
                <Label htmlFor='category'>Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger id='category'>
                    <SelectValue placeholder='Select a category' />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories?.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='amount'>Budget Amount</Label>
                <Input
                  id='amount'
                  type='number'
                  placeholder='0.00'
                  step='0.01'
                  min='0'
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => setShowAddBudget(false)}>
                Cancel
              </Button>
              <Button type='submit' onClick={handleCreateBudget}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className='space-y-6 p-6'>
      <div className='flex items-center justify-between'>
        <div>
          <Typography variant='h2'>Budgets</Typography>
          <p className='text-muted-foreground'>
            Manage your spending limits for {currentMonthDisplay}
          </p>
        </div>
        <Button onClick={() => setShowAddBudget(true)}>Add Budget</Button>
      </div>

      <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
        {Array.isArray(budgets?.results) &&
          budgets?.results?.map((budget) => {
            const category = categories?.results?.find((c) => c.id === budget.category)
            if (!category) return null

            const spent = calculateSpentAmount(budget.category)
            const limit = parseFloat(budget.amount_limit)
            const percentage = (spent / limit) * 100

            return (
              <Card key={budget.id}>
                <CardHeader className='pb-2'>
                  <div className='flex items-center justify-between'>
                    <CardTitle>{category.name}</CardTitle>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-8 w-8'
                      onClick={() =>
                        setEditingBudget({
                          id: budget.id,
                          category: budget.category,
                          amount_limit: budget.amount_limit,
                        })
                      }
                    >
                      <Edit className='h-4 w-4' />
                      <span className='sr-only'>Edit</span>
                    </Button>
                  </div>
                  <CardDescription>
                    <CurrencyDisplay amount={spent} /> of <CurrencyDisplay amount={limit} />
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Progress
                    value={percentage}
                    className={cn(
                      percentage >= 100
                        ? 'text-rose-600'
                        : percentage >= 85
                        ? 'text-amber-600'
                        : '',
                    )}
                  />
                  <p
                    className={cn(
                      'mt-2 text-sm font-medium text-right',
                      percentage >= 100
                        ? 'text-rose-600'
                        : percentage >= 85
                        ? 'text-amber-600'
                        : 'text-emerald-600',
                    )}
                  >
                    {percentage.toFixed(1)}%
                  </p>
                </CardContent>
                <CardFooter className='pt-0'>
                  <div className='text-xs text-muted-foreground'>
                    {percentage >= 100 ? (
                      <span className='text-rose-600 font-medium'>
                        Over budget by <CurrencyDisplay amount={spent - limit} />
                      </span>
                    ) : (
                      <span>
                        <CurrencyDisplay amount={limit - spent} /> remaining
                      </span>
                    )}
                  </div>
                </CardFooter>
              </Card>
            )
          })}
      </div>

      {/* Add Budget Dialog */}
      <Dialog open={showAddBudget} onOpenChange={setShowAddBudget}>
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle>Budget</DialogTitle>
            <DialogDescription>
              Set a spending limit for a category for the current month.
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='category'>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger id='category'>
                  <SelectValue placeholder='Select a category' />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(expenseCategories) &&
                    expenseCategories
                      // ?.filter((category) => category.type === TypeEnum.expense)
                      ?.map((category) => {
                        console.log(category)
                        return (
                          <SelectItem key={category.id} value={String(category.id)}>
                            {category.name}
                          </SelectItem>
                        )
                      })}
                </SelectContent>
              </Select>
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='amount'>Budget Amount</Label>
              <Input
                id='amount'
                type='number'
                placeholder='0.00'
                step='0.01'
                min='0'
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setShowAddBudget(false)}>
              Cancel
            </Button>
            <Button type='submit' onClick={handleCreateBudget}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Budget Dialog */}
      <Dialog open={!!editingBudget} onOpenChange={(open) => !open && setEditingBudget(null)}>
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle>Edit Budget</DialogTitle>
            <DialogDescription>Update the budget limit for this category.</DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='edit-category'>Category</Label>
              <Select
                value={String(editingBudget?.category)}
                onValueChange={(value) =>
                  setEditingBudget((prev) => (prev ? { ...prev, category: parseInt(value) } : null))
                }
              >
                <SelectTrigger id='edit-category'>
                  <SelectValue placeholder='Select a category' />
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
              <Label htmlFor='edit-amount'>Budget Amount</Label>
              <Input
                id='edit-amount'
                type='number'
                placeholder='0.00'
                step='0.01'
                min='0'
                value={editingBudget?.amount_limit || ''}
                onChange={(e) =>
                  setEditingBudget((prev) =>
                    prev ? { ...prev, amount_limit: e.target.value } : null,
                  )
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setEditingBudget(null)}>
              Cancel
            </Button>
            <Button type='submit' onClick={handleUpdateBudget}>
              Update Budget
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
