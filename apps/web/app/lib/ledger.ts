import type { LedgerTransaction } from '@/client/gen/pft/ledgerTransaction'
import {
  v1FinanceAccountsCreate,
  v1FinanceAccountsList,
  v1FinanceBudgetMonthsCopyPreviousCreate,
  v1FinanceBudgetMonthsCreate,
  v1FinanceBudgetMonthsList,
  v1FinanceBudgetMonthsThreeMonthAverageCreate,
  v1FinanceBudgetMonthsZeroOutCreate,
  v1FinanceBudgetMonthsSnapshotRetrieve,
  v1FinanceEnvelopeAssignmentsCreate,
  v1FinanceEnvelopeAssignmentsList,
  v1FinanceEnvelopeAssignmentsPartialUpdate,
  v1FinanceReportsRunCreate,
} from '@/client/gen/pft/v1/v1'
import { getDefaultBudgetFileId } from '@/lib/finance-client'
import { fetchAllPages } from '@/lib/paginated'
import useSWR, { useSWRConfig } from 'swr'

/**
 * Helpers for reading and writing ledger transactions natively through the
 * generated SDK. This is the replacement for the legacy-shape adapter in
 * app/client/pft: pages that use these work in ledger terms (memo, postings,
 * category legs) and stop pretending the API is flat.
 */

export type TransactionKind = 'income' | 'expense'

export interface LedgerDisplay {
  title: string
  categoryId: number | null
  categoryName: string
  payeeName: string
  /** Total across every category leg - the full amount for a split transaction, not just the first. */
  amount: number
  kind: TransactionKind
  /** More than one category leg: a split transaction (see buildSplitPostings). */
  isSplit: boolean
  categoryCount: number
}

/**
 * The category legs carry the classification: negative for income (value
 * flows out of the income category into the account), positive for spending.
 * A split transaction has more than one category leg; amount is their sum so
 * the list total matches what was actually entered, not just the first leg.
 */
export function displayFields(transaction: LedgerTransaction): LedgerDisplay {
  const categoryLegs = transaction.posting_lines.filter((line) => line.category !== null)
  const firstLeg = categoryLegs[0] ?? transaction.posting_lines[0]
  const raw = Number(firstLeg?.amount ?? 0)
  const kind: TransactionKind = raw < 0 ? 'income' : 'expense'
  const total = categoryLegs.reduce((sum, leg) => sum + Math.abs(Number(leg.amount)), 0)
  const payeeName = transaction.payee_name || ''
  return {
    // payee_name is absent (not just empty) from the API response entirely
    // when there is no payee - see LedgerTransactionSerializer.payee_name.
    title: transaction.memo || payeeName || `Transaction ${transaction.id}`,
    categoryId: firstLeg?.category ?? null,
    categoryName: firstLeg?.category_name || '',
    payeeName,
    amount: categoryLegs.length ? total : Math.abs(raw),
    kind,
    isSplit: categoryLegs.length > 1,
    categoryCount: categoryLegs.length,
  }
}

let accountCache: number | null = null

/** Resolve the default account for simple one-account entry, creating on first use. */
export async function resolveDefaultAccountId(): Promise<number> {
  if (accountCache) return accountCache
  const budgetFileId = await getDefaultBudgetFileId()
  const accounts = await fetchAllPages((params) => v1FinanceAccountsList(params))
  let account = accounts.find((item) => item.budget_file === budgetFileId && !item.is_archived)
  if (!account) {
    account = await v1FinanceAccountsCreate({
      budget_file: budgetFileId,
      name: 'Cash',
      type: 'checking',
      opening_balance: '0.00',
    })
  }
  accountCache = account.id
  return account.id
}

export interface SplitLeg {
  categoryId: number
  amount: string | number
}

/**
 * Build a balanced posting set: one account leg (the sum of every split) plus
 * one category leg per split. A plain, non-split entry is just the N=1 case -
 * see the backend's LedgerTransactionSerializer._validate_postings, which
 * only requires two-or-more balanced postings and has never actually
 * enforced exactly two.
 */
export function buildSplitPostings(
  accountId: number,
  splits: SplitLeg[],
  kind: TransactionKind,
) {
  const categoryLegs = splits.map((split, index) => {
    const magnitude = Math.abs(Number(split.amount || 0)).toFixed(2)
    const categoryAmount = kind === 'income' ? `-${magnitude}` : magnitude
    return { category: split.categoryId, amount: categoryAmount, sort_order: index + 1 }
  })
  const totalMagnitude = splits
    .reduce((sum, split) => sum + Math.abs(Number(split.amount || 0)), 0)
    .toFixed(2)
  const accountAmount = kind === 'income' ? totalMagnitude : `-${totalMagnitude}`
  return [{ account: accountId, amount: accountAmount, sort_order: 0 }, ...categoryLegs]
}

