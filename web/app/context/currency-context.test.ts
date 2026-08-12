import { describe, expect, it } from 'vitest'
import { currencies, currencyByCode, formatCurrency } from './currency-context'

describe('formatCurrency', () => {
  it('places the symbol where the currency expects it', () => {
    // Regression: the old implementation always prepended the symbol and used
    // en-US grouping, so non-US currencies rendered wrong.
    const usd = formatCurrency(1234.5, 'USD')
    const eur = formatCurrency(1234.5, 'EUR')

    expect(usd).toMatch(/1,234\.50|1.234,50/)
    expect(usd).not.toBe(eur)
  })

  it('keeps the cents', () => {
    // Regression: the dashboard truncated amounts to a 32-bit integer, so every
    // headline figure lost its cents.
    expect(formatCurrency(1234.56, 'USD')).toContain('56')
  })

  it('formats zero-decimal currencies without decimals', () => {
    expect(formatCurrency(1234, 'JPY')).not.toMatch(/\.\d\d/)
  })

  it('honours an explicit fraction-digit override', () => {
    expect(formatCurrency(1234.56, 'USD', { maximumFractionDigits: 0 })).not.toContain('56')
  })

  it('handles negative amounts', () => {
    expect(formatCurrency(-42, 'USD')).toMatch(/-|\(/)
  })

  it('falls back rather than throwing on an unknown currency code', () => {
    expect(formatCurrency(10, 'NOTACURRENCY')).toBe('10.00 NOTACURRENCY')
  })
})

describe('currencyByCode', () => {
  it('resolves a known code', () => {
    expect(currencyByCode('INR').symbol).toBe('₹')
  })

  it.each([undefined, null, '', 'ZZZ'])('falls back to USD for %s', (code) => {
    expect(currencyByCode(code).code).toBe('USD')
  })

  it('has a unique code per entry', () => {
    const codes = currencies.map((item) => item.code)
    expect(new Set(codes).size).toBe(codes.length)
  })
})
