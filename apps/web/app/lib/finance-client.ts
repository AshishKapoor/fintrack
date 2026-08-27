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
  /**
   * Whether THIS viewer opens this file by default. Read from the caller's own
   * Membership, not a column on the file - in a shared workspace two people
   * see different values for the same row, which is the point (it used to be
   * one flag on the file, so one member choosing a default moved everyone
   * else's). Sending it on create or update records the caller's choice.
   */
  is_default: boolean
  /** Always set: the workspace that owns the file. */
  organization: number
}

export interface FinanceAccount {
  id: number
  budget_file: number
  name: string
  type: string
  opening_balance: string
  currency_code: string
  current_balance?: string
  /** Debt payoff planning inputs (ROADMAP.md Phase 3) - null on every
   * account until set, and meaningless outside a credit/liability account. */
  interest_rate: string | null
  minimum_payment: string | null
  is_archived: boolean
}

export interface SavingsGoal {
  id: number
  budget_file: number
  account: number
  account_name?: string
  name: string
  target_amount: string
  target_date: string | null
  /** account.current_balance, read at request time - see SavingsGoalSerializer. */
  current_amount: string
  /** Not capped at 100 - a goal can be exceeded. Null if target_amount is 0. */
  progress_percent: number | null
  is_archived: boolean
}

export interface AccountBalanceRow {
  account_id: number
  name: string
  type: string
  currency_code: string
  opening_balance: string
  delta: string
  balance: string
  converted_balance: string | null
  converted_currency_code: string
}

export interface NetWorth {
  type: 'net_worth'
  as_of: string | null
  currency_code: string
  total: string
  missing_rate: boolean
  accounts: AccountBalanceRow[]
}

