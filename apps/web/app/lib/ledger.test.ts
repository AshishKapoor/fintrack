import { describe, expect, it } from 'vitest'
import { buildPostings, buildSplitPostings } from './ledger'

describe('buildPostings', () => {
  it('builds a balanced two-leg posting set for an expense', () => {
    const postings = buildPostings(1, 2, '42.50', 'expense')
    expect(postings).toEqual([
      { account: 1, amount: '-42.50', sort_order: 0 },
      { category: 2, amount: '42.50', sort_order: 1 },
    ])
  })

  it('flips the sign for income', () => {
    const postings = buildPostings(1, 2, '42.50', 'income')
    expect(postings).toEqual([
      { account: 1, amount: '42.50', sort_order: 0 },
      { category: 2, amount: '-42.50', sort_order: 1 },
    ])
  })
})

describe('buildSplitPostings', () => {
  it('sums every split into a single balancing account leg', () => {
    const postings = buildSplitPostings(
      1,
      [
        { categoryId: 10, amount: '20.00' },
        { categoryId: 11, amount: '30.00' },
      ],
      'expense',
    )

    expect(postings[0]).toEqual({ account: 1, amount: '-50.00', sort_order: 0 })
    expect(postings[1]).toEqual({ category: 10, amount: '20.00', sort_order: 1 })
    expect(postings[2]).toEqual({ category: 11, amount: '30.00', sort_order: 2 })

    // The double-entry invariant the backend re-checks server-side too.
    const total = postings.reduce((sum, p) => sum + Number(p.amount), 0)
    expect(total).toBeCloseTo(0)
  })

  it('flips every leg for income splits', () => {
    const postings = buildSplitPostings(
      1,
      [
        { categoryId: 10, amount: '20.00' },
        { categoryId: 11, amount: '5.00' },
      ],
      'income',
    )

    expect(postings[0].amount).toBe('25.00')
    expect(postings[1].amount).toBe('-20.00')
    expect(postings[2].amount).toBe('-5.00')
  })

  it('handles a single split the same as a plain two-leg transaction', () => {
    expect(buildSplitPostings(1, [{ categoryId: 2, amount: '9.99' }], 'expense')).toEqual(
      buildPostings(1, 2, '9.99', 'expense'),
    )
  })
})
