import type { LedgerTransaction } from '@/client/gen/pft/ledgerTransaction'
import { v1FinanceAccountsCreate, v1FinanceAccountsList } from '@/client/gen/pft/v1/v1'
import { getDefaultBudgetFileId } from '@/lib/finance-client'
import { useSWRConfig } from 'swr'

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
  amount: number
  kind: TransactionKind
}

/**
 * The category leg carries the classification: negative for income (value
 * flows out of the income category into the account), positive for spending.
 */
export function displayFields(transaction: LedgerTransaction): LedgerDisplay {
  const categoryLeg = transaction.posting_lines.find((line) => line.category !== null)
  const raw = Number(categoryLeg?.amount ?? transaction.posting_lines[0]?.amount ?? 0)
  const kind: TransactionKind = raw < 0 ? 'income' : 'expense'
  return {
    title: transaction.memo || `Transaction ${transaction.id}`,
    categoryId: categoryLeg?.category ?? null,
    categoryName: categoryLeg?.category_name || '',
    amount: Math.abs(raw),
    kind,
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

/**
 * Build the balanced posting pair for a simple categorised entry: money moves
 * between the account and the category, summing to zero by construction.
 */
export function buildPostings(
  accountId: number,
  categoryId: number,
  amount: string | number,
  kind: TransactionKind,
) {
  const magnitude = Math.abs(Number(amount || 0)).toFixed(2)
  const accountAmount = kind === 'income' ? magnitude : `-${magnitude}`
  const categoryAmount = kind === 'income' ? `-${magnitude}` : magnitude
  return [
    { account: accountId, amount: accountAmount, sort_order: 0 },
    { category: categoryId, amount: categoryAmount, sort_order: 1 },
  ]
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
        return typeof url === 'string' && url.includes('/transactions/')
      },
      undefined,
      { revalidate: true },
    )
}
