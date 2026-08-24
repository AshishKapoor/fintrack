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
  const accounts = await v1FinanceAccountsList()
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
    const months = await v1FinanceBudgetMonthsList()
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
  const months = await v1FinanceBudgetMonthsList()
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
  const assignments = await v1FinanceEnvelopeAssignmentsList()
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
