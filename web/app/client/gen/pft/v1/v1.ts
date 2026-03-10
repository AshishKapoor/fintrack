import { httpPFTClient } from '@/client/httpPFTClient'
import type { SWRConfiguration } from 'swr'
import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import type { Transaction } from '../transaction'
import type { TypeEnum } from '../typeEnum'

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface Category {
  id: number
  name: string
  type: TypeEnum
  user: number | null
}

export interface Budget {
  id: number
  user: number
  category: number
  month: number
  year: number
  amount_limit: string
}

export interface V1TransactionsListParams {
  ordering?: string
  page?: number
  search?: string
  start_date?: string
  end_date?: string
}

export interface V1CategoryListParams {
  page?: number
}

export interface V1BudgetListParams {
  page?: number
}

export interface HookOptions<T> {
  swr?: SWRConfiguration<T>
}

export interface TransactionMutationPayload {
  user?: number
  title: string
  amount: string | number
  type: TypeEnum
  category?: number | null
  transaction_date: string
}

export interface CategoryMutationPayload {
  name: string
  type: TypeEnum
}

export interface BudgetMutationPayload {
  category: number
  month: number
  year: number
  amount_limit: string | number
}

interface V2BudgetFile {
  id: number
  is_default: boolean
}

interface V2Account {
  id: number
}

interface V2Category {
  id: number
  name: string
  kind: TypeEnum
}

interface V2Posting {
  id: number
  account: number | null
  category: number | null
  amount: string
  memo: string
  sort_order: number
}

interface V2LedgerTransaction {
  id: number
  budget_file: number
  transaction_date: string
  memo: string
  posting_lines: V2Posting[]
  created_at: string
  updated_at: string
}

interface V2BudgetMonth {
  id: number
  budget_file: number
  year: number
  month: number
}

interface V2EnvelopeAssignment {
  id: number
  budget_month: number
  category: number
  assigned_amount: string
}

const V2_ENABLED = String(import.meta.env.VITE_FINANCE_V2 || 'false').toLowerCase() === 'true'

let budgetFileCache: number | null = null
let accountCache: Record<number, number> = {}

const toQueryString = (params: object) => {
  const search = new URLSearchParams()
  Object.entries(params as Record<string, string | number | undefined | null>).forEach(
    ([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        search.set(key, String(value))
      }
    },
  )
  const query = search.toString()
  return query ? `?${query}` : ''
}

const asPaginated = <T>(payload: unknown): PaginatedResponse<T> => {
  if (Array.isArray(payload)) {
    return {
      count: payload.length,
      next: null,
      previous: null,
      results: payload as T[],
    }
  }

  const maybe = payload as Partial<PaginatedResponse<T>>
  if (Array.isArray(maybe.results)) {
    return {
      count: maybe.count ?? maybe.results.length,
      next: maybe.next ?? null,
      previous: maybe.previous ?? null,
      results: maybe.results,
    }
  }

  return {
    count: 0,
    next: null,
    previous: null,
    results: [],
  }
}

const get = async <T>(url: string): Promise<T> => {
  return httpPFTClient<T>({
    url,
    method: 'GET',
  })
}

const post = async <T>(url: string, data: unknown): Promise<T> => {
  return httpPFTClient<T>({
    url,
    method: 'POST',
    data,
  })
}

const put = async <T>(url: string, data: unknown): Promise<T> => {
  return httpPFTClient<T>({
    url,
    method: 'PUT',
    data,
  })
}

const del = async (url: string): Promise<void> => {
  return httpPFTClient<void>({
    url,
    method: 'DELETE',
  })
}

const formatAmount = (value: string | number) => {
  const n = Number(value || 0)
  if (Number.isNaN(n)) return '0.00'
  return n.toFixed(2)
}

const amountAbs = (value: string | number) => Math.abs(Number(value || 0))

const resolveDefaultBudgetFileId = async () => {
  if (budgetFileCache) return budgetFileCache

  const response = await get<PaginatedResponse<V2BudgetFile> | V2BudgetFile[]>('/api/v2/budget-files/')
  const files = asPaginated<V2BudgetFile>(response).results

  let selected = files.find((file) => file.is_default) || files[0]
  if (!selected) {
    selected = await post<V2BudgetFile>('/api/v2/budget-files/', {
      name: 'Primary Budget',
      currency_code: 'USD',
      is_default: true,
    })
  }

  budgetFileCache = selected.id
  return selected.id
}

