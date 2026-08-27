import type { EncryptedBackupBundle } from '@/client/gen/pft/encryptedBackupBundle'
import {
  v1FinanceAccountsCreate,
  v1FinanceAccountsList,
  v1FinanceBackupsCreate,
  v1FinanceBackupsList,
  v1FinanceBudgetMonthsList,
  v1FinanceCategoriesList,
  v1FinanceCategoryGroupsCreate,
  v1FinanceCategoryGroupsList,
  v1FinanceCategoriesCreate,
  v1FinanceEnvelopeAssignmentsList,
  v1FinancePayeesCreate,
  v1FinancePayeesList,
  v1FinanceTransactionsCreate,
  v1FinanceTransactionsList,
} from '@/client/gen/pft/v1/v1'
import { decryptJson, encryptJson, type EncryptedPayload } from '@/lib/crypto'
import { fetchAllPages } from '@/lib/paginated'
import { getDefaultBudgetFileId } from '@/lib/finance-client'
import { getOrCreateCurrentBudgetMonth, upsertEnvelopeAssignment } from '@/lib/ledger'

/**
 * Encrypted backup and restore, entirely client-side.
 *
 * The bundle is the full ledger serialised to JSON and AES-GCM encrypted with
 * a passphrase the server never sees; /api/v1/finance/backups/ stores opaque
 * salt/nonce/ciphertext. Restore decrypts locally and replays the data through
 * the same public API everything else uses, remapping ids as it goes and using
 * match_key to make re-runs idempotent for transactions.
 */

export const BACKUP_FORMAT_VERSION = 1

export interface BackupArchive {
  version: number
  created_at: string
  category_groups: { id: number; name: string; sort_order?: number }[]
  categories: {
    id: number
    name: string
    kind?: string
    group?: number | null
    is_archived?: boolean
  }[]
  accounts: {
    id: number
    name: string
    type?: string
    opening_balance?: string
    is_archived?: boolean
  }[]
  payees: { id: number; name: string }[]
  transactions: {
    id: number
    transaction_date: string
    memo?: string
    payee?: number | null
    cleared?: boolean
    postings: { account?: number | null; category?: number | null; amount: string }[]
  }[]
  budgets: { year: number; month: number; category: number; assigned_amount: string }[]
}



/** Serialise the whole ledger into a plain archive object. */
export async function collectArchive(): Promise<BackupArchive> {
  // Every one of these walks `next` to the end. A backup that quietly stopped
  // at the first page would be the worst possible place for pagination to go
  // unnoticed: it restores cleanly and is simply missing most of the ledger.
  const [groups, categories, accounts, payees, transactions, months, assignments] =
    await Promise.all([
      fetchAllPages((params) => v1FinanceCategoryGroupsList(params)),
      fetchAllPages((params) => v1FinanceCategoriesList(params)),
      fetchAllPages((params) => v1FinanceAccountsList(params)),
      fetchAllPages((params) => v1FinancePayeesList(params)),
      fetchAllPages((params) => v1FinanceTransactionsList(params)),
      fetchAllPages((params) => v1FinanceBudgetMonthsList(params)),
      fetchAllPages((params) => v1FinanceEnvelopeAssignmentsList(params)),
    ])

  const monthById = new Map(months.map((m) => [m.id, m]))

  return {
    version: BACKUP_FORMAT_VERSION,
    created_at: new Date().toISOString(),
    category_groups: groups.map((g) => ({ id: g.id, name: g.name, sort_order: g.sort_order })),
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      kind: c.kind,
      group: c.group,
      is_archived: c.is_archived,
    })),
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      opening_balance: a.opening_balance,
      is_archived: a.is_archived,
    })),
    payees: payees.map((p) => ({ id: p.id, name: p.name })),
    transactions: transactions.map((t) => ({
      id: t.id,
      transaction_date: t.transaction_date,
      memo: t.memo,
      payee: t.payee,
      cleared: t.cleared,
      postings: t.posting_lines.map((line) => ({
        account: line.account,
        category: line.category,
        amount: line.amount,
      })),
    })),
    budgets: assignments.flatMap((assignment) => {
      const month = monthById.get(assignment.budget_month)
      if (!month) return []
      return [
        {
          year: month.year,
          month: month.month,
          category: assignment.category,
          assigned_amount: assignment.assigned_amount ?? '0.00',
        },
      ]
    }),
  }
}

/** Encrypt the current ledger and store it as a bundle. */
export async function createBackup(passphrase: string): Promise<EncryptedBackupBundle> {
  const archive = await collectArchive()
  const encrypted = await encryptJson(archive, passphrase)
  return v1FinanceBackupsCreate({
    budget_file: await getDefaultBudgetFileId(),
    ...encrypted,
    metadata: {
      version: BACKUP_FORMAT_VERSION,
      transactions: archive.transactions.length,
      created_at: archive.created_at,
    },
  } as never)
}

export async function listBackups(): Promise<EncryptedBackupBundle[]> {
  return fetchAllPages((params) => v1FinanceBackupsList(params))
}