/** The common single-category case: a convenience wrapper over buildSplitPostings. */
export function buildPostings(
  accountId: number,
  categoryId: number,
  amount: string | number,
  kind: TransactionKind,
) {
  return buildSplitPostings(accountId, [{ categoryId, amount }], kind)
}

/**
 * Invalidate every cached transaction list - both the generated SDK's real
 * finance keys and, during the migration, the adapter's synthetic legacy keys
 * still used by the dashboard and budget pages.
 */
export function useInvalidateLedger() {
  const { mutate } = useSWRConfig()
  return () =>
    mutate(
      (key) => {
        const url = Array.isArray(key) ? key[0] : key
        if (typeof url !== 'string') return false
        // Transaction lists, plus every aggregate derived from them.
        return (
          url.includes('/transactions/') ||
          url.startsWith('report/') ||
          url === 'envelope-snapshot'
        )
      },
      undefined,
      { revalidate: true },
    )
}

// ---- Server-side aggregates for the dashboard ------------------------------

export interface CashFlowResult {
  income: string
  expenses: string
  net: string
}

export interface MonthlyFlowRow {
  year: number
  month: number
  income: string
  expenses: string
  net: string
}

async function runReport<T>(payload: Record<string, unknown>): Promise<T> {
  const budgetFileId = await getDefaultBudgetFileId()
  return (await v1FinanceReportsRunCreate({
    budget_file: budgetFileId,
    ...payload,
  } as never)) as T
}

/**
 * Range totals computed by the server over the whole ledger. Replaces summing
 * a transaction list client-side, which - once the list endpoint became
 * paginated - silently summed only the first page.
 */
export function useCashFlow(startDate?: string, endDate?: string, enabled = true) {
  return useSWR(
    enabled && startDate && endDate ? ['report/cash_flow', startDate, endDate] : null,
    () =>
      runReport<CashFlowResult>({
        report_type: 'cash_flow',
        start_date: startDate,
        end_date: endDate,
      }),
  )
}

/** Income and expenses per calendar month, for the overview chart. */
export function useMonthlyCashFlow(startDate?: string, endDate?: string) {
  return useSWR(
    startDate && endDate ? ['report/monthly_cash_flow', startDate, endDate] : null,
    () =>
      runReport<{ rows: MonthlyFlowRow[] }>({
        report_type: 'monthly_cash_flow',
        start_date: startDate,
        end_date: endDate,
      }),
  )
}

export interface NetWorthSeriesPoint {
  date: string
  total: string
  missing_rate: boolean
}

/**
 * Net worth at each month-end boundary. Unlike useCashFlow/useMonthlyCashFlow,
 * this is safe to call with no dates at all: the backend defaults to the
 * trailing 12 months server-side (see compute_net_worth_series), so the hook
 * is never gated on start/end both being present.
 */
export function useNetWorthSeries(startDate?: string, endDate?: string) {
  return useSWR(['report/net_worth_series', startDate, endDate], () =>
    runReport<{ start_date: string; end_date: string; points: NetWorthSeriesPoint[] }>({
      report_type: 'net_worth_series',
      start_date: startDate,
      end_date: endDate,
    }),
  )
}

export interface SankeyNode {
  name: string
}

export interface SankeyLink {
  source: number
  target: number
  value: string
}

/** Top income categories -> one hub -> top expense categories, with a
 * "Savings"/"From savings" node absorbing the surplus/deficit so the hub
 * always balances (see compute_cash_flow_sankey). No FX conversion, matching
 * useCashFlow/compute_spending_trends' own precedent. */
export function useCashFlowSankey(startDate?: string, endDate?: string, topN = 8) {
  return useSWR(
    startDate && endDate ? ['report/cash_flow_sankey', startDate, endDate, topN] : null,
    () =>
      runReport<{ nodes: SankeyNode[]; links: SankeyLink[] }>({
        report_type: 'cash_flow_sankey',
        start_date: startDate,
        end_date: endDate,
        top_n: topN,
      }),
  )
}

export interface DetectedSubscription {
  payee_id: number
  payee: string
  cadence: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'
  amount: string
  monthly_equivalent: string
  occurrences: number
  last_charge_date: string
  confidence: number
}

/**
 * Recurring charges detected from transaction history (regular payee +
 * interval + amount), independent of any user-declared ScheduledTransaction
 * (see compute_subscriptions). Looks at the whole ledger, not a date range,
 * so - like useNetWorthSeries - this is safe to call with no arguments.
 */
export function useSubscriptions() {
  return useSWR(['report/subscriptions'], () =>
    runReport<{ subscriptions: DetectedSubscription[]; total_monthly_equivalent: string }>({
      report_type: 'subscriptions',
    }),
  )
}

export type DebtPayoffStrategy = 'snowball' | 'avalanche'

export interface DebtPayoffScheduleMonth {
  month: number
  total_balance: string
}

export interface DebtPayoffOrderRow {
  account_id: number
  account: string
  payoff_month: number | null
  interest_paid: string
}

