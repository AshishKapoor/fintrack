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

interface FinanceBudgetFile {
  id: number
  is_default: boolean
}

interface FinanceAccount {
  id: number
}

interface FinanceCategory {
  id: number
  name: string
  kind: TypeEnum
}

interface FinancePosting {
  id: number
  account: number | null
  category: number | null
  amount: string
  memo: string
  sort_order: number
}

interface FinanceLedgerTransaction {
  id: number
  budget_file: number
  transaction_date: string
  memo: string
  posting_lines: FinancePosting[]
  created_at: string
  updated_at: string
}

interface FinanceBudgetMonth {
  id: number
  budget_file: number
  year: number
  month: number
}

interface FinanceEnvelopeAssignment {
  id: number
  budget_month: number
  category: number
  assigned_amount: string
}

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

  const response = await get<PaginatedResponse<FinanceBudgetFile> | FinanceBudgetFile[]>('/api/v1/finance/budget-files/')
  const files = asPaginated<FinanceBudgetFile>(response).results

  let selected = files.find((file) => file.is_default) || files[0]
  if (!selected) {
    selected = await post<FinanceBudgetFile>('/api/v1/finance/budget-files/', {
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

  const response = await get<PaginatedResponse<FinanceAccount> | FinanceAccount[]>(
    `/api/v1/finance/accounts/${toQueryString({ budget_file: budgetFileId })}`,
  )
  const accounts = asPaginated<FinanceAccount>(response).results

  let selected = accounts[0]
  if (!selected) {
    selected = await post<FinanceAccount>('/api/v1/finance/accounts/', {
      budget_file: budgetFileId,
      name: 'Cash',
      type: 'checking',
      opening_balance: '0.00',
    })
  }

  accountCache[budgetFileId] = selected.id
  return selected.id
}

const financeCategoriesList = async (): Promise<PaginatedResponse<Category>> => {
  const budgetFileId = await resolveDefaultBudgetFileId()
  const response = await get<PaginatedResponse<FinanceCategory> | FinanceCategory[]>(
    `/api/v1/finance/categories/${toQueryString({ budget_file: budgetFileId })}`,
  )

  const mapped = asPaginated<FinanceCategory>(response).results.map((item) => ({
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

  const categories = await financeCategoriesList()
  const existing = categories.results.find((item) => item.type === type)
  if (existing) return existing.id

  const created = await post<FinanceCategory>('/api/v1/finance/categories/', {
    budget_file: budgetFileId,
    name: type === 'income' ? 'Income' : 'Expense',
    kind: type,
  })
  return created.id
}

const mapFinanceTransaction = (tx: FinanceLedgerTransaction): Transaction => {
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

const financeTransactionsList = async (
  params: V1TransactionsListParams,
): Promise<PaginatedResponse<Transaction>> => {
  const budgetFileId = await resolveDefaultBudgetFileId()
  const query = toQueryString({ ...params, budget_file: budgetFileId })
  const response = await get<PaginatedResponse<FinanceLedgerTransaction> | FinanceLedgerTransaction[]>(
    `/api/v1/finance/transactions/${query}`,
  )
  const result = asPaginated<FinanceLedgerTransaction>(response)

  return {
    count: result.count,
    next: result.next,
    previous: result.previous,
    results: result.results.map(mapFinanceTransaction),
  }
}

const createOrUpdateFinanceTransaction = async (
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
    ? await put<FinanceLedgerTransaction>(`/api/v1/finance/transactions/${id}/`, body)
    : await post<FinanceLedgerTransaction>('/api/v1/finance/transactions/', body)

  return mapFinanceTransaction(tx)
}

const getOrCreateBudgetMonth = async (budgetFileId: number, year: number, month: number) => {
  const response = await get<PaginatedResponse<FinanceBudgetMonth> | FinanceBudgetMonth[]>(
    `/api/v1/finance/budget-months/${toQueryString({ budget_file: budgetFileId, year, month })}`,
  )
  const months = asPaginated<FinanceBudgetMonth>(response).results
  if (months[0]) return months[0]

  return post<FinanceBudgetMonth>('/api/v1/finance/budget-months/', {
    budget_file: budgetFileId,
    year,
    month,
    mode: 'envelope',
  })
}

const mapAssignmentToBudget = (
  assignment: FinanceEnvelopeAssignment,
  budgetMonth: FinanceBudgetMonth,
): Budget => ({
  id: assignment.id,
  user: 0,
  category: assignment.category,
  month: budgetMonth.month,
  year: budgetMonth.year,
  amount_limit: assignment.assigned_amount,
})

const financeBudgetsList = async (): Promise<PaginatedResponse<Budget>> => {
  const budgetFileId = await resolveDefaultBudgetFileId()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const monthResponse = await get<PaginatedResponse<FinanceBudgetMonth> | FinanceBudgetMonth[]>(
    `/api/v1/finance/budget-months/${toQueryString({ budget_file: budgetFileId, year, month })}`,
  )
  const budgetMonth = asPaginated<FinanceBudgetMonth>(monthResponse).results[0]
  if (!budgetMonth) {
    return { count: 0, next: null, previous: null, results: [] }
  }

  const assignmentsResponse = await get<PaginatedResponse<FinanceEnvelopeAssignment> | FinanceEnvelopeAssignment[]>(
    `/api/v1/finance/envelope-assignments/${toQueryString({ budget_month: budgetMonth.id })}`,
  )
  const assignments = asPaginated<FinanceEnvelopeAssignment>(assignmentsResponse).results
  const mapped = assignments.map((assignment) => mapAssignmentToBudget(assignment, budgetMonth))

  return {
    count: mapped.length,
    next: null,
    previous: null,
    results: mapped,
  }
}

const createOrUpdateFinanceBudget = async (payload: BudgetMutationPayload): Promise<Budget> => {
  const budgetFileId = await resolveDefaultBudgetFileId()
  const budgetMonth = await getOrCreateBudgetMonth(budgetFileId, payload.year, payload.month)

  const existingResponse = await get<PaginatedResponse<FinanceEnvelopeAssignment> | FinanceEnvelopeAssignment[]>(
    `/api/v1/finance/envelope-assignments/${toQueryString({
      budget_month: budgetMonth.id,
      category: payload.category,
    })}`,
  )
  const existing = asPaginated<FinanceEnvelopeAssignment>(existingResponse).results[0]

  const body = {
    budget_month: budgetMonth.id,
    category: payload.category,
    assigned_amount: formatAmount(payload.amount_limit),
    carryover_amount: '0.00',
    goal_type: 'none',
    priority: 100,
  }

  const assignment = existing
    ? await put<FinanceEnvelopeAssignment>(`/api/v1/finance/envelope-assignments/${existing.id}/`, body)
    : await post<FinanceEnvelopeAssignment>('/api/v1/finance/envelope-assignments/', body)

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
    async () => financeTransactionsList(params),
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
    async () => financeCategoriesList(),
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
    async () => financeBudgetsList(),
    options?.swr,
  )
}

export const useV1TransactionsCreate = () => {
  return useSWRMutation(
    '/api/v1/transactions/',
    async (_, { arg }: { arg: TransactionMutationPayload }) => createOrUpdateFinanceTransaction(arg),
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
      return createOrUpdateFinanceTransaction(arg, id)
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
      await del(`/api/v1/finance/transactions/${id}/`)
    },
  )
}

export const useV1CategoriesCreate = () => {
  return useSWRMutation(
    '/api/v1/categories/',
    async (_, { arg }: { arg: CategoryMutationPayload }) => {
      const budgetFileId = await resolveDefaultBudgetFileId()
      const created = await post<FinanceCategory>('/api/v1/finance/categories/', {
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
    async (_, { arg }: { arg: BudgetMutationPayload }) => createOrUpdateFinanceBudget(arg),
  )
}

export const v1CategoriesUpdate = async (id: string, payload: CategoryMutationPayload) => {
  const updated = await put<FinanceCategory>(`/api/v1/finance/categories/${id}/`, {
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
  return del(`/api/v1/finance/categories/${id}/`)
}

export const v1BudgetsUpdate = async (id: string, payload: BudgetMutationPayload) => {
  const budgetFileId = await resolveDefaultBudgetFileId()
  const budgetMonth = await getOrCreateBudgetMonth(budgetFileId, payload.year, payload.month)
  const assignment = await put<FinanceEnvelopeAssignment>(`/api/v1/finance/envelope-assignments/${id}/`, {
    budget_month: budgetMonth.id,
    category: payload.category,
    assigned_amount: formatAmount(payload.amount_limit),
    carryover_amount: '0.00',
    goal_type: 'none',
    priority: 100,
  })

  return mapAssignmentToBudget(assignment, budgetMonth)
}
