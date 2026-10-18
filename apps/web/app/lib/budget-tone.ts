/**
 * How a budget category is doing, as the colour tokens that say so.
 *
 * One place for the thresholds, so a category's percentage, its bar and its
 * "over budget" note can never disagree: they used to repeat this ternary and
 * the bar's copy silently did nothing.
 */
export type BudgetTone = 'over' | 'near' | 'ok'

export const NEAR_BUDGET_PERCENT = 85

export function budgetTone(percentSpent: number): BudgetTone {
  if (percentSpent >= 100) return 'over'
  if (percentSpent >= NEAR_BUDGET_PERCENT) return 'near'
  return 'ok'
}

export const budgetToneText: Record<BudgetTone, string> = {
  over: 'text-expense',
  near: 'text-caution',
  ok: 'text-income',
}

// An on-track bar keeps the default Ledger Green fill.
export const budgetToneFill: Record<BudgetTone, string | undefined> = {
  over: 'bg-expense',
  near: 'bg-caution',
  ok: undefined,
}