export interface DebtPayoffExcluded {
  account_id: number
  account: string
  reason: 'missing_interest_rate_or_minimum_payment' | 'missing_fx_rate'
}

export interface DebtPayoffProjection {
  strategy: DebtPayoffStrategy
  extra_payment: string
  currency_code: string
  /** Null means minimum payments alone never clear the debt within the
   * simulation's 50-year cap - a real answer, not a missing one. */
  months_to_debt_free: number | null
  total_interest_paid: string
  payoff_order: DebtPayoffOrderRow[]
  schedule: DebtPayoffScheduleMonth[]
  excluded: DebtPayoffExcluded[]
}

/** A month-by-month snowball/avalanche projection across every credit/
 * liability account with a balance, interest_rate and minimum_payment all
 * set (see compute_debt_payoff_projection). Safe to call with no history -
 * the whole ledger's current debt accounts are read fresh each time. */
export function useDebtPayoff(strategy: DebtPayoffStrategy, extraPayment: string) {
  return useSWR(['report/debt_payoff', strategy, extraPayment], () =>
    runReport<DebtPayoffProjection>({
      report_type: 'debt_payoff',
      strategy,
      extra_payment: extraPayment || '0',
    }),
  )
}

export interface SpendingTrendRow {
  year: number
  month: number
  category_id: number
  category: string
  amount: string
}

/**
 * Expense totals per (month, category) - the source for the insights page's
 * month-over-month category comparison panel. Note the request report_type is
 * "spending" (matches SavedReport.TYPE_SPENDING); "spending_trends" only
 * appears in the response body's own internal "type" field.
 */
export function useSpendingTrends(startDate?: string, endDate?: string) {
  return useSWR(
    startDate && endDate ? ['report/spending', startDate, endDate] : null,
    () =>
      runReport<{ rows: SpendingTrendRow[] }>({
        report_type: 'spending',
        start_date: startDate,
        end_date: endDate,
      }),
  )
}

export interface EnvelopeSnapshotRow {
  category_id: number
  category: string
  assigned: string
  carryover: string
  spent: string
  remaining: string
  overspent: string
}

export interface EnvelopeSnapshot {
  assignments: EnvelopeSnapshotRow[]
}

/**
 * The current month's envelope snapshot, or null when no budget month exists
 * yet - the dashboard shows its set-a-budget empty state in that case.
 */
export function useCurrentEnvelopeSnapshot() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  return useSWR(['envelope-snapshot', year, month] as const, async () => {
    const months = await fetchAllPages((params) => v1FinanceBudgetMonthsList(params))
    const current = months.find((item) => item.year === year && item.month === month)
    if (!current) return null
    return (await v1FinanceBudgetMonthsSnapshotRetrieve(
      String(current.id),
    )) as unknown as EnvelopeSnapshot
  })
}

// ---- Envelope writes (the budgets page) ------------------------------------

/** Find or create the envelope BudgetMonth for the current calendar month. */
export async function getOrCreateCurrentBudgetMonth(): Promise<number> {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const months = await fetchAllPages((params) => v1FinanceBudgetMonthsList(params))
  const existing = months.find((item) => item.year === year && item.month === month)
  if (existing) return existing.id

  const created = await v1FinanceBudgetMonthsCreate({
    budget_file: await getDefaultBudgetFileId(),
    year,
    month,
    mode: 'envelope',
  })
  return created.id
}

/**
 * Set this month's budget for a category: create the assignment, or update it
 * when one already exists. Mirrors the upsert the legacy budgets endpoint did.
 */
export async function upsertEnvelopeAssignment(categoryId: number, amount: string) {
  const budgetMonthId = await getOrCreateCurrentBudgetMonth()
  const assignments = await fetchAllPages((params) =>
    v1FinanceEnvelopeAssignmentsList(params),
  )
  const existing = assignments.find(
    (item) => item.budget_month === budgetMonthId && item.category === categoryId,
  )
  if (existing) {
    return v1FinanceEnvelopeAssignmentsPartialUpdate(String(existing.id), {
      assigned_amount: amount,
    })
  }
  return v1FinanceEnvelopeAssignmentsCreate({
    budget_month: budgetMonthId,
    category: categoryId,
    assigned_amount: amount,
  })
}

/** The three whole-month envelope actions the API already implements. */
export async function runEnvelopeAction(
  action: 'copy-previous' | 'zero-out' | 'three-month-average',
) {
  const budgetMonthId = String(await getOrCreateCurrentBudgetMonth())
  if (action === 'copy-previous') {
    return v1FinanceBudgetMonthsCopyPreviousCreate(budgetMonthId, {} as never)
  }
  if (action === 'zero-out') {
    return v1FinanceBudgetMonthsZeroOutCreate(budgetMonthId, {} as never)
  }
  return v1FinanceBudgetMonthsThreeMonthAverageCreate(budgetMonthId, {} as never)
}
