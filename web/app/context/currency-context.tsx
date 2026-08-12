'use client'

import { isLoggedIn } from '@/lib/auth'
import { getDefaultBudgetFile, updateBudgetFileCurrency } from '@/lib/finance-client'
import { ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react'

// Currency options. `symbol` is only used for compact labels; amounts are
// formatted by Intl, which knows each currency's real symbol and placement.
export const currencies = [
  { code: 'INR', symbol: '₹', flag: '🇮🇳', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', flag: '🇺🇸', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', flag: '🇪🇺', name: 'Euro' },
  { code: 'GBP', symbol: '£', flag: '🇬🇧', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', flag: '🇯🇵', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', flag: '🇨🇳', name: 'Chinese Yuan' },
  { code: 'CAD', symbol: '$', flag: '🇨🇦', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: '$', flag: '🇦🇺', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'Fr', flag: '🇨🇭', name: 'Swiss Franc' },
  { code: 'KRW', symbol: '₩', flag: '🇰🇷', name: 'South Korean Won' },
  { code: 'SGD', symbol: '$', flag: '🇸🇬', name: 'Singapore Dollar' },
  { code: 'HKD', symbol: '$', flag: '🇭🇰', name: 'Hong Kong Dollar' },
]

export type Currency = {
  code: string
  symbol: string
  flag: string
  name: string
}

const STORAGE_KEY = 'currency'
const DEFAULT_CURRENCY = currencies.find((item) => item.code === 'USD') ?? currencies[0]

export function currencyByCode(code: string | undefined | null): Currency {
  return currencies.find((item) => item.code === code) ?? DEFAULT_CURRENCY
}

type CurrencyContextType = {
  currency: Currency
  setCurrency: (currency: Currency) => void
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

function readStoredCurrency(): Currency {
  if (typeof window === 'undefined') return DEFAULT_CURRENCY
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return DEFAULT_CURRENCY
  try {
    return currencyByCode((JSON.parse(saved) as Currency)?.code)
  } catch {
    return DEFAULT_CURRENCY
  }
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  // localStorage is a cache for first paint. The budget file on the server is
  // the source of truth: previously the UI defaulted to INR while the client
  // wrote currency_code: 'USD' when it created the budget file, so the display
  // and the stored data disagreed.
  const [currency, setCurrencyState] = useState<Currency>(readStoredCurrency)

  useEffect(() => {
    // Only ask the API once there is a session. On /login and /register this
    // request would 401, and the axios interceptor treats a failed refresh as a
    // sign-out, which redirects to /login - i.e. a reload loop on the login page.
    if (!isLoggedIn()) return

    let cancelled = false
    getDefaultBudgetFile()
      .then((budgetFile) => {
        if (cancelled || !budgetFile?.currency_code) return
        const resolved = currencyByCode(budgetFile.currency_code)
        setCurrencyState(resolved)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(resolved))
      })
      .catch(() => {
        // Signed out, or the API is unreachable: keep the cached choice.
      })
    return () => {
      cancelled = true
    }
  }, [])

  const setCurrency = useCallback((next: Currency) => {
    setCurrencyState(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    // Persist server-side so the choice follows the account, not the browser.
    updateBudgetFileCurrency(next.code).catch(() => {
      // Non-fatal: the local display is already updated.
    })
  }, [])

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider')
  }
  return context
}

/** Format an amount in the given currency, using the browser's locale. */
export function formatCurrency(
  amount: number,
  currencyCode: string,
  options: Intl.NumberFormatOptions = {},
): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      ...options,
    }).format(amount)
  } catch {
    // Intl throws on an unknown currency code.
    return `${amount.toFixed(2)} ${currencyCode}`
  }
}
