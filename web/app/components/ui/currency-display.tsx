'use client'

import { formatCurrency, useCurrency } from '@/context/currency-context'
import { cn } from '@/lib/utils'

interface CurrencyDisplayProps {
  amount: number
  className?: string
  showSymbol?: boolean
  /** Drop the decimals, for compact axis labels and chart ticks. */
  compact?: boolean
}

/**
 * Renders a monetary amount in the active currency.
 *
 * Formatting goes through Intl so the symbol, its placement and the digit
 * grouping follow the currency and the reader's locale. The previous version
 * hardcoded en-US grouping and prepended the symbol by hand, which rendered
 * every non-US currency wrong.
 */
export function CurrencyDisplay({
  amount,
  className,
  showSymbol = true,
  compact = false,
}: CurrencyDisplayProps) {
  const { currency } = useCurrency()

  const options: Intl.NumberFormatOptions = compact
    ? { maximumFractionDigits: 0 }
    : { minimumFractionDigits: 2, maximumFractionDigits: 2 }

  const formatted = showSymbol
    ? formatCurrency(amount, currency.code, options)
    : new Intl.NumberFormat(undefined, options).format(amount)

  return <span className={cn('whitespace-nowrap', className)}>{formatted}</span>
}
