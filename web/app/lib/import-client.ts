import { httpPFTClient } from '@/client/httpPFTClient'
import { getDefaultBudgetFileId } from '@/lib/finance-client'

/**
 * Bank statement import.
 *
 * The backend has parsed CSV, OFX, QFX, QIF, CAMT.053 and YNAB exports since
 * the finance domain landed, but nothing in the UI ever called it. This is the
 * three-step flow it expects: create the job, preview what was parsed, then
 * execute it.
 */

export const IMPORT_FORMATS = [
  { value: 'csv', label: 'CSV', hint: 'date, payee, memo, amount' },
  { value: 'ofx', label: 'OFX', hint: 'Open Financial Exchange' },
  { value: 'qfx', label: 'QFX', hint: 'Quicken' },
  { value: 'qif', label: 'QIF', hint: 'Quicken Interchange' },
  { value: 'camt053', label: 'CAMT.053', hint: 'ISO 20022 bank statement' },
  { value: 'ynab4', label: 'YNAB 4', hint: 'YNAB register export' },
  { value: 'nynab', label: 'nYNAB', hint: 'YNAB (new) register export' },
] as const

export type ImportFormat = (typeof IMPORT_FORMATS)[number]['value']

export interface ImportPreviewRow {
  date: string
  payee: string
  memo: string
  amount: string
}

export interface ImportPreview {
  format: string
  detected_rows: number
  sample: ImportPreviewRow[]
  unsupported: boolean
}

export interface ImportJob {
  id: number
  budget_file: number
  format: string
  status: string
  source_filename: string
  preview_summary: ImportPreview | null
  error_message: string
}

export interface ImportResult {
  created: number
  skipped: number
  [key: string]: unknown
}

/** Guess the format from the file extension, falling back to CSV. */
export function formatFromFilename(filename: string): ImportFormat {
  const extension = filename.split('.').pop()?.toLowerCase() ?? ''
  const known = IMPORT_FORMATS.find((item) => item.value === extension)
  if (known) return known.value
  if (extension === 'xml') return 'camt053'
  if (extension === 'json') return 'nynab'
  return 'csv'
}

export async function createImportJob(
  format: ImportFormat,
  filename: string,
  payload: string,
): Promise<ImportJob> {
  const budgetFileId = await getDefaultBudgetFileId()
  return httpPFTClient<ImportJob>({
    url: '/api/v1/finance/imports/',
    method: 'POST',
    data: {
      budget_file: budgetFileId,
      format,
      source_filename: filename,
      source_payload: payload,
    },
  })
}

export async function previewImportJob(id: number): Promise<ImportPreview> {
  return httpPFTClient<ImportPreview>({
    url: `/api/v1/finance/imports/${id}/preview/`,
    method: 'POST',
    data: {},
  })
}

export async function executeImportJob(id: number): Promise<ImportResult> {
  return httpPFTClient<ImportResult>({
    url: `/api/v1/finance/imports/${id}/execute/`,
    method: 'POST',
    data: {},
  })
}
