import { httpPFTClient } from '@/client/httpPFTClient'

export const V2_ENABLED =
  String(import.meta.env.VITE_FINANCE_V2 || 'false').toLowerCase() === 'true'

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface BudgetFile {
  id: number
  name: string
  currency_code: string
  is_default: boolean
}

export interface V2Account {
  id: number
  budget_file: number
  name: string
  type: string
  opening_balance: string
  current_balance?: string
  is_archived: boolean
}

export interface V2Category {
  id: number
  budget_file: number
  name: string
  kind: 'income' | 'expense'
  is_archived: boolean
}

export interface SavedReport {
  id: number
  budget_file: number
  name: string
  report_type: 'net_worth' | 'cash_flow' | 'spending' | 'custom'
  definition: Record<string, unknown>
  pinned: boolean
  created_at: string
  updated_at: string
}

export interface TransactionRule {
  id: number
  budget_file: number
  name: string
  is_active: boolean
  priority: number
  conditions: Record<string, unknown>
  actions: Record<string, unknown>
}

export interface ScheduledTransaction {
  id: number
  budget_file: number
  name: string
  is_active: boolean
  start_date: string
  next_run_date: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  interval: number
  transaction_template: Record<string, unknown>
  last_run_at?: string | null
}

export interface V2Transaction {
  id: number
  budget_file: number
  transaction_date: string
  memo: string
  source_type: string
}

const toQueryString = (params: Record<string, string | number | undefined | null>) => {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
  })
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

const get = async <T>(url: string): Promise<T> =>
  httpPFTClient<T>({
    url,
    method: 'GET',
  })

const post = async <T>(url: string, data: unknown): Promise<T> =>
  httpPFTClient<T>({
    url,
    method: 'POST',
    data,
  })

const put = async <T>(url: string, data: unknown): Promise<T> =>
  httpPFTClient<T>({
    url,
    method: 'PUT',
    data,
  })

const patch = async <T>(url: string, data: unknown): Promise<T> =>
  httpPFTClient<T>({
    url,
    method: 'PATCH',
    data,
  })

const del = async (url: string): Promise<void> =>
  httpPFTClient<void>({
    url,
    method: 'DELETE',
  })

let budgetFileCache: number | null = null

export const getDefaultBudgetFileId = async () => {
  if (budgetFileCache) return budgetFileCache

  const response = await get<PaginatedResponse<BudgetFile> | BudgetFile[]>('/api/v2/budget-files/')
  const files = asPaginated<BudgetFile>(response).results

  let selected = files.find((item) => item.is_default) || files[0]
  if (!selected) {
    selected = await post<BudgetFile>('/api/v2/budget-files/', {
      name: 'Primary Budget',
      currency_code: 'USD',
      is_default: true,
    })
  }

  budgetFileCache = selected.id
  return selected.id
}

export const listV2Accounts = async (budgetFileId?: number) => {
  const resolved = budgetFileId ?? (await getDefaultBudgetFileId())
  const response = await get<PaginatedResponse<V2Account> | V2Account[]>(
    `/api/v2/accounts/${toQueryString({ budget_file: resolved })}`,
  )
  return asPaginated<V2Account>(response).results
}

export const listV2Categories = async (budgetFileId?: number) => {
  const resolved = budgetFileId ?? (await getDefaultBudgetFileId())
  const response = await get<PaginatedResponse<V2Category> | V2Category[]>(
    `/api/v2/categories/${toQueryString({ budget_file: resolved })}`,
  )
  return asPaginated<V2Category>(response).results
}

export const createTransferTransaction = async (payload: {
  fromAccountId: number
  toAccountId: number
  amount: number
  transactionDate: string
  memo?: string
}) => {
  const budgetFileId = await getDefaultBudgetFileId()
  const amount = Math.abs(payload.amount)
  const transferGroup =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : undefined

  return post<V2Transaction>('/api/v2/transactions/', {
    budget_file: budgetFileId,
    transaction_date: payload.transactionDate,
    memo: payload.memo || 'Transfer',
    source_type: 'transfer',
    transfer_group: transferGroup,
    postings: [
      {
        account: payload.fromAccountId,
        category: null,
        amount: (-amount).toFixed(2),
        memo: payload.memo || 'Transfer out',
        sort_order: 0,
      },
      {
        account: payload.toAccountId,
        category: null,
        amount: amount.toFixed(2),
        memo: payload.memo || 'Transfer in',
        sort_order: 1,
      },
    ],
  })
}

