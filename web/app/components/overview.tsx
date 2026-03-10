'use client'

import { Transaction } from '@/client/gen/pft/transaction'
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from 'recharts'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { EmptyPlaceholder } from '@/components/ui/empty-placeholder'
import { CircleDollarSign } from 'lucide-react'
import { useCurrency } from '@/context/currency-context'
import { TypeEnum } from '@/client/gen/pft/typeEnum'

interface MonthlyData {
  name: string
  income: number
  expenses: number
}

const chartConfig = {
  income: {
    label: 'Income',
    color: 'hsl(142.1 76.2% 36.3%)',
  },
  expenses: {
    label: 'Expenses',
    color: 'hsl(0 84.2% 60.2%)',
  },
} satisfies ChartConfig

interface OverviewProps {
  transactions: Transaction[]
}

export function Overview({ transactions }: OverviewProps) {
  const { currency } = useCurrency()

  if (!transactions.length) {
    return (
      <EmptyPlaceholder
        icon={<CircleDollarSign className='w-12 h-12' />}
        title='No data to visualize'
        description='Add some transactions to see your financial overview here.'
      />
    )
  }

  const monthlyData = transactions.reduce((acc: MonthlyData[], transaction) => {
    const date = new Date(transaction.transaction_date)
    const monthYear = date.toLocaleString('default', { month: 'short', year: '2-digit' })

    const existingMonth = acc.find((item) => item.name === monthYear)
    if (existingMonth) {
      if (transaction.type === TypeEnum.income) {
        existingMonth.income += Number(transaction.amount)
      } else {
        existingMonth.expenses += Number(transaction.amount)
      }
    } else {
      acc.push({
        name: monthYear,
        income: transaction.type === TypeEnum.income ? Number(transaction.amount) : 0,
        expenses: transaction.type === TypeEnum.income ? 0 : Number(transaction.amount),
      })
    }
    return acc
  }, [])

  // Sort by date and take last 6 months
  const sortedData = monthlyData
    .sort((a, b) => {
      const [aMonth, aYear] = a.name.split(' ')
      const [bMonth, bYear] = b.name.split(' ')
      return new Date(`${aMonth} 20${aYear}`).getTime() - new Date(`${bMonth} 20${bYear}`).getTime()
    })
    .slice(-6)

  return (
    <ChartContainer config={chartConfig}>
      <BarChart
        data={sortedData}
        margin={{
          top: 20,
        }}
      >
        <CartesianGrid vertical={true} />
        <XAxis
          dataKey='name'
          tickMargin={10}
          fontSize={12}
          label={{ value: 'Months', position: 'right', offset: 0 }}
        />
        <YAxis
          label={{ value: `Amount (${currency.symbol})`, angle: -90, position: 'left' }}
          tickFormatter={(value) => `${currency.symbol}${value}`}
        />
        <ChartTooltip
          cursor={false}
          content={({ active, payload }) => (
            <ChartTooltipContent
              active={active}
              payload={payload}
              formatter={(label, value) => [`${value} - ${currency.symbol}${label}`, ' ']}
              labelFormatter={() => `Total:`}
            />
          )}
        />
        <Bar
          dataKey='income'
          fill='var(--color-income)'
          radius={[4, 4, 0, 0]}
          label={{
            position: 'top',
            formatter: (value: number) => `Income ${currency.symbol}${value}`,
          }}
          name='Income'
        />
        <Bar
          dataKey='expenses'
          fill='var(--color-expenses)'
          radius={[4, 4, 0, 0]}
          label={{
            position: 'top',
            formatter: (value: number) => `Expenses ${currency.symbol}${value}`,
          }}
          name='Expenses'
        />
        <Legend />
      </BarChart>
    </ChartContainer>
  )
}