const resolveDefaultAccountId = async (budgetFileId: number) => {
  if (accountCache[budgetFileId]) return accountCache[budgetFileId]

  const response = await get<PaginatedResponse<V2Account> | V2Account[]>(
    `/api/v2/accounts/${toQueryString({ budget_file: budgetFileId })}`,
  )
  const accounts = asPaginated<V2Account>(response).results

  let selected = accounts[0]
  if (!selected) {
    selected = await post<V2Account>('/api/v2/accounts/', {
      budget_file: budgetFileId,
      name: 'Cash',
      type: 'checking',
      opening_balance: '0.00',
    })
  }

  accountCache[budgetFileId] = selected.id
  return selected.id
}

const v2CategoriesList = async (): Promise<PaginatedResponse<Category>> => {
  const budgetFileId = await resolveDefaultBudgetFileId()
  const response = await get<PaginatedResponse<V2Category> | V2Category[]>(
    `/api/v2/categories/${toQueryString({ budget_file: budgetFileId })}`,
  )

  const mapped = asPaginated<V2Category>(response).results.map((item) => ({
    id: item.id,
    name: item.name,
    type: item.kind,
    user: null,
  }))

  return {
    count: mapped.length,
    next: null,
    previous: null,
    results: mapped,
  }
}

const resolveCategoryId = async (
  budgetFileId: number,
  type: TypeEnum,
  categoryId?: number | null,
): Promise<number> => {
  if (categoryId) return categoryId

  const categories = await v2CategoriesList()
  const existing = categories.results.find((item) => item.type === type)
  if (existing) return existing.id

  const created = await post<V2Category>('/api/v2/categories/', {
    budget_file: budgetFileId,
    name: type === 'income' ? 'Income' : 'Expense',
    kind: type,
  })
  return created.id
}

const mapV2Transaction = (tx: V2LedgerTransaction): Transaction => {
  const categoryPosting = tx.posting_lines.find((line) => line.category !== null)
  const raw = Number(categoryPosting?.amount ?? tx.posting_lines[0]?.amount ?? '0')
  const type: TypeEnum = raw < 0 ? 'income' : 'expense'

  return {
    id: tx.id,
    user: 0,
    title: tx.memo || `Transaction ${tx.id}`,
    amount: formatAmount(amountAbs(raw)),
    type,
    category: categoryPosting?.category ?? null,
    transaction_date: tx.transaction_date,
    created_at: tx.created_at,
    updated_at: tx.updated_at,
  }
}

const v2TransactionsList = async (
  params: V1TransactionsListParams,
): Promise<PaginatedResponse<Transaction>> => {
  const budgetFileId = await resolveDefaultBudgetFileId()
  const query = toQueryString({ ...params, budget_file: budgetFileId })
  const response = await get<PaginatedResponse<V2LedgerTransaction> | V2LedgerTransaction[]>(
    `/api/v2/transactions/${query}`,
  )
  const result = asPaginated<V2LedgerTransaction>(response)

  return {
    count: result.count,
    next: result.next,
    previous: result.previous,
    results: result.results.map(mapV2Transaction),
  }
}

const createOrUpdateV2Transaction = async (
  payload: TransactionMutationPayload,
  id?: string,
): Promise<Transaction> => {
  const budgetFileId = await resolveDefaultBudgetFileId()
  const accountId = await resolveDefaultAccountId(budgetFileId)
  const categoryId = await resolveCategoryId(budgetFileId, payload.type, payload.category)
  const amount = amountAbs(payload.amount)

  const accountAmount = payload.type === 'income' ? amount : -amount
  const categoryAmount = -accountAmount

  const body = {
    budget_file: budgetFileId,
    transaction_date: payload.transaction_date,
    memo: payload.title,
    postings: [
      {
        account: accountId,
        category: null,
        amount: formatAmount(accountAmount),
        memo: payload.title,
        sort_order: 0,
      },
      {
        account: null,
        category: categoryId,
        amount: formatAmount(categoryAmount),
        memo: payload.title,
        sort_order: 1,
      },
    ],
  }

  const tx = id
    ? await put<V2LedgerTransaction>(`/api/v2/transactions/${id}/`, body)
    : await post<V2LedgerTransaction>('/api/v2/transactions/', body)

  return mapV2Transaction(tx)
}

