import { format, isValid, parse } from 'date-fns'

export const API_DATE_FORMAT = 'yyyy-MM-dd'

export function formatDateForApi(date: Date): string {
  return format(date, API_DATE_FORMAT)
}

export function parseApiDate(value: string): Date | null {
  const parsed = parse(value, API_DATE_FORMAT, new Date())
  return isValid(parsed) ? parsed : null
}
