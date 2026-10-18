import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, useCurrency } from '@/context/currency-context'
import { cn } from '@/lib/utils'
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * A report result, read as a household would read it - not the raw payload.
 *
 * Category amounts follow the ledger's sign convention (positive is money
 * spent, negative is money that came in), so each one is shown as a plain
 * amount with its direction rather than as a signed number.
 */

type Row = Record<string, string | number | null | undefined>
export type ReportResultData = {
  type: string
  [key: string]: unknown
}

export function ReportResult({ result }: { result: ReportResultData }) {
  const { t, i18n } = useTranslation()
  const { currency } = useCurrency()
  const money = (value: unknown) => formatCurrency(Math.abs(Number(value ?? 0)), currency.code)
  const monthLabel = (row: Row) =>
    new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(
      new Date(Number(row.year), Number(row.month) - 1, 1),
    )

  if (result.type === 'net_worth') {
    const accounts = (result.accounts as Row[] | undefined) ?? []
    return (
      <div className='space-y-4'>
        <Figure label={t('reportResult.netWorth', { date: result.as_of })} value={money(result.total)} />
        {Boolean(result.missing_rate) && (
          <p className='text-sm text-muted-foreground'>{t('reportResult.partial')}</p>
        )}
        <Table scrollLabel={t('reportResult.accounts')}>
          <TableHeader>
            <TableRow>
              <TableHead>{t('reportResult.account')}</TableHead>
              <TableHead className='text-right'>{t('reportResult.balance')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((row) => (
              <TableRow key={String(row.account_id)}>
                <TableCell className='font-medium'>{row.name}</TableCell>
                <TableCell className='text-right tabular-nums'>
                  {row.converted_balance == null
                    ? t('reportResult.noRate')
                    : `${Number(row.converted_balance) < 0 ? '−' : ''}${money(row.converted_balance)}`}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (result.type === 'cash_flow') {
    const net = Number(result.net ?? 0)
    return (
      <div className='grid gap-4 sm:grid-cols-3'>
        <Figure label={t('reportResult.moneyIn')} value={money(result.income)} tone='text-income' />
        <Figure label={t('reportResult.moneyOut')} value={money(result.expenses)} tone='text-expense' />
        <Figure
          label={net >= 0 ? t('reportResult.keptNet') : t('reportResult.overspentNet')}
          value={money(net)}
        />
      </div>
    )
  }

  const rows = (result.rows as Row[] | undefined) ?? []
  if (rows.length === 0) {
    return <p className='text-sm text-muted-foreground'>{t('reportResult.empty')}</p>
  }

  const byMonth = result.type === 'custom' && result.group_by === 'month'
  const showMonth = result.type === 'spending_trends' || byMonth
  const showCategory = !byMonth

  return (
    <Table scrollLabel={t('reportResult.rows')}>
      <TableHeader>
        <TableRow>
          {showMonth && <TableHead>{t('reportResult.month')}</TableHead>}
          {showCategory && <TableHead>{t('reportResult.category')}</TableHead>}
          <TableHead className='text-right'>{byMonth ? t('reportResult.net') : t('reportResult.amount')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => {
          const value = Number(row.amount ?? 0)
          // Category legs: positive is money out, negative is money in.
          const incoming = value < 0
          return (
            <TableRow key={index}>
              {showMonth && <TableCell>{monthLabel(row)}</TableCell>}
              {showCategory && <TableCell className='font-medium'>{row.category}</TableCell>}
              <TableCell className='text-right'>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 tabular-nums',
                    incoming ? 'text-income' : 'text-expense',
                  )}
                >
                  {incoming ? (
                    <ArrowUpIcon className='h-3.5 w-3.5' aria-hidden='true' />
                  ) : (
                    <ArrowDownIcon className='h-3.5 w-3.5' aria-hidden='true' />
                  )}
                  <span className='sr-only'>{incoming ? t('home.moneyIn') : t('home.moneyOut')}</span>
                  {money(value)}
                </span>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className='text-sm text-muted-foreground'>{label}</p>
      <p className={cn('text-2xl font-semibold tabular-nums', tone)}>{value}</p>
    </div>
  )
}
