import { describe, expect, it } from 'vitest'
import { CSV_HEADER, escapeCsvCell, serializeExport, toCsv, toJson } from './export'
import type { ExportRow } from './export'

const rows: ExportRow[] = [
  {
    id: 1,
    date: '2026-03-10',
    title: 'Coffee',
    category: 'Food',
    type: 'expense',
    amount: '4.50',
  },
  {
    id: 2,
    date: '2026-03-11',
    title: 'Salary',
    category: 'Income',
    type: 'income',
    amount: '4200.00',
  },
]

describe('toCsv', () => {
  it('separates rows with real newlines', () => {
    // Regression: rows were joined with an escaped backslash-n, so the whole
    // export arrived as a single line containing literal \n sequences.
    const csv = toCsv(rows)

    expect(csv).not.toContain('\\n')
    expect(csv.split('\n')).toHaveLength(3)
  })

  it('writes the header first', () => {
    expect(toCsv(rows).split('\n')[0]).toBe(CSV_HEADER.join(','))
  })

  it('emits one line per transaction', () => {
    const lines = toCsv(rows).split('\n').slice(1)

    expect(lines[0]).toContain('Coffee')
    expect(lines[1]).toContain('Salary')
  })

  it('produces an empty body when there are no rows', () => {
    expect(toCsv([])).toBe(CSV_HEADER.join(','))
  })
})

describe('escapeCsvCell', () => {
  it('quotes every value', () => {
    expect(escapeCsvCell('plain')).toBe('"plain"')
  })

  it('doubles embedded quotes', () => {
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""')
  })

  it('keeps a comma inside the quoted cell', () => {
    expect(escapeCsvCell('Groceries, weekly')).toBe('"Groceries, weekly"')
  })

  it.each(['=1+1', '+1', '-1', '@SUM(A1)'])(
    'neutralises the formula prefix in %s',
    (value) => {
      expect(escapeCsvCell(value, true)).toBe(`"'${value}"`)
    },
  )

  it('leaves formula-looking values alone when sanitising is off', () => {
    expect(escapeCsvCell('=1+1')).toBe('"=1+1"')
  })

  it('detects a formula prefix after leading whitespace', () => {
    expect(escapeCsvCell('  =1+1', true)).toBe(`"'  =1+1"`)
  })
})

describe('toJson', () => {
  it('round-trips the rows', () => {
    expect(JSON.parse(toJson(rows))).toEqual(rows)
  })
})

describe('serializeExport', () => {
  it('describes a CSV export', () => {
    const result = serializeExport(rows, 'csv')

    expect(result.extension).toBe('csv')
    expect(result.mimeType).toBe('text/csv;charset=utf-8')
    expect(result.content.split('\n')).toHaveLength(3)
  })

  it('describes a JSON export', () => {
    const result = serializeExport(rows, 'json')

    expect(result.extension).toBe('json')
    expect(result.mimeType).toBe('application/json')
    expect(JSON.parse(result.content)).toHaveLength(2)
  })
})