const getOrCreateBudgetMonth = async (budgetFileId: number, year: number, month: number) => {
  const response = await get<PaginatedResponse<V2BudgetMonth> | V2BudgetMonth[]>(
    `/api/v2/budget-months/${toQueryString({ budget_file: budgetFileId, year, month })}`,
  )
  const months = asPaginated<V2BudgetMonth>(response).results
  if (months[0]) return months[0]

  return post<V2BudgetMonth>('/api/v2/budget-months/', {
    budget_file: budgetFileId,
    year,
    month,
    mode: 'envelope',
  })
}

const mapAssignmentToBudget = (
  assignment: V2EnvelopeAssignment,
  budgetMonth: V2BudgetMonth,
): Budget => ({
  id: assignment.id,
  user: 0,
  category: assignment.category,
  month: budgetMonth.month,
  year: budgetMonth.year,
  amount_limit: assignment.assigned_amount,
})

const v2BudgetsList = async (): Promise<PaginatedResponse<Budget>> => {
  const budgetFileId = await resolveDefaultBudgetFileId()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const monthResponse = await get<PaginatedResponse<V2BudgetMonth> | V2BudgetMonth[]>(
    `/api/v2/budget-months/${toQueryString({ budget_file: budgetFileId, year, month })}`,
  )
  const budgetMonth = asPaginated<V2BudgetMonth>(monthResponse).results[0]
  if (!budgetMonth) {
    return { count: 0, next: null, previous: null, results: [] }
  }

  const assignmentsResponse = await get<PaginatedResponse<V2EnvelopeAssignment> | V2EnvelopeAssignment[]>(
    `/api/v2/envelope-assignments/${toQueryString({ budget_month: budgetMonth.id })}`,
  )
  const assignments = asPaginated<V2EnvelopeAssignment>(assignmentsResponse).results
  const mapped = assignments.map((assignment) => mapAssignmentToBudget(assignment, budgetMonth))

  return {
    count: mapped.length,
    next: null,
    previous: null,
    results: mapped,
  }
}

const createOrUpdateV2Budget = async (payload: BudgetMutationPayload): Promise<Budget> => {
  const budgetFileId = await resolveDefaultBudgetFileId()
  const budgetMonth = await getOrCreateBudgetMonth(budgetFileId, payload.year, payload.month)

  const existingResponse = await get<PaginatedResponse<V2EnvelopeAssignment> | V2EnvelopeAssignment[]>(
    `/api/v2/envelope-assignments/${toQueryString({
      budget_month: budgetMonth.id,
      category: payload.category,
    })}`,
  )
  const existing = asPaginated<V2EnvelopeAssignment>(existingResponse).results[0]

  const body = {
    budget_month: budgetMonth.id,
    category: payload.category,
    assigned_amount: formatAmount(payload.amount_limit),
    carryover_amount: '0.00',
    goal_type: 'none',
    priority: 100,
  }

  const assignment = existing
    ? await put<V2EnvelopeAssignment>(`/api/v2/envelope-assignments/${existing.id}/`, body)
    : await post<V2EnvelopeAssignment>('/api/v2/envelope-assignments/', body)

  return mapAssignmentToBudget(assignment, budgetMonth)
}

export const useV1TransactionsList = (
  params: V1TransactionsListParams = {},
  options?: HookOptions<PaginatedResponse<Transaction>>,
) => {
  const query = toQueryString(params)
  const url = `/api/v1/transactions/${query}`
  return useSWR<PaginatedResponse<Transaction>>(
    url,
    async (key: string) => {
      if (!V2_ENABLED) return get<PaginatedResponse<Transaction>>(key)
      return v2TransactionsList(params)
    },
    options?.swr,
  )
}

export const useV1CategoriesList = (
  params: V1CategoryListParams = {},
  options?: HookOptions<PaginatedResponse<Category>>,
) => {
  const query = toQueryString(params)
  const url = `/api/v1/categories/${query}`
  return useSWR<PaginatedResponse<Category>>(
    url,
    async (key: string) => {
      if (!V2_ENABLED) return get<PaginatedResponse<Category>>(key)
      return v2CategoriesList()
    },
    options?.swr,
  )
}

