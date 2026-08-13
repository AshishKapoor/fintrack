import { describe, expect, it } from 'vitest'
import { IMPORT_FORMATS, formatFromFilename } from './import-client'

describe('formatFromFilename', () => {
  it.each([
    ['statement.csv', 'csv'],
    ['export.ofx', 'ofx'],
    ['quicken.qfx', 'qfx'],
    ['register.qif', 'qif'],
  ])('maps %s to %s', (filename, expected) => {
    expect(formatFromFilename(filename)).toBe(expected)
  })

  it('treats .xml as CAMT.053, which is how banks ship ISO 20022', () => {
    expect(formatFromFilename('camt.53.xml')).toBe('camt053')
  })

  it('treats .json as an nYNAB export', () => {
    expect(formatFromFilename('budget.json')).toBe('nynab')
  })

  it('is case insensitive', () => {
    expect(formatFromFilename('STATEMENT.CSV')).toBe('csv')
  })

  it('handles a name with several dots', () => {
    expect(formatFromFilename('2026.03.statement.ofx')).toBe('ofx')
  })

  it('falls back to CSV for an unknown or missing extension', () => {
    expect(formatFromFilename('statement')).toBe('csv')
    expect(formatFromFilename('statement.weird')).toBe('csv')
  })
})

describe('IMPORT_FORMATS', () => {
  it('matches the formats the API accepts', () => {
    expect(IMPORT_FORMATS.map((item) => item.value)).toEqual([
      'csv',
      'ofx',
      'qfx',
      'qif',
      'camt053',
      'ynab4',
      'nynab',
    ])
  })

  it('labels and hints every format', () => {
    for (const item of IMPORT_FORMATS) {
      expect(item.label).toBeTruthy()
      expect(item.hint).toBeTruthy()
    }
  })
})
