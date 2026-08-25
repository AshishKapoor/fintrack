export interface CategoryTrendRow {
  year: number
  month: number
  category_id: number
  category: string
  amount: string
}

export interface CategoryTrendPoint {
  period: string
  [category: string]: string | number
}

export interface CategoryTrendPivot {
  points: CategoryTrendPoint[]
  categories: string[]
  hasOther: boolean
}

export const OTHER_CATEGORY_LABEL = 'Other'

/**
 * Pivot flat (year, month, category, amount) rows - compute_spending_trends'
 * shape - into one row per month with one numeric key per category, capped to
 * the top N categories by total spend over the whole range and the remainder
 * folded into "Other". An unbounded per-category stack is unreadable, and past
 * ~7-8 series a shared-legend chart hits its token ceiling either way.
 */
export function pivotCategoryTrends(rows: CategoryTrendRow[], topN = 6): CategoryTrendPivot {
  const totalsByCategory = new Map<string, number>()
  for (const row of rows) {
    totalsByCategory.set(
      row.category,
      (totalsByCategory.get(row.category) ?? 0) + Number(row.amount),
    )
  }

  const topCategories = [...totalsByCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([category]) => category)
  const topSet = new Set(topCategories)
  const hasOther = totalsByCategory.size > topCategories.length

  const periodKeys: string[] = []
  const periodPoints = new Map<string, CategoryTrendPoint>()
  for (const row of rows) {
    const periodKey = `${row.year}-${String(row.month).padStart(2, '0')}`
    let point = periodPoints.get(periodKey)
    if (!point) {
      point = {
        period: new Date(row.year, row.month - 1, 1).toLocaleString('default', {
          month: 'short',
          year: '2-digit',
        }),
      }
      periodPoints.set(periodKey, point)
      periodKeys.push(periodKey)
    }
    const seriesKey = topSet.has(row.category) ? row.category : OTHER_CATEGORY_LABEL
    point[seriesKey] = ((point[seriesKey] as number | undefined) ?? 0) + Number(row.amount)
  }

  // "YYYY-MM" sorts correctly as a plain string; rows should already arrive in
  // this order from the backend, but the input isn't a documented contract.
  periodKeys.sort()

  return {
    points: periodKeys.map((key) => periodPoints.get(key)!),
    categories: hasOther ? [...topCategories, OTHER_CATEGORY_LABEL] : topCategories,
    hasOther,
  }
}
