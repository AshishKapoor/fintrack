/**
 * Transaction export.
 *
 * Extracted from the transactions page so the serialisation is testable on its
 * own. It previously joined CSV rows with an escaped backslash-n, which
 * produced a single-line file, and that shipped unnoticed because nothing
 * covered it.
 */

export interface ExportRow {
  id: number
  date: string
  title: string
  category: string
  type: string
  amount: string
}

export const CSV_HEADER = ['id', 'date', 'title', 'category', 'type', 'amount'] as const

/**
 * Quote a CSV cell.
 *
 * `sanitizeFormula` guards against CSV injection: a cell starting with =, +, -
 * or @ is executed as a formula by spreadsheet applications, so it is prefixed
 * with an apostrophe.
 */
export function escapeCsvCell(value: string | number, sanitizeFormula = false): string {
  const raw = String(value)
  const safe = sanitizeFormula && /^[=+\-@]/.test(raw.trimStart()) ? `'${raw}` : raw
  return `"${safe.replace(/"/g, '""')}"`
}

export function toCsv(rows: ExportRow[]): string {
  const lines = rows.map((row) =>
    [
      escapeCsvCell(row.id),
      escapeCsvCell(row.date),
      escapeCsvCell(row.title, true),
      escapeCsvCell(row.category, true),
      escapeCsvCell(row.type),
      escapeCsvCell(row.amount),
    ].join(','),
  )
  return [CSV_HEADER.join(','), ...lines].join('\n')
}

export function toJson(rows: ExportRow[]): string {
  return JSON.stringify(rows, null, 2)
}

export function serializeExport(rows: ExportRow[], format: 'csv' | 'json') {
  if (format === 'json') {
    return { content: toJson(rows), mimeType: 'application/json', extension: 'json' }
  }
  return { content: toCsv(rows), mimeType: 'text/csv;charset=utf-8', extension: 'csv' }
}

/** Trigger a browser download for already-serialised content. */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
