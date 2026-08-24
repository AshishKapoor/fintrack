import { httpPFTClient } from '@/client/httpPFTClient'
import { getDefaultBudgetFileId } from '@/lib/finance-client'

export type BankSyncProviderKey = 'gocardless' | 'simplefin'

export interface BankSyncProviderInfo {
  key: BankSyncProviderKey
  label: string
  configured: boolean
}

export interface BankSyncInstitution {
  id: string
  name: string
  logo: string
}

export interface SyncConnectionAccount {
  id: number
  connection: number
  account: number | null
  account_name?: string
  external_account_id: string
  display_name: string
  currency_code: string
  iban: string
  last_synced_at: string | null
}

export interface SyncConnection {
  id: number
  budget_file: number
  provider: BankSyncProviderKey
  provider_label: string
  status: 'pending' | 'active' | 'error' | 'revoked'
  institution_name: string
  last_synced_at: string | null
  last_error: string
  linked_accounts: SyncConnectionAccount[]
  created_at: string
  updated_at: string
}

const get = async <T>(url: string): Promise<T> => httpPFTClient<T>({ url, method: 'GET' })
const post = async <T>(url: string, data?: unknown): Promise<T> =>
  httpPFTClient<T>({ url, method: 'POST', data: data ?? {} })
const del = async (url: string): Promise<void> => httpPFTClient<void>({ url, method: 'DELETE' })

export const listBankSyncProviders = async () =>
  get<BankSyncProviderInfo[]>('/api/v1/finance/sync-connections/providers/')

export const listBankInstitutions = async (provider: BankSyncProviderKey, country: string) =>
  get<BankSyncInstitution[]>(
    `/api/v1/finance/sync-connections/institutions/?provider=${provider}&country=${country}`,
  )

export const listSyncConnections = async (budgetFileId?: number) => {
  const resolved = budgetFileId ?? (await getDefaultBudgetFileId())
  const response = await get<SyncConnection[] | { results: SyncConnection[] }>(
    `/api/v1/finance/sync-connections/?budget_file=${resolved}`,
  )
  return Array.isArray(response) ? response : response.results
}

export const createSyncConnection = async (provider: BankSyncProviderKey) => {
  const budgetFileId = await getDefaultBudgetFileId()
  return post<SyncConnection>('/api/v1/finance/sync-connections/', {
    budget_file: budgetFileId,
    provider,
  })
}

/** Kicks off linking. GoCardless returns `{redirect_url}` - the caller sends
 * the browser there. SimpleFIN activates immediately and returns `{status}`. */
export const startBankLink = async (
  connectionId: number,
  params: { institution_id: string } | { setup_token: string },
) => post<{ redirect_url?: string; status?: string }>(
  `/api/v1/finance/sync-connections/${connectionId}/link/`,
  params,
)

/** Finishes linking and discovers accounts as unmapped linked_accounts. Safe
 * to call for every provider, including ones (SimpleFIN) whose start_link
 * already finished - see the backend action's own docstring. */
export const finishBankLinkAndDiscoverAccounts = async (connectionId: number) =>
  post<SyncConnection>(`/api/v1/finance/sync-connections/${connectionId}/callback/`)

export const syncBankConnection = async (connectionId: number) =>
  post<SyncConnection>(`/api/v1/finance/sync-connections/${connectionId}/sync/`)

export const disconnectBankConnection = async (connectionId: number) =>
  post<SyncConnection>(`/api/v1/finance/sync-connections/${connectionId}/disconnect/`)

export const deleteBankConnection = async (connectionId: number) =>
  del(`/api/v1/finance/sync-connections/${connectionId}/`)

export const mapSyncConnectionAccount = async (
  linkedAccountId: number,
  target: { account_id: number } | { create_account: { name?: string; type?: string } },
) => post<SyncConnectionAccount>(
  `/api/v1/finance/sync-connection-accounts/${linkedAccountId}/map/`,
  target,
)