export interface BudgetFileBalances {
  as_of: string | null
  accounts: AccountBalanceRow[]
  net_worth: NetWorth
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

const SUPPORTED_CURRENCY_CODES = new Set([
  'INR', 'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'CAD', 'AUD', 'CHF', 'KRW', 'SGD', 'HKD',
])

const LOCALE_CURRENCY: Record<string, string> = {
  IN: 'INR', US: 'USD', GB: 'GBP', JP: 'JPY', CN: 'CNY', CA: 'CAD',
  AU: 'AUD', CH: 'CHF', KR: 'KRW', SG: 'SGD', HK: 'HKD',
}

function guessCurrencyCode(): string {
  const region = new Intl.Locale(navigator.language).maximize().region
  const code = region ? LOCALE_CURRENCY[region] : undefined
  return code && SUPPORTED_CURRENCY_CODES.has(code) ? code : 'USD'
}

let budgetFileCache: BudgetFile | null = null

/** Called when the active organization changes: the cached file is stale. */
export function clearBudgetFileCache() {
  budgetFileCache = null
}

/** Resolve the caller's default budget file, creating one if none exists. */
export const getDefaultBudgetFile = async (): Promise<BudgetFile> => {
  if (budgetFileCache) return budgetFileCache

  const response = await get<PaginatedResponse<BudgetFile> | BudgetFile[]>('/api/v1/finance/budget-files/')
  let files = asPaginated<BudgetFile>(response).results

  // Membership scoping returns files from every organization the user is in;
  // the UI works within the active one.
  const { activeOrganizationId } = await import('@/context/organization-context')
  const orgId = activeOrganizationId()
  if (orgId != null) {
    // Scope strictly: an empty result means the workspace has no budget file
    // yet, and the creation path below must create it THERE - falling back to
    // the full list would silently write into the personal workspace.
    files = files.filter((item) => item.organization === orgId)
  }

  let selected = files.find((item) => item.is_default) || files[0]
  if (!selected) {
    selected = await post<BudgetFile>('/api/v1/finance/budget-files/', {
      name: 'Primary Budget',
      // Follow the browser's locale rather than assuming USD, which is what
      // made an INR-displaying UI store USD server-side.
      currency_code: guessCurrencyCode(),
      is_default: true,
      // In a shared workspace the file must join that workspace, not fall
      // back to the creator's personal org.
      ...(orgId != null ? { organization: orgId } : {}),
    })
  }

  budgetFileCache = selected
  return selected
}

export const getDefaultBudgetFileId = async () => (await getDefaultBudgetFile()).id

/** Persist the display currency on the budget file so it follows the account. */
export const updateBudgetFileCurrency = async (currencyCode: string) => {
  const budgetFile = await getDefaultBudgetFile()
  if (budgetFile.currency_code === currencyCode) return budgetFile

  const updated = await patch<BudgetFile>(`/api/v1/finance/budget-files/${budgetFile.id}/`, {
    currency_code: currencyCode,
  })
  budgetFileCache = updated
  return updated
}

export const listAccounts = async (budgetFileId?: number) => {
  const resolved = budgetFileId ?? (await getDefaultBudgetFileId())
  const response = await get<PaginatedResponse<FinanceAccount> | FinanceAccount[]>(
    `/api/v1/finance/accounts/${toQueryString({ budget_file: resolved })}`,
  )
  return asPaginated<FinanceAccount>(response).results
}

export const createAccount = async (payload: {
  name: string
  type: string
  opening_balance: string
  currency_code?: string
  interest_rate?: string | null
  minimum_payment?: string | null
}) => {
  const budgetFileId = await getDefaultBudgetFileId()
  return post<FinanceAccount>('/api/v1/finance/accounts/', {
    budget_file: budgetFileId,
    ...payload,
  })
}

export const updateAccount = async (
  id: number,
  payload: Partial<
    Pick<
      FinanceAccount,
      'name' | 'type' | 'opening_balance' | 'currency_code' | 'interest_rate' | 'minimum_payment' | 'is_archived'
    >
  >,
) => {
  return patch<FinanceAccount>(`/api/v1/finance/accounts/${id}/`, payload)
}

export const deleteAccount = async (id: number) => {
  return del(`/api/v1/finance/accounts/${id}/`)
}

export interface AICategorizationSettings {
  id: number
  budget_file: number
  is_enabled: boolean
  provider: 'openai_compatible' | 'ollama'
  base_url: string
  model_name: string
  /** Whether a key is stored - the key itself is never returned, see
   * AICategorizationSettingsSerializer. */
  has_api_key: boolean
}

/** get_or_create on the server - a fresh budget file gets sensible (off)
 * defaults instead of a 404. See AICategorizationSettingsView. */
export const getAICategorizationSettings = async (budgetFileId?: number) => {
  const resolved = budgetFileId ?? (await getDefaultBudgetFileId())
  return get<AICategorizationSettings>(
    `/api/v1/finance/ai-categorization/settings/${toQueryString({ budget_file: resolved })}`,
  )
}

export const updateAICategorizationSettings = async (
  payload: Partial<Pick<AICategorizationSettings, 'is_enabled' | 'provider' | 'base_url' | 'model_name'>>,
  budgetFileId?: number,
) => {
  const resolved = budgetFileId ?? (await getDefaultBudgetFileId())
  return patch<AICategorizationSettings>(
    `/api/v1/finance/ai-categorization/settings/${toQueryString({ budget_file: resolved })}`,
    payload,
  )
}

/** Encrypts and stores (or, given an empty string, clears) the API key.
 * Never returns it - see AICategorizationApiKeyView. */
export const setAICategorizationApiKey = async (apiKey: string, budgetFileId?: number) => {
  const resolved = budgetFileId ?? (await getDefaultBudgetFileId())
  return post<AICategorizationSettings>('/api/v1/finance/ai-categorization/set-api-key/', {
    budget_file: resolved,
    api_key: apiKey,
  })
}

export const testAICategorizationConnection = async (budgetFileId?: number) => {
  const resolved = budgetFileId ?? (await getDefaultBudgetFileId())
  return post<{ ok: boolean; detail: string }>('/api/v1/finance/ai-categorization/test/', {
    budget_file: resolved,
  })
}

export const listSavingsGoals = async (budgetFileId?: number) => {
  const resolved = budgetFileId ?? (await getDefaultBudgetFileId())
  const response = await get<PaginatedResponse<SavingsGoal> | SavingsGoal[]>(
    `/api/v1/finance/savings-goals/${toQueryString({ budget_file: resolved })}`,
  )
  return asPaginated<SavingsGoal>(response).results
}

export const createSavingsGoal = async (payload: {
  account: number
  name: string
  target_amount: string
  target_date?: string | null
}) => {
  const budgetFileId = await getDefaultBudgetFileId()
  return post<SavingsGoal>('/api/v1/finance/savings-goals/', {
    budget_file: budgetFileId,
    ...payload,
  })
}

export const updateSavingsGoal = async (
  id: number,
  payload: Partial<Pick<SavingsGoal, 'account' | 'name' | 'target_amount' | 'target_date' | 'is_archived'>>,
) => {
  return patch<SavingsGoal>(`/api/v1/finance/savings-goals/${id}/`, payload)
}

export const deleteSavingsGoal = async (id: number) => {
  return del(`/api/v1/finance/savings-goals/${id}/`)
}

/** Native + home-currency-converted balances for every account - powers the
 * Accounts page. See finance_services.account_balances/compute_net_worth. */
export const getBudgetFileBalances = async (asOf?: string) => {
  const budgetFileId = await getDefaultBudgetFileId()
  return get<BudgetFileBalances>(
    `/api/v1/finance/budget-files/${budgetFileId}/balances/${toQueryString({ as_of: asOf })}`,
  )
}

/** Fetch today's ECB reference rates now, rather than waiting for tomorrow's
 * beat tick - surfaced wherever a converted balance is missing a rate. */
export const syncFxRatesNow = async () => post<{ stored: number }>('/api/v1/finance/fx-rates/sync/', {})

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