export const useV1BudgetsList = (
  params: V1BudgetListParams = {},
  options?: HookOptions<PaginatedResponse<Budget>>,
) => {
  const query = toQueryString(params)
  const url = `/api/v1/budgets/${query}`
  return useSWR<PaginatedResponse<Budget>>(
    url,
    async (key: string) => {
      if (!V2_ENABLED) return get<PaginatedResponse<Budget>>(key)
      return v2BudgetsList()
    },
    options?.swr,
  )
}

export const useV1TransactionsCreate = () => {
  return useSWRMutation(
    '/api/v1/transactions/',
    async (_, { arg }: { arg: TransactionMutationPayload }) => {
      if (!V2_ENABLED) return post<Transaction>('/api/v1/transactions/', arg)
      return createOrUpdateV2Transaction(arg)
    },
  )
}

export const useV1TransactionsUpdate = (id?: string) => {
  const key = id ? `/api/v1/transactions/${id}/` : null
  return useSWRMutation(
    key,
    async (_, { arg }: { arg: TransactionMutationPayload }) => {
      if (!id) {
        throw new Error('Transaction id is required for update')
      }
      if (!V2_ENABLED) {
        return put<Transaction>(`/api/v1/transactions/${id}/`, arg)
      }
      return createOrUpdateV2Transaction(arg, id)
    },
  )
}

export const useV1TransactionsDestroy = (id?: string) => {
  const key = id ? `/api/v1/transactions/${id}/` : null
  return useSWRMutation(
    key,
    async () => {
      if (!id) {
        throw new Error('Transaction id is required for delete')
      }
      if (!V2_ENABLED) {
        await del(`/api/v1/transactions/${id}/`)
        return
      }
      await del(`/api/v2/transactions/${id}/`)
    },
  )
}

export const useV1CategoriesCreate = () => {
  return useSWRMutation(
    '/api/v1/categories/',
    async (_, { arg }: { arg: CategoryMutationPayload }) => {
      if (!V2_ENABLED) {
        return post<Category>('/api/v1/categories/', arg)
      }
      const budgetFileId = await resolveDefaultBudgetFileId()
      const created = await post<V2Category>('/api/v2/categories/', {
        budget_file: budgetFileId,
        name: arg.name,
        kind: arg.type,
      })
      return {
        id: created.id,
        name: created.name,
        type: created.kind,
        user: null,
      }
    },
  )
}

export const useV1BudgetsCreate = () => {
  return useSWRMutation(
    '/api/v1/budgets/',
    async (_, { arg }: { arg: BudgetMutationPayload }) => {
      if (!V2_ENABLED) return post<Budget>('/api/v1/budgets/', arg)
      return createOrUpdateV2Budget(arg)
    },
  )
}

export const v1CategoriesUpdate = async (id: string, payload: CategoryMutationPayload) => {
  if (!V2_ENABLED) {
    return put<Category>(`/api/v1/categories/${id}/`, payload)
  }
  const updated = await put<V2Category>(`/api/v2/categories/${id}/`, {
    name: payload.name,
    kind: payload.type,
  })
  return {
    id: updated.id,
    name: updated.name,
    type: updated.kind,
    user: null,
  }
}

export const v1CategoriesDestroy = (id: string) => {
  if (!V2_ENABLED) {
    return del(`/api/v1/categories/${id}/`)
  }
  return del(`/api/v2/categories/${id}/`)
}

export const v1BudgetsUpdate = async (id: string, payload: BudgetMutationPayload) => {
  if (!V2_ENABLED) {
    return put<Budget>(`/api/v1/budgets/${id}/`, payload)
  }

  const budgetFileId = await resolveDefaultBudgetFileId()
  const budgetMonth = await getOrCreateBudgetMonth(budgetFileId, payload.year, payload.month)
  const assignment = await put<V2EnvelopeAssignment>(`/api/v2/envelope-assignments/${id}/`, {
    budget_month: budgetMonth.id,
    category: payload.category,
    assigned_amount: formatAmount(payload.amount_limit),
    carryover_amount: '0.00',
    goal_type: 'none',
    priority: 100,
  })

  return mapAssignmentToBudget(assignment, budgetMonth)
}