export const listSavedReports = async (params?: { pinned?: boolean }) => {
  const budgetFileId = await getDefaultBudgetFileId()
  const response = await get<PaginatedResponse<SavedReport> | SavedReport[]>(
    `/api/v2/reports/${toQueryString({ budget_file: budgetFileId })}`,
  )
  let results = asPaginated<SavedReport>(response).results
  if (params?.pinned !== undefined) {
    results = results.filter((item) => item.pinned === params.pinned)
  }
  return results
}

export const runAdhocReport = async (payload: Record<string, unknown>) => {
  const budgetFileId = await getDefaultBudgetFileId()
  return post<Record<string, unknown>>('/api/v2/reports/run/', {
    budget_file: budgetFileId,
    ...payload,
  })
}

export const createSavedReport = async (payload: {
  name: string
  report_type: SavedReport['report_type']
  definition: Record<string, unknown>
  pinned?: boolean
}) => {
  const budgetFileId = await getDefaultBudgetFileId()
  return post<SavedReport>('/api/v2/reports/', {
    budget_file: budgetFileId,
    name: payload.name,
    report_type: payload.report_type,
    definition: payload.definition,
    pinned: Boolean(payload.pinned),
  })
}

export const updateSavedReport = async (
  id: number,
  payload: Partial<Pick<SavedReport, 'name' | 'pinned' | 'definition' | 'report_type'>>,
) => {
  return patch<SavedReport>(`/api/v2/reports/${id}/`, payload)
}

export const runSavedReport = async (id: number) => {
  return post<Record<string, unknown>>(`/api/v2/reports/${id}/run/`, {})
}

export const deleteSavedReport = async (id: number) => {
  return del(`/api/v2/reports/${id}/`)
}

export const listTransactionRules = async () => {
  const budgetFileId = await getDefaultBudgetFileId()
  const response = await get<PaginatedResponse<TransactionRule> | TransactionRule[]>(
    `/api/v2/rules/${toQueryString({ budget_file: budgetFileId })}`,
  )
  return asPaginated<TransactionRule>(response).results
}

export const createTransactionRule = async (payload: {
  name: string
  is_active: boolean
  priority: number
  conditions: Record<string, unknown>
  actions: Record<string, unknown>
}) => {
  const budgetFileId = await getDefaultBudgetFileId()
  return post<TransactionRule>('/api/v2/rules/', {
    budget_file: budgetFileId,
    ...payload,
  })
}

export const updateTransactionRule = async (
  id: number,
  payload: Partial<Pick<TransactionRule, 'name' | 'is_active' | 'priority' | 'conditions' | 'actions'>>,
) => {
  return patch<TransactionRule>(`/api/v2/rules/${id}/`, payload)
}

export const deleteTransactionRule = async (id: number) => {
  return del(`/api/v2/rules/${id}/`)
}

export const listScheduledTransactions = async () => {
  const budgetFileId = await getDefaultBudgetFileId()
  const response = await get<PaginatedResponse<ScheduledTransaction> | ScheduledTransaction[]>(
    `/api/v2/scheduled-transactions/${toQueryString({ budget_file: budgetFileId })}`,
  )
  return asPaginated<ScheduledTransaction>(response).results
}

export const createScheduledTransaction = async (payload: {
  name: string
  is_active: boolean
  start_date: string
  next_run_date: string
  frequency: ScheduledTransaction['frequency']
  interval: number
  transaction_template: Record<string, unknown>
}) => {
  const budgetFileId = await getDefaultBudgetFileId()
  return post<ScheduledTransaction>('/api/v2/scheduled-transactions/', {
    budget_file: budgetFileId,
    ...payload,
  })
}

export const updateScheduledTransaction = async (
  id: number,
  payload: Partial<
    Pick<
      ScheduledTransaction,
      | 'name'
      | 'is_active'
      | 'start_date'
      | 'next_run_date'
      | 'frequency'
      | 'interval'
      | 'transaction_template'
    >
  >,
) => {
  return patch<ScheduledTransaction>(`/api/v2/scheduled-transactions/${id}/`, payload)
}

export const deleteScheduledTransaction = async (id: number) => {
  return del(`/api/v2/scheduled-transactions/${id}/`)
}

export const runDueScheduledTransactions = async (runDate?: string) => {
  return post<{ created_transaction_ids: number[] }>('/api/v2/scheduled-transactions/run-due/', {
    run_date: runDate,
  })
}

export const replaceScheduledTransaction = async (
  id: number,
  payload: {
    budget_file: number
    name: string
    is_active: boolean
    start_date: string
    next_run_date: string
    frequency: ScheduledTransaction['frequency']
    interval: number
    transaction_template: Record<string, unknown>
  },
) => {
  return put<ScheduledTransaction>(`/api/v2/scheduled-transactions/${id}/`, payload)
}
