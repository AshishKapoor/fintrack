import type { LedgerTransaction } from '@/client/gen/pft/ledgerTransaction'
import type { ScheduledTransaction } from '@/client/gen/pft/scheduledTransaction'
import type { EnvelopeSnapshotRow } from '@/lib/ledger'

/**
 * The data shaping behind Home, kept pure so it can be tested without a DOM.
 *
 * Sign convention throughout (see the ledger): a category leg is positive for
 * spending and negative for income.
 */

// ---- Envelopes ----------------------------------------------------------------

export type EnvelopeState = 'over' | 'low' | 'done' | 'ok' | 'unfunded'

export interface EnvelopeView {
  categoryId: number
  name: string
  /** Assigned this month plus carryover: what the envelope holds in total. */
  budget: number
  spent: number
  /** What can still be spent; never negative (see `over`). */
  available: number
  /** How far spending has gone past the envelope; 0 when it hasn't. */
  over: number
  state: EnvelopeState
}

/** Below this share of its budget still available, an envelope reads as running low. */
export const LOW_SHARE = 0.15

export function envelopeView(row: EnvelopeSnapshotRow): EnvelopeView {
  const budget = Number(row.assigned) + Number(row.carryover)
  const spent = Number(row.spent)
  const over = Math.max(0, Number(row.overspent))
  const available = Math.max(0, Number(row.remaining))

  let state: EnvelopeState
  if (over > 0) state = 'over'
  else if (budget <= 0) state = spent > 0 ? 'over' : 'unfunded'
  // Fully spent as planned - rent paid in full is done, not "over budget by $0".
  else if (available === 0) state = 'done'
  else if (available / budget < LOW_SHARE) state = 'low'
  else state = 'ok'

  return { categoryId: row.category_id, name: row.category, budget, spent, available, over, state }
}

const STATE_ORDER: Record<EnvelopeState, number> = { over: 0, low: 1, ok: 2, unfunded: 3, done: 4 }

/** Envelopes that need a look first, then the rest by least available; done ones last. */
export function sortEnvelopes(envelopes: EnvelopeView[]): EnvelopeView[] {
  return [...envelopes].sort(
    (a, b) =>
      STATE_ORDER[a.state] - STATE_ORDER[b.state] ||
      (a.state === 'over' ? b.over - a.over : a.available - b.available) ||
      a.name.localeCompare(b.name),
  )
}

export function summarizeEnvelopes(rows: EnvelopeSnapshotRow[]) {
  const envelopes = sortEnvelopes(rows.map(envelopeView))
  return {
    envelopes,
    leftToSpend: envelopes.reduce((sum, envelope) => sum + envelope.available, 0),
    overspent: envelopes.filter((envelope) => envelope.state === 'over'),
  }
}

// ---- Scheduled transactions ------------------------------------------------------

export interface UpcomingItem {
  id: number
  name: string
  date: string
  /** Magnitude; see `direction`. */
  amount: number
  direction: 'out' | 'in' | 'transfer'
}

type TemplatePosting = { account_id?: number; category_id?: number; amount?: string | number }

export function scheduleAmount(schedule: ScheduledTransaction): Pick<UpcomingItem, 'amount' | 'direction'> {
  const template = (schedule.transaction_template || {}) as {
    postings?: TemplatePosting[]
    is_transfer?: boolean
  }
  const postings = Array.isArray(template.postings) ? template.postings : []
  const categoryLegs = postings.filter((posting) => posting.category_id)
  if (template.is_transfer || categoryLegs.length === 0) {
    const moved = postings
      .map((posting) => Number(posting.amount || 0))
      .filter((amount) => amount > 0)
      .reduce((sum, amount) => sum + amount, 0)
    return { amount: moved, direction: 'transfer' }
  }
  const net = categoryLegs.reduce((sum, posting) => sum + Number(posting.amount || 0), 0)
  return { amount: Math.abs(net), direction: net < 0 ? 'in' : 'out' }
}

/** Active schedules due from today through `days` days ahead, soonest first. */
export function upcoming(schedules: ScheduledTransaction[], today: string, days = 7): UpcomingItem[] {
  const until = addDays(today, days)
  return schedules
    .filter((schedule) => schedule.is_active !== false)
    .filter((schedule) => schedule.next_run_date >= today && schedule.next_run_date <= until)
    .sort((a, b) => a.next_run_date.localeCompare(b.next_run_date) || a.name.localeCompare(b.name))
    .map((schedule) => ({
      id: schedule.id,
      name: schedule.name,
      date: schedule.next_run_date,
      ...scheduleAmount(schedule),
    }))
}

// ---- Transactions --------------------------------------------------------------

export interface EntryView {
  id: number
  date: string
  /** Who the money went to or came from; falls back to the memo, then the category. */
  label: string
  /** The category, or how the entry is split, or that it is a transfer. */
  detail: string
  amount: number
  direction: 'out' | 'in' | 'transfer'
}

export function entryView(
  transaction: LedgerTransaction,
  words: { transfer: string; split: (count: number) => string; uncategorized: string },
): EntryView {
  const categoryLegs = transaction.posting_lines.filter((line) => line.category !== null)
  if (categoryLegs.length === 0) {
    const moved = transaction.posting_lines
      .map((line) => Number(line.amount))
      .filter((amount) => amount > 0)
      .reduce((sum, amount) => sum + amount, 0)
    return {
      id: transaction.id,
      date: transaction.transaction_date,
      label: transaction.payee_name || transaction.memo || words.transfer,
      detail: words.transfer,
      amount: moved,
      direction: 'transfer',
    }
  }
  // Sum every category leg so a split shows its whole amount, not its first part.
  const net = categoryLegs.reduce((sum, line) => sum + Number(line.amount), 0)
  const detail =
    categoryLegs.length > 1
      ? words.split(categoryLegs.length)
      : categoryLegs[0].category_name || words.uncategorized
  return {
    id: transaction.id,
    date: transaction.transaction_date,
    label: transaction.payee_name || transaction.memo || detail,
    detail,
    amount: Math.abs(net),
    direction: net < 0 ? 'in' : 'out',
  }
}

/** Entries grouped by date, newest day first, keeping each day's order. */
export function groupByDay<T extends { date: string }>(entries: T[]): { date: string; entries: T[] }[] {
  const groups = new Map<string, T[]>()
  for (const entry of entries) {
    const list = groups.get(entry.date)
    if (list) list.push(entry)
    else groups.set(entry.date, [entry])
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, list]) => ({ date, entries: list }))
}

// ---- Dates (ISO yyyy-mm-dd, local calendar) -------------------------------------------------

export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(year, month - 1, day + days)
  return toIsoDate(date)
}

export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Days left in the month including today: on the 18th of a 31-day month, 14. */
export function daysLeftInMonth(today: Date): number {
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  return lastDay - today.getDate() + 1
}
