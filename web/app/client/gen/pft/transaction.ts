import type { TypeEnum } from './typeEnum'

export interface Transaction {
  id: number
  user: number
  title: string
  amount: string
  type: TypeEnum
  category: number | null
  transaction_date: string
  created_at: string
  updated_at: string
}

