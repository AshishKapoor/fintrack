import { httpPFTClient } from '@/client/httpPFTClient'

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

export interface FinanceAccount {
  id: number
  budget_file: number
  name: string
  type: string
  opening_balance: string
  current_balance?: string
  is_archived: boolean
}

export interface FinanceCategory {
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

export interface FinanceTransaction {
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

  const response = await get<PaginatedResponse<BudgetFile> | BudgetFile[]>('/api/v1/finance/budget-files/')
  const files = asPaginated<BudgetFile>(response).results

  let selected = files.find((item) => item.is_default) || files[0]
  if (!selected) {
    selected = await post<BudgetFile>('/api/v1/finance/budget-files/', {
      name: 'Primary Budget',
      currency_code: 'USD',
      is_default: true,
    })
  }

  budgetFileCache = selected.id
  return selected.id
}

export const listAccounts = async (budgetFileId?: number) => {
  const resolved = budgetFileId ?? (await getDefaultBudgetFileId())
  const response = await get<PaginatedResponse<FinanceAccount> | FinanceAccount[]>(
    `/api/v1/finance/accounts/${toQueryString({ budget_file: resolved })}`,
  )
  return asPaginated<FinanceAccount>(response).results
}

export const listCategories = async (budgetFileId?: number) => {
  const resolved = budgetFileId ?? (await getDefaultBudgetFileId())
  const response = await get<PaginatedResponse<FinanceCategory> | FinanceCategory[]>(
    `/api/v1/finance/categories/${toQueryString({ budget_file: resolved })}`,
  )
  return asPaginated<FinanceCategory>(response).results
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

  return post<FinanceTransaction>('/api/v1/finance/transactions/', {
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
    `/api/v1/finance/reports/${toQueryString({ budget_file: budgetFileId })}`,
  )
  let results = asPaginated<SavedReport>(response).results
  if (params?.pinned !== undefined) {
    results = results.filter((item) => item.pinned === params.pinned)
  }
  return results
}

export const runAdhocReport = async (payload: Record<string, unknown>) => {
  const budgetFileId = await getDefaultBudgetFileId()
  return post<Record<string, unknown>>('/api/v1/finance/reports/run/', {
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
  return post<SavedReport>('/api/v1/finance/reports/', {
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
  return patch<SavedReport>(`/api/v1/finance/reports/${id}/`, payload)
}

export const runSavedReport = async (id: number) => {
  return post<Record<string, unknown>>(`/api/v1/finance/reports/${id}/run/`, {})
}

export const deleteSavedReport = async (id: number) => {
  return del(`/api/v1/finance/reports/${id}/`)
}

export const listTransactionRules = async () => {
  const budgetFileId = await getDefaultBudgetFileId()
  const response = await get<PaginatedResponse<TransactionRule> | TransactionRule[]>(
    `/api/v1/finance/rules/${toQueryString({ budget_file: budgetFileId })}`,
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
  return post<TransactionRule>('/api/v1/finance/rules/', {
    budget_file: budgetFileId,
    ...payload,
  })
}

export const updateTransactionRule = async (
  id: number,
  payload: Partial<Pick<TransactionRule, 'name' | 'is_active' | 'priority' | 'conditions' | 'actions'>>,
) => {
  return patch<TransactionRule>(`/api/v1/finance/rules/${id}/`, payload)
}

export const deleteTransactionRule = async (id: number) => {
  return del(`/api/v1/finance/rules/${id}/`)
}

export const listScheduledTransactions = async () => {
  const budgetFileId = await getDefaultBudgetFileId()
  const response = await get<PaginatedResponse<ScheduledTransaction> | ScheduledTransaction[]>(
    `/api/v1/finance/scheduled-transactions/${toQueryString({ budget_file: budgetFileId })}`,
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
  return post<ScheduledTransaction>('/api/v1/finance/scheduled-transactions/', {
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
  return patch<ScheduledTransaction>(`/api/v1/finance/scheduled-transactions/${id}/`, payload)
}

export const deleteScheduledTransaction = async (id: number) => {
  return del(`/api/v1/finance/scheduled-transactions/${id}/`)
}

export const runDueScheduledTransactions = async (runDate?: string) => {
  return post<{ created_transaction_ids: number[] }>('/api/v1/finance/scheduled-transactions/run-due/', {
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
  return put<ScheduledTransaction>(`/api/v1/finance/scheduled-transactions/${id}/`, payload)
}
