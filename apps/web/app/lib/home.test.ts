import type { LedgerTransaction } from '@/client/gen/pft/ledgerTransaction'
import type { ScheduledTransaction } from '@/client/gen/pft/scheduledTransaction'
import {
  addDays,
  daysLeftInMonth,
  entryView,
  envelopeView,
  groupByDay,
  scheduleAmount,
  summarizeEnvelopes,
  upcoming,
} from '@/lib/home'
import type { EnvelopeSnapshotRow } from '@/lib/ledger'
import { describe, expect, it } from 'vitest'

function row(name: string, assigned: string, spent: string, extra: Partial<EnvelopeSnapshotRow> = {}) {
  const budget = Number(assigned) + Number(extra.carryover ?? 0)
  const remaining = budget - Number(spent)
  return {
    category_id: name.length,
    category: name,
    assigned,
    carryover: '0.00',
    spent,
    remaining: String(Math.max(0, remaining)),
    overspent: String(Math.max(0, -remaining)),
    ...extra,
  } as EnvelopeSnapshotRow
}

const WORDS = {
  transfer: 'Transfer',
  split: (count: number) => `Split across ${count}`,
  uncategorized: 'Uncategorized',
}

describe('envelopeView', () => {
  it('reads a fully spent envelope as done, not over budget', () => {
    expect(envelopeView(row('Housing', '1400.00', '1400.00')).state).toBe('done')
  })

  it('flags real overspending with the amount over', () => {
    const view = envelopeView(row('Food', '500.00', '543.00'))
    expect(view.state).toBe('over')
    expect(view.over).toBe(43)
    expect(view.available).toBe(0)
  })

  it('marks an envelope running low below 15% left', () => {
    expect(envelopeView(row('Healthcare', '100.00', '90.00')).state).toBe('low')
    expect(envelopeView(row('Transport', '150.00', '93.00')).state).toBe('ok')
  })

  it('treats spending from an unfunded envelope as over', () => {
    expect(envelopeView(row('Gifts', '0.00', '20.00')).state).toBe('over')
    expect(envelopeView(row('Gifts', '0.00', '0.00')).state).toBe('unfunded')
  })
})

describe('summarizeEnvelopes', () => {
  it('sums what is left and puts attention first, done last', () => {
    const summary = summarizeEnvelopes([
      row('Housing', '1400.00', '1400.00'),
      row('Transport', '150.00', '93.00'),
      row('Food', '500.00', '543.00'),
      row('Healthcare', '100.00', '90.00'),
    ])
    expect(summary.leftToSpend).toBe(57 + 10)
    expect(summary.envelopes.map((e) => e.name)).toEqual(['Food', 'Healthcare', 'Transport', 'Housing'])
    expect(summary.overspent.map((e) => e.name)).toEqual(['Food'])
  })
})

describe('scheduleAmount', () => {
  const schedule = (template: unknown) => ({ transaction_template: template }) as ScheduledTransaction

  it('reads a bill as money out', () => {
    expect(
      scheduleAmount(
        schedule({ postings: [{ account_id: 1, amount: '-1400' }, { category_id: 2, amount: '1400' }] }),
      ),
    ).toEqual({ amount: 1400, direction: 'out' })
  })

  it('reads a salary as money in', () => {
    expect(
      scheduleAmount(
        schedule({ postings: [{ account_id: 1, amount: '4200' }, { category_id: 3, amount: '-4200' }] }),
      ),
    ).toEqual({ amount: 4200, direction: 'in' })
  })

  it('reads a transfer by the amount moved', () => {
    expect(
      scheduleAmount(
        schedule({ is_transfer: true, postings: [{ account_id: 1, amount: '-200' }, { account_id: 2, amount: '200' }] }),
      ),
    ).toEqual({ amount: 200, direction: 'transfer' })
  })
})

describe('upcoming', () => {
  const s = (id: number, name: string, next_run_date: string, is_active = true) =>
    ({ id, name, next_run_date, is_active, transaction_template: {} }) as ScheduledTransaction

  it('keeps active schedules due within the window, soonest first', () => {
    const items = upcoming(
      [
        s(1, 'Rent', '2026-10-20'),
        s(2, 'Gym', '2026-10-18'),
        s(3, 'Paused', '2026-10-19', false),
        s(4, 'Later', '2026-10-30'),
        s(5, 'Overdue', '2026-10-10'),
      ],
      '2026-10-18',
      7,
    )
    expect(items.map((item) => item.name)).toEqual(['Gym', 'Rent'])
  })
})

describe('entryView', () => {
  const tx = (lines: Array<{ category: number | null; category_name?: string; amount: string }>, extra = {}) =>
    ({
      id: 1,
      transaction_date: '2026-10-18',
      payee_name: '',
      memo: '',
      posting_lines: lines,
      ...extra,
    }) as unknown as LedgerTransaction

  it('labels by payee and shows the whole of a split', () => {
    const view = entryView(
      tx(
        [
          { category: null, amount: '-60.00' },
          { category: 1, category_name: 'Food', amount: '40.00' },
          { category: 2, category_name: 'Home', amount: '20.00' },
        ],
        { payee_name: 'Target' },
      ),
      WORDS,
    )
    expect(view).toMatchObject({ label: 'Target', detail: 'Split across 2', amount: 60, direction: 'out' })
  })

  it('reads income as money in and falls back to the category for a label', () => {
    const view = entryView(
      tx([
        { category: null, amount: '4200.00' },
        { category: 3, category_name: 'Salary', amount: '-4200.00' },
      ]),
      WORDS,
    )
    expect(view).toMatchObject({ label: 'Salary', amount: 4200, direction: 'in' })
  })

  it('reads a transfer by the amount moved', () => {
    const view = entryView(
      tx([
        { category: null, amount: '-200.00' },
        { category: null, amount: '200.00' },
      ]),
      WORDS,
    )
    expect(view).toMatchObject({ detail: 'Transfer', amount: 200, direction: 'transfer' })
  })
})

describe('dates and grouping', () => {
  it('groups by day, newest first', () => {
    const groups = groupByDay([
      { date: '2026-10-17', n: 1 },
      { date: '2026-10-18', n: 2 },
      { date: '2026-10-17', n: 3 },
    ])
    expect(groups.map((g) => [g.date, g.entries.map((e) => e.n)])).toEqual([
      ['2026-10-18', [2]],
      ['2026-10-17', [1, 3]],
    ])
  })

  it('adds days across a month boundary', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02')
  })

  it('counts today among the days left', () => {
    expect(daysLeftInMonth(new Date(2026, 9, 18))).toBe(14)
    expect(daysLeftInMonth(new Date(2026, 9, 31))).toBe(1)
  })
})
