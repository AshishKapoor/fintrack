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
  category: number
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

const toQueryString = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
  })
  const query = search.toString()
  return query ? `?${query}` : ''
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

export const useV1TransactionsList = (
  params: V1TransactionsListParams = {},
  options?: HookOptions<PaginatedResponse<Transaction>>,
) => {
  const query = toQueryString(params)
  const url = `/api/v1/transactions/${query}`
  return useSWR<PaginatedResponse<Transaction>>(url, get, options?.swr)
}

export const useV1CategoriesList = (
  params: V1CategoryListParams = {},
  options?: HookOptions<PaginatedResponse<Category>>,
) => {
  const query = toQueryString(params)
  const url = `/api/v1/categories/${query}`
  return useSWR<PaginatedResponse<Category>>(url, get, options?.swr)
}

export const useV1BudgetsList = (
  params: V1BudgetListParams = {},
  options?: HookOptions<PaginatedResponse<Budget>>,
) => {
  const query = toQueryString(params)
  const url = `/api/v1/budgets/${query}`
  return useSWR<PaginatedResponse<Budget>>(url, get, options?.swr)
}

export const useV1TransactionsCreate = () => {
  return useSWRMutation(
    '/api/v1/transactions/',
    async (_, { arg }: { arg: TransactionMutationPayload }) =>
      post<Transaction>('/api/v1/transactions/', arg),
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
      return put<Transaction>(`/api/v1/transactions/${id}/`, arg)
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
      await del(`/api/v1/transactions/${id}/`)
    },
  )
}

export const useV1CategoriesCreate = () => {
  return useSWRMutation(
    '/api/v1/categories/',
    async (_, { arg }: { arg: CategoryMutationPayload }) =>
      post<Category>('/api/v1/categories/', arg),
  )
}

export const useV1BudgetsCreate = () => {
  return useSWRMutation(
    '/api/v1/budgets/',
    async (_, { arg }: { arg: BudgetMutationPayload }) => post<Budget>('/api/v1/budgets/', arg),
  )
}

export const v1CategoriesUpdate = (id: string, payload: CategoryMutationPayload) => {
  return put<Category>(`/api/v1/categories/${id}/`, payload)
}

export const v1CategoriesDestroy = (id: string) => {
  return del(`/api/v1/categories/${id}/`)
}

export const v1BudgetsUpdate = (id: string, payload: BudgetMutationPayload) => {
  return put<Budget>(`/api/v1/budgets/${id}/`, payload)
}

