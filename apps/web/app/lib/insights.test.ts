import { describe, expect, it } from 'vitest'
import { pivotCategoryTrends } from './insights'

describe('pivotCategoryTrends', () => {
  it('buckets each category into its own month row', () => {
    const { points, categories, hasOther } = pivotCategoryTrends([
      { year: 2026, month: 1, category_id: 1, category: 'Groceries', amount: '100.00' },
      { year: 2026, month: 1, category_id: 2, category: 'Rent', amount: '1000.00' },
      { year: 2026, month: 2, category_id: 1, category: 'Groceries', amount: '120.00' },
    ])

    expect(categories).toEqual(['Rent', 'Groceries'])
    expect(hasOther).toBe(false)
    expect(points).toEqual([
      { period: 'Jan 26', Rent: 1000, Groceries: 100 },
      { period: 'Feb 26', Groceries: 120 },
    ])
  })

  it('sorts periods chronologically even when input rows are out of order', () => {
    const { points } = pivotCategoryTrends([
      { year: 2026, month: 3, category_id: 1, category: 'Rent', amount: '10.00' },
      { year: 2025, month: 12, category_id: 1, category: 'Rent', amount: '9.00' },
      { year: 2026, month: 1, category_id: 1, category: 'Rent', amount: '5.00' },
    ])
    expect(points.map((p) => p.period)).toEqual(['Dec 25', 'Jan 26', 'Mar 26'])
  })

  it('folds categories past topN into Other, keeping the exact remainder', () => {
    const rows = Array.from({ length: 8 }, (_, i) => ({
      year: 2026,
      month: 1,
      category_id: i,
      category: `Cat ${i}`,
      // Descending totals so ranking is unambiguous: Cat 0 is the biggest.
      amount: String(100 - i * 10),
    }))
    const { categories, points, hasOther } = pivotCategoryTrends(rows, 6)

    expect(hasOther).toBe(true)
    expect(categories).toEqual(['Cat 0', 'Cat 1', 'Cat 2', 'Cat 3', 'Cat 4', 'Cat 5', 'Other'])
    // Cat 6 (40) + Cat 7 (30) folded into Other.
    expect(points[0].Other).toBe(70)
  })

  it('reports no Other bucket when everything fits under topN', () => {
    const { hasOther, categories } = pivotCategoryTrends(
      [{ year: 2026, month: 1, category_id: 1, category: 'Rent', amount: '10.00' }],
      6,
    )
    expect(hasOther).toBe(false)
    expect(categories).toEqual(['Rent'])
  })

  it('returns nothing for an empty range', () => {
    expect(pivotCategoryTrends([])).toEqual({ points: [], categories: [], hasOther: false })
  })
})
