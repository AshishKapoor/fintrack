'use client'

import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Landmark } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { EmptyPlaceholder } from '@/components/ui/empty-placeholder'
import { AnimateSpinner } from '@/components/spinner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, useCurrency } from '@/context/currency-context'
import { useDebtPayoff, type DebtPayoffStrategy } from '@/lib/ledger'

// Same treatment as the net worth chart: a single series over time needs no
// legend and no series-identity color, just one consistent hue (the
// dataviz skill's validated default, slot 1). Not read here as "debt = bad,
// so red" - the line trends down, which is the good outcome, and red in
// this app already means "expense/outflow" elsewhere, which would misread
// a declining-is-good chart as the opposite.
const chartConfig = {
  total_balance: { label: 'Remaining balance', theme: { light: '#2a78d6', dark: '#3987e5' } },
} satisfies ChartConfig

function useDebounced<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

export function DebtPayoffPanel() {
  const { currency } = useCurrency()
  const [strategy, setStrategy] = useState<DebtPayoffStrategy>('avalanche')
  const [extraPaymentInput, setExtraPaymentInput] = useState('0')
  const extraPayment = useDebounced(extraPaymentInput, 400)

  const { data, isLoading } = useDebtPayoff(strategy, extraPayment)

  const chartData = useMemo(
    () => (data?.schedule ?? []).map((point) => ({ month: point.month, total_balance: Number(point.total_balance) })),
    [data],
  )

  const hasDebts = Boolean(data?.payoff_order.length)
  const hasExcluded = Boolean(data?.excluded.length)

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-end gap-4'>
        <div className='space-y-1.5'>
          <Label>Strategy</Label>
          <Tabs value={strategy} onValueChange={(value) => setStrategy(value as DebtPayoffStrategy)}>
            <TabsList>
              <TabsTrigger value='avalanche'>Avalanche</TabsTrigger>
              <TabsTrigger value='snowball'>Snowball</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor='debt-extra-payment'>Extra payment / month</Label>
          <Input
            id='debt-extra-payment'
            type='number'
            step='0.01'
            min='0'
            className='w-40'
            value={extraPaymentInput}
            onChange={(e) => setExtraPaymentInput(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <AnimateSpinner size={48} />
      ) : !hasDebts ? (
        <EmptyPlaceholder
          icon={<Landmark className='w-12 h-12' />}
          title='No debts to plan around yet'
          description={
            hasExcluded
              ? 'Add an interest rate and minimum payment to a credit or liability account to include it here.'
              : 'Once a credit card or liability account has a balance, an interest rate, and a minimum payment, its payoff plan shows up here.'
          }
          action={
            <Link to='/accounts' className='text-sm underline underline-offset-4'>
              Go to Accounts
            </Link>
          }
        />
      ) : (
        <>
          <p className='text-sm text-muted-foreground'>
            {data!.months_to_debt_free === null ? (
              <span className='text-destructive'>
                At this rate, minimum payments alone never cover the interest - these debts will never be
                paid off. Add an extra payment above.
              </span>
            ) : (
              <>
                Debt-free in{' '}
                <span className='text-foreground font-semibold'>{data!.months_to_debt_free} months</span>,
                paying{' '}
                <span className='text-foreground font-semibold'>
                  {formatCurrency(Number(data!.total_interest_paid), currency.code)}
                </span>{' '}
                in total interest.
              </>
            )}
          </p>

          {chartData.length > 0 && (
            <ChartContainer config={chartConfig} className='aspect-auto h-[260px] w-full'>
              <AreaChart data={chartData} margin={{ top: 20 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey='month'
                  tickMargin={10}
                  fontSize={12}
                  label={{ value: 'Months from now', position: 'insideBottom', offset: -5 }}
                />
                <YAxis
                  width={80}
                  tickFormatter={(value) =>
                    formatCurrency(Number(value), currency.code, { maximumFractionDigits: 0 })
                  }
                />
                <ChartTooltip
                  cursor={{ opacity: 0.1 }}
                  content={
                    <ChartTooltipContent
                      formatter={(value) => [formatCurrency(Number(value), currency.code), ' Remaining']}
                    />
                  }
                />
                <Area
                  dataKey='total_balance'
                  stroke='var(--color-total_balance)'
                  fill='var(--color-total_balance)'
                  fillOpacity={0.1}
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ChartContainer>
          )}

          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Paid off</TableHead>
                  <TableHead className='text-right'>Interest paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data!.payoff_order.map((row) => (
                  <TableRow key={row.account_id}>
                    <TableCell className='font-medium'>{row.account}</TableCell>
                    <TableCell className='text-muted-foreground'>
                      {row.payoff_month === null ? 'Never (at current payments)' : `${row.payoff_month} months`}
                    </TableCell>
                    <TableCell className='text-right tabular-nums'>
                      {formatCurrency(Number(row.interest_paid), currency.code)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {hasExcluded && (
            <p className='text-xs text-muted-foreground'>
              Not included: {data!.excluded.map((row) => row.account).join(', ')} - missing an interest rate,
              minimum payment, or exchange rate.{' '}
              <Link to='/accounts' className='underline underline-offset-4'>
                Fix on Accounts
              </Link>
              .
            </p>
          )}
        </>
      )}
    </div>
  )
}
