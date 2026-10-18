'use client'

import { useAllCategories } from '@/lib/finance-lists'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDownIcon, ArrowUpIcon, Edit, FolderIcon, Plus, Trash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import Typography from '@/components/ui/typography'
import {
  v1FinanceCategoriesCreate,
  v1FinanceCategoriesDestroy,
  v1FinanceCategoriesUpdate,
} from '@/client/gen/pft/v1/v1'
import { getDefaultBudgetFileId } from '@/lib/finance-client'
import { AnimateSpinner } from '@/components/spinner'
import { LoadError } from '@/components/load-error'
import { EmptyPlaceholder } from '@/components/ui/empty-placeholder'
import { toast } from 'sonner'

export default function CategoriesPage() {
  const { t } = useTranslation()
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [categoryType, setCategoryType] = useState<'income' | 'expense'>('expense')
  const [categoryName, setCategoryName] = useState('')
  const [editingCategory, setEditingCategory] = useState<{
    id: number
    name: string
    type: 'income' | 'expense'
  } | null>(null)

  const {
    data: categories,
    isLoading,
    error: categoriesError,
    mutate: refreshCategories,
  } = useAllCategories()

  // Native ledger categories: the classification field is `kind`. Adapt to the
  // page's existing `type` vocabulary at the boundary.
  const categoriesList = (categories ?? [])
    .filter((category) => !category.is_archived)
    .map((category) => ({
      id: category.id,
      name: category.name,
      type: (category.kind ?? 'expense') as 'income' | 'expense',
    }))

  const handleCreateCategory = async () => {
    try {
      await v1FinanceCategoriesCreate({
        budget_file: await getDefaultBudgetFileId(),
        name: categoryName,
        kind: categoryType,
      })
      toast.success(t('categories.created'))
      setShowAddCategory(false)
      setCategoryName('')
      refreshCategories()
    } catch (err) {
      console.error('Failed to create category:', err)
      toast.error(t('categories.createFailed'))
    }
  }

  const handleUpdateCategory = async () => {
    if (!editingCategory) return

    try {
      await v1FinanceCategoriesUpdate(editingCategory.id.toString(), {
        budget_file: await getDefaultBudgetFileId(),
        name: editingCategory.name,
        kind: editingCategory.type,
      })
      toast.success(t('categories.updated'))
      setEditingCategory(null)
      refreshCategories()
    } catch (err) {
      console.error('Failed to update category:', err)
      toast.error(t('categories.updateFailed'))
    }
  }

  const handleDeleteCategory = async (categoryId: number) => {
    try {
      await v1FinanceCategoriesDestroy(categoryId.toString())
      toast.success(t('categories.deleted'))
      refreshCategories()
    } catch (err) {
      console.error('Failed to delete category:', err)
      toast.error(t('categories.deleteFailed'))
    }
  }

  if (isLoading) {
    return <AnimateSpinner size={64} />
  }

  if (categoriesError && !categories) {
    return (
      <div className='space-y-4 p-6'>
        <Typography variant='h2' as='h1'>
          {t('categories.title')}
        </Typography>
        <LoadError what={t('loadError.categories')} onRetry={() => void refreshCategories()} />
      </div>
    )
  }

  if (!categoriesList?.length) {
    return (
      <div className='p-6'>
        <EmptyPlaceholder
          icon={<FolderIcon className='w-12 h-12' />}
          title={t('categories.emptyTitle')}
          description={t('categories.emptyDescription')}
          action={
            <Button onClick={() => setShowAddCategory(true)}>
              <Plus className='mr-2 h-4 w-4' /> {t('categories.createCategory')}
            </Button>
          }
        />
        <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
          <DialogContent className='sm:max-w-[425px]'>
            <DialogHeader>
              <DialogTitle>{t('categories.dialogTitle')}</DialogTitle>
              <DialogDescription>
                {t('categories.dialogDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className='grid gap-4 py-4'>
              <div className='grid gap-2'>
                <Label htmlFor='category-type'>{t('categories.categoryType')}</Label>
                <RadioGroup
                  id='category-type'
                  value={categoryType}
                  onValueChange={(value) => setCategoryType(value as 'income' | 'expense')}
                  className='flex'
                >
                  <div className='flex items-center space-x-2'>
                    <RadioGroupItem value='expense' id='expense-type' />
                    <Label htmlFor='expense-type' className='cursor-pointer'>
                      {t('categories.expense')}
                    </Label>
                  </div>
                  <div className='flex items-center space-x-2 ml-4'>
                    <RadioGroupItem value='income' id='income-type' />
                    <Label htmlFor='income-type' className='cursor-pointer'>
                      {t('categories.income')}
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='name'>{t('categories.categoryName')}</Label>
                <Input
                  id='name'
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder={t('categories.namePlaceholder')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => setShowAddCategory(false)}>
                {t('common.cancel')}
              </Button>
              <Button type='submit' onClick={handleCreateCategory}>
                {t('common.save')}
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
        <Typography variant='h2' as='h1'>{t('categories.title')}</Typography>
        <Button onClick={() => setShowAddCategory(true)}>{t('categories.addCategory')}</Button>
      </div>

      <div className='grid gap-6 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>{t('categories.expenseTitle')}</CardTitle>
            <CardDescription>{t('categories.expenseDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('categories.name')}</TableHead>
                  <TableHead className='w-[100px]'></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoriesList
                  .filter((category) => category.type === 'expense')
                  .map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className='font-medium'>
                        <div className='flex items-center'>
                          <ArrowDownIcon className='mr-2 h-4 w-4 text-expense' />
                          {category.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className='flex justify-end gap-2'>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-8 w-8'
                            onClick={() => setEditingCategory(category)}
                          >
                            <Edit className='h-4 w-4' />
                            <span className='sr-only'>{t('categories.edit')}</span>
                          </Button>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-8 w-8'
                            onClick={() => handleDeleteCategory(category.id)}
                          >
                            <Trash className='h-4 w-4' />
                            <span className='sr-only'>{t('categories.delete')}</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('categories.incomeTitle')}</CardTitle>
            <CardDescription>{t('categories.incomeDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('categories.name')}</TableHead>
                  <TableHead className='w-[100px]'></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoriesList
                  .filter((category) => category.type === 'income')
                  .map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className='font-medium'>
                        <div className='flex items-center'>
                          <ArrowUpIcon className='mr-2 h-4 w-4 text-income' />
                          {category.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className='flex justify-end gap-2'>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-8 w-8'
                            onClick={() => setEditingCategory(category)}
                          >
                            <Edit className='h-4 w-4' />
                            <span className='sr-only'>{t('categories.edit')}</span>
                          </Button>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-8 w-8'
                            onClick={() => handleDeleteCategory(category.id)}
                          >
                            <Trash className='h-4 w-4' />
                            <span className='sr-only'>{t('categories.delete')}</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add Category Dialog */}
      <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle>{t('categories.dialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('categories.dialogDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='category-type'>{t('categories.categoryType')}</Label>
              <RadioGroup
                id='category-type'
                value={categoryType}
                onValueChange={(value) => setCategoryType(value as 'income' | 'expense')}
                className='flex'
              >
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='expense' id='expense-type' />
                  <Label htmlFor='expense-type' className='cursor-pointer'>
                    {t('categories.expense')}
                  </Label>
                </div>
                <div className='flex items-center space-x-2 ml-4'>
                  <RadioGroupItem value='income' id='income-type' />
                  <Label htmlFor='income-type' className='cursor-pointer'>
                    {t('categories.income')}
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='name'>{t('categories.categoryName')}</Label>
              <Input
                id='name'
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder={t('categories.namePlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setShowAddCategory(false)}>
              {t('common.cancel')}
            </Button>
            <Button type='submit' onClick={handleCreateCategory}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle>{t('categories.editTitle')}</DialogTitle>
            <DialogDescription>{t('categories.editDescription')}</DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='edit-category-type'>{t('categories.categoryType')}</Label>
              <RadioGroup
                id='edit-category-type'
                value={editingCategory?.type}
                onValueChange={(value) =>
                  setEditingCategory((prev) => (prev ? { ...prev, type: value as 'income' | 'expense' } : null))
                }
                className='flex'
              >
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='expense' id='edit-expense-type' />
                  <Label htmlFor='edit-expense-type' className='cursor-pointer'>
                    {t('categories.expense')}
                  </Label>
                </div>
                <div className='flex items-center space-x-2 ml-4'>
                  <RadioGroupItem value='income' id='edit-income-type' />
                  <Label htmlFor='edit-income-type' className='cursor-pointer'>
                    {t('categories.income')}
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='edit-name'>{t('categories.categoryName')}</Label>
              <Input
                id='edit-name'
                value={editingCategory?.name || ''}
                onChange={(e) =>
                  setEditingCategory((prev) => (prev ? { ...prev, name: e.target.value } : null))
                }
                placeholder={t('categories.namePlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setEditingCategory(null)}>
              {t('common.cancel')}
            </Button>
            <Button type='submit' onClick={handleUpdateCategory}>
              {t('categories.updateCategory')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