export async function decryptBackup(
  bundle: EncryptedBackupBundle,
  passphrase: string,
): Promise<BackupArchive> {
  const payload: EncryptedPayload = {
    salt: bundle.salt,
    nonce: bundle.nonce,
    ciphertext: bundle.ciphertext,
  }
  return decryptJson<BackupArchive>(payload, passphrase)
}

export interface RestoreResult {
  transactions_created: number
  transactions_skipped: number
  budgets_restored: number
}

/**
 * Replay an archive into the current budget file.
 *
 * Entities are matched by name and created when missing; transactions carry
 * match_key "backup-<original id>" so restoring twice never duplicates. The
 * current month's budgets are restored through the same upsert the budgets
 * page uses; other months' budgets are skipped (their BudgetMonths may not
 * exist and silently creating history is surprising).
 */
export async function restoreArchive(archive: BackupArchive): Promise<RestoreResult> {
  if (archive.version !== BACKUP_FORMAT_VERSION) {
    throw new Error(`Unsupported backup version ${archive.version}`)
  }
  const budgetFileId = await getDefaultBudgetFileId()

  // Category groups by name.
  const groupIdMap = new Map<number, number>()
  const existingGroups = await fetchAllPages((params) => v1FinanceCategoryGroupsList(params))
  for (const group of archive.category_groups) {
    const found = existingGroups.find((g) => g.name === group.name)
    if (found) {
      groupIdMap.set(group.id, found.id)
    } else {
      const created = await v1FinanceCategoryGroupsCreate({
        budget_file: budgetFileId,
        name: group.name,
        sort_order: group.sort_order,
      })
      groupIdMap.set(group.id, created.id)
    }
  }

  // Categories by name.
  const categoryIdMap = new Map<number, number>()
  const existingCategories = await fetchAllPages((params) => v1FinanceCategoriesList(params))
  for (const category of archive.categories) {
    const found = existingCategories.find((c) => c.name === category.name)
    if (found) {
      categoryIdMap.set(category.id, found.id)
    } else {
      const created = await v1FinanceCategoriesCreate({
        budget_file: budgetFileId,
        name: category.name,
        kind: (category.kind ?? 'expense') as never,
        group: category.group != null ? groupIdMap.get(category.group) : undefined,
      } as never)
      categoryIdMap.set(category.id, created.id)
    }
  }

  // Accounts by name.
  const accountIdMap = new Map<number, number>()
  const existingAccounts = await fetchAllPages((params) => v1FinanceAccountsList(params))
  for (const account of archive.accounts) {
    const found = existingAccounts.find((a) => a.name === account.name)
    if (found) {
      accountIdMap.set(account.id, found.id)
    } else {
      const created = await v1FinanceAccountsCreate({
        budget_file: budgetFileId,
        name: account.name,
        type: (account.type ?? 'checking') as never,
        opening_balance: account.opening_balance ?? '0.00',
      } as never)
      accountIdMap.set(account.id, created.id)
    }
  }

  // Payees by name.
  const payeeIdMap = new Map<number, number>()
  const existingPayees = await fetchAllPages((params) => v1FinancePayeesList(params))
  for (const payee of archive.payees) {
    const found = existingPayees.find((p) => p.name === payee.name)
    if (found) {
      payeeIdMap.set(payee.id, found.id)
    } else {
      const created = await v1FinancePayeesCreate({ budget_file: budgetFileId, name: payee.name })
      payeeIdMap.set(payee.id, created.id)
    }
  }

  // Transactions, deduplicated by match_key across restore runs.
  const existingKeys = new Set(
    (await fetchAllPages((params) => v1FinanceTransactionsList(params)))
      .map((t) => t.match_key)
      .filter(Boolean),
  )
  let created = 0
  let skipped = 0
  for (const transaction of archive.transactions) {
    const matchKey = `backup-${transaction.id}`
    if (existingKeys.has(matchKey)) {
      skipped += 1
      continue
    }
    await v1FinanceTransactionsCreate({
      budget_file: budgetFileId,
      transaction_date: transaction.transaction_date,
      memo: transaction.memo ?? '',
      payee: transaction.payee != null ? payeeIdMap.get(transaction.payee) : undefined,
      cleared: transaction.cleared ?? false,
      match_key: matchKey,
      postings: transaction.postings.map((posting, index) => ({
        account: posting.account != null ? accountIdMap.get(posting.account) : undefined,
        category: posting.category != null ? categoryIdMap.get(posting.category) : undefined,
        amount: posting.amount,
        sort_order: index,
      })),
    } as never)
    created += 1
  }

  // Current month's budgets only.
  const now = new Date()
  await getOrCreateCurrentBudgetMonth()
  let budgetsRestored = 0
  for (const budget of archive.budgets) {
    if (budget.year !== now.getFullYear() || budget.month !== now.getMonth() + 1) continue
    const categoryId = categoryIdMap.get(budget.category)
    if (!categoryId) continue
    await upsertEnvelopeAssignment(categoryId, budget.assigned_amount)
    budgetsRestored += 1
  }

  return {
    transactions_created: created,
    transactions_skipped: skipped,
    budgets_restored: budgetsRestored,
  }
}
