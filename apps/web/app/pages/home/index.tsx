import { useV1FinanceTransactionsList } from '@/client/gen/pft/v1/v1'
import type { LedgerTransaction } from '@/client/gen/pft/ledgerTransaction'
import type { ScheduledTransaction } from '@/client/gen/pft/scheduledTransaction'
import { LoadError } from '@/components/load-error'
import { Button } from '@/components/ui/button'
import { formatCurrency, useCurrency } from '@/context/currency-context'
import {
  daysLeftInMonth,
  entryView,
  groupByDay,
  summarizeEnvelopes,
  toIsoDate,
  upcoming,
  type EntryView,
  type EnvelopeView,
  type UpcomingItem,
} from '@/lib/home'
import {
  useBudgetFileBalances,
  useCurrentEnvelopeSnapshot,
  useNetWorthSeries,
  useScheduledTransactions,
} from '@/lib/ledger'
import { cn } from '@/lib/utils'
import {
  ArrowDownIcon,
  ArrowLeftRight,
  ArrowUpIcon,
  CalendarClock,
  Check,
  ChevronRight,
  CircleAlert,
  Plus,
  Upload,
  WalletCards,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

/**
 * Home: how is the household doing this month, and what can it still spend?
 *
 * Read top to bottom like a page of the household's books: the month in one
 * sentence, anything that needs a look, the envelopes, the latest entries by
 * day, and net worth. Built only from figures the server computes - nothing
 * here is a client-side guess (see .impeccable/briefs/home-and-navigation.md).
 */
export default function HomePage() {
  const { t, i18n } = useTranslation()
  const { currency } = useCurrency()
  const money = (amount: number) => formatCurrency(amount, currency.code)

  const now = new Date()
  const today = toIsoDate(now)
  const monthName = new Intl.DateTimeFormat(i18n.language, { month: 'long' }).format(now)

  const snapshotQuery = useCurrentEnvelopeSnapshot()
  const schedulesQuery = useScheduledTransactions()
  // Up to today only: a future-dated entry is not something that happened yet.
  const recentQuery = useV1FinanceTransactionsList({
    page_size: 12,
    ordering: '-transaction_date',
    ...({ end_date: today } as object),
  })
  const balancesQuery = useBudgetFileBalances()
  const seriesQuery = useNetWorthSeries()

  const loading =
    snapshotQuery.isLoading || recentQuery.isLoading || schedulesQuery.isLoading
  const failed =
    (snapshotQuery.error && snapshotQuery.data === undefined) ||
    (recentQuery.error && !recentQuery.data)

  if (failed) {
    return (
      <div className='p-4 sm:p-6'>
        <h1 className='sr-only'>{t('home.title')}</h1>
        <LoadError
          what={t('loadError.dashboard')}
          onRetry={() => {
            void snapshotQuery.mutate()
            void recentQuery.mutate()
            void schedulesQuery.mutate()
          }}
        />
      </div>
    )
  }

  if (loading) return <HomeSkeleton label={t('home.loading')} />

  const snapshot = snapshotQuery.data ?? null
  const summary = summarizeEnvelopes(snapshot?.assignments ?? [])
  const readyToAssign = snapshot ? Number(snapshot.available_to_budget) : 0
  const bills = upcoming((schedulesQuery.data ?? []) as unknown as ScheduledTransaction[], today, 7)
  const words = {
    transfer: t('home.transfer'),
    split: (count: number) => t('home.split', { count }),
    uncategorized: t('transactions.uncategorized'),
  }
  const entries = ((recentQuery.data?.results ?? []) as LedgerTransaction[]).map((tx) =>
    entryView(tx, words),
  )
  const hasAnyEntries = (recentQuery.data?.count ?? 0) > 0

  if (!snapshot && !hasAnyEntries) {
    return <FirstRun />
  }

  const daysLeft = daysLeftInMonth(now)

  return (
    <div className='mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-6'>
      {/* The month in one sentence. */}
      <section aria-labelledby='home-title' className='space-y-2'>
        {snapshot ? (
          <>
            <h1 id='home-title' className='text-2xl font-semibold leading-tight sm:text-3xl'>
              <span className='tabular-nums'>{money(summary.leftToSpend)}</span>{' '}
              <span className='font-normal text-muted-foreground'>
                {t('home.leftToSpend', { month: monthName })}
              </span>
            </h1>
            <p className='text-sm text-muted-foreground'>
              {t('home.acrossEnvelopes', { count: summary.envelopes.length })} ·{' '}
              {t('home.daysLeft', { count: daysLeft })}
            </p>
          </>
        ) : (
          <>
            <h1 id='home-title' className='text-2xl font-semibold leading-tight sm:text-3xl'>
              {t('home.planTitle', { month: monthName })}
            </h1>
            <p className='max-w-prose text-sm text-muted-foreground'>{t('home.planBody')}</p>
            <Button asChild className='mt-2'>
              <Link to='/budgets'>{t('home.planAction')}</Link>
            </Button>
          </>
        )}
      </section>

      {snapshot && (
        <NeedsAttention
          overspent={summary.overspent}
          readyToAssign={readyToAssign}
          bills={bills}
          money={money}
          today={today}
        />
      )}
      {!snapshot && bills.length > 0 && (
        <NeedsAttention overspent={[]} readyToAssign={0} bills={bills} money={money} today={today} />
      )}

      <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'>
        {snapshot && summary.envelopes.length > 0 && (
          <Panel title={t('home.envelopes')} action={{ to: '/budgets', label: t('home.openBudgets') }}>
            <ul className='divide-y'>
              {summary.envelopes.map((envelope) => (
                <EnvelopeRow key={envelope.categoryId} envelope={envelope} money={money} />
              ))}
            </ul>
          </Panel>
        )}

        <div className='flex flex-col gap-6'>
          <Panel title={t('home.recent')} action={{ to: '/transactions', label: t('home.allEntries') }}>
            {entries.length === 0 ? (
              <p className='py-6 text-center text-sm text-muted-foreground'>{t('home.noEntriesYet')}</p>
            ) : (
              <div className='space-y-4'>
                {groupByDay(entries).map((group) => (
                  <section key={group.date} aria-label={dayLabel(group.date, today, i18n.language, t)}>
                    <h3 className='mb-1 text-xs font-semibold text-muted-foreground'>
                      {dayLabel(group.date, today, i18n.language, t)}
                    </h3>
                    <ul className='divide-y'>
                      {group.entries.map((entry) => (
                        <EntryRow key={entry.id} entry={entry} money={money} />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </Panel>

          <NetWorth
            total={balancesQuery.data ? Number(balancesQuery.data.net_worth.total) : null}
            partial={Boolean(balancesQuery.data?.net_worth.missing_rate)}
            points={(seriesQuery.data?.points ?? []).map((point) => Number(point.total))}
            money={money}
          />
        </div>
      </div>
    </div>
  )
}

// ---- Sections -------------------------------------------------------------------

function Panel({
  title,
  action,
  children,
}: {
  title: string
  action?: { to: string; label: string }
  children: ReactNode
}) {
  return (
    <section className='rounded-xl border bg-card p-4 sm:p-5'>
      <div className='mb-3 flex items-baseline justify-between gap-3'>
        <h2 className='text-base font-semibold'>{title}</h2>
        {action && (
          <Link
            to={action.to}
            className='inline-flex items-center gap-0.5 rounded-sm text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 pointer-coarse:py-3'
          >
            {/* Ink for the words (green fails 4.5:1 as text on a dark card);
                the green chevron still marks it as the action. */}
            {action.label}
            <ChevronRight className='h-4 w-4 text-primary' aria-hidden='true' />
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

function NeedsAttention({
  overspent,
  readyToAssign,
  bills,
  money,
  today,
}: {
  overspent: EnvelopeView[]
  readyToAssign: number
  bills: UpcomingItem[]
  money: (amount: number) => string
  today: string
}) {
  const { t, i18n } = useTranslation()
  const items: ReactNode[] = []

  for (const envelope of overspent) {
    items.push(
      <AttentionRow
        key={`over-${envelope.categoryId}`}
        to='/budgets'
        icon={<CircleAlert className='h-4 w-4 text-expense' aria-hidden='true' />}
        text={t('home.overspent', { name: envelope.name, amount: money(envelope.over) })}
        hint={t('home.overspentHint')}
      />,
    )
  }
  if (readyToAssign > 0.004) {
    items.push(
      <AttentionRow
        key='ready'
        to='/budgets'
        icon={<WalletCards className='h-4 w-4 text-primary' aria-hidden='true' />}
        text={t('home.readyToAssign', { amount: money(readyToAssign) })}
        hint={t('home.readyToAssignHint')}
      />,
    )
  } else if (readyToAssign < -0.004) {
    items.push(
      <AttentionRow
        key='over-assigned'
        to='/budgets'
        icon={<CircleAlert className='h-4 w-4 text-expense' aria-hidden='true' />}
        text={t('home.overAssigned', { amount: money(-readyToAssign) })}
        hint={t('home.overAssignedHint')}
      />,
    )
  }
  for (const bill of bills) {
    const when = dayLabel(bill.date, today, i18n.language, t)
    items.push(
      <AttentionRow
        key={`bill-${bill.id}`}
        to='/rules?tab=recurring'
        icon={<CalendarClock className='h-4 w-4 text-muted-foreground' aria-hidden='true' />}
        text={
          bill.direction === 'in'
            ? t('home.expected', { name: bill.name, when })
            : t('home.due', { name: bill.name, when })
        }
        amount={
          <Amount amount={bill.amount} direction={bill.direction} money={money} className='text-sm' />
        }
      />,
    )
  }

  return (
    <section aria-labelledby='attention-title' className='rounded-xl border bg-card p-4 sm:p-5'>
      <h2 id='attention-title' className='mb-2 text-base font-semibold'>
        {t('home.attention')}
      </h2>
      {items.length === 0 ? (
        <p className='flex items-center gap-2 py-1 text-sm'>
          <Check className='h-4 w-4 text-primary' aria-hidden='true' />
          {t('home.allOnPlan')}
        </p>
      ) : (
        <ul className='divide-y'>{items}</ul>
      )}
    </section>
  )
}

function AttentionRow({
  to,
  icon,
  text,
  hint,
  amount,
}: {
  to: string
  icon: ReactNode
  text: string
  hint?: string
  amount?: ReactNode
}) {
  return (
    <li>
      <Link
        to={to}
        className='-mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 pointer-coarse:py-3'
      >
        <span className='shrink-0'>{icon}</span>
        <span className='min-w-0 flex-1'>
          <span className='block text-sm'>{text}</span>
          {hint && <span className='block text-xs text-muted-foreground'>{hint}</span>}
        </span>
        {amount}
        <ChevronRight className='h-4 w-4 shrink-0 text-muted-foreground' aria-hidden='true' />
      </Link>
    </li>
  )
}

function EnvelopeRow({ envelope, money }: { envelope: EnvelopeView; money: (n: number) => string }) {
  const { t } = useTranslation()
  const share = envelope.budget > 0 ? Math.min(1, envelope.spent / envelope.budget) : envelope.spent > 0 ? 1 : 0
  const status =
    envelope.state === 'over'
      ? { text: t('home.envelopeOver', { amount: money(envelope.over) }), tone: 'text-expense' }
      : envelope.state === 'done'
        ? { text: t('home.envelopeDone'), tone: 'text-muted-foreground' }
        : envelope.state === 'unfunded'
          ? { text: t('home.envelopeUnfunded'), tone: 'text-muted-foreground' }
          : {
              text: t('home.envelopeLeft', { amount: money(envelope.available), budget: money(envelope.budget) }),
              tone: envelope.state === 'low' ? 'text-caution' : 'text-foreground',
            }
  const fill =
    envelope.state === 'over' ? 'bg-expense' : envelope.state === 'low' ? 'bg-caution' : 'bg-primary'

  return (
    <li className='py-2.5'>
      <div className='flex items-baseline justify-between gap-3'>
        <span className='truncate text-sm font-medium'>{envelope.name}</span>
        <span className={cn('flex shrink-0 items-center gap-1 text-sm tabular-nums', status.tone)}>
          {envelope.state === 'done' && <Check className='h-3.5 w-3.5' aria-hidden='true' />}
          {status.text}
        </span>
      </div>
      {/* Visual only: the sentence beside it carries the figure for every reader. */}
      <div aria-hidden='true' className='mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted'>
        <div className={cn('h-full rounded-full', fill)} style={{ width: `${share * 100}%` }} />
      </div>
    </li>
  )
}

function EntryRow({ entry, money }: { entry: EntryView; money: (n: number) => string }) {
  return (
    <li className='flex items-center justify-between gap-3 py-2'>
      <span className='min-w-0'>
        <span className='block truncate text-sm font-medium'>{entry.label}</span>
        {entry.detail !== entry.label && (
          <span className='block truncate text-xs text-muted-foreground'>{entry.detail}</span>
        )}
      </span>
      <Amount amount={entry.amount} direction={entry.direction} money={money} className='text-sm' />
    </li>
  )
}

/** An amount with its direction as a word-free cue beside the colour (never colour alone). */
function Amount({
  amount,
  direction,
  money,
  className,
}: {
  amount: number
  direction: 'in' | 'out' | 'transfer'
  money: (n: number) => string
  className?: string
}) {
  const { t } = useTranslation()
  const Icon = direction === 'in' ? ArrowUpIcon : direction === 'out' ? ArrowDownIcon : ArrowLeftRight
  return (
    <span
      className={cn(
        'flex shrink-0 items-center gap-1 font-medium tabular-nums',
        direction === 'in' ? 'text-income' : direction === 'out' ? 'text-expense' : 'text-muted-foreground',
        className,
      )}
    >
      <Icon className='h-3.5 w-3.5' aria-hidden='true' />
      <span className='sr-only'>
        {direction === 'in' ? t('home.moneyIn') : direction === 'out' ? t('home.moneyOut') : t('home.transfer')}
      </span>
      {money(amount)}
    </span>
  )
}

function NetWorth({
  total,
  partial,
  points,
  money,
}: {
  total: number | null
  partial: boolean
  points: number[]
  money: (n: number) => string
}) {
  const { t } = useTranslation()
  return (
    <Panel title={t('home.netWorth')} action={{ to: '/accounts', label: t('home.accounts') }}>
      <div className='flex items-end justify-between gap-4'>
        <div>
          <p className='text-2xl font-semibold tabular-nums'>{total === null ? '…' : money(total)}</p>
          <p className='text-xs text-muted-foreground'>
            {partial ? t('home.netWorthPartial') : t('home.netWorthNote')}
          </p>
        </div>
        <Sparkline points={points} label={t('home.netWorthTrend')} />
      </div>
    </Panel>
  )
}

/** A twelve-month trend line; deliberately not a chart library on the daily page. */
function Sparkline({ points, label }: { points: number[]; label: string }) {
  if (points.length < 2) return null
  const width = 140
  const height = 40
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const path = points
    .map((value, index) => {
      const x = (index / (points.length - 1)) * width
      const y = height - 2 - ((value - min) / span) * (height - 4)
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg
      role='img'
      aria-label={label}
      viewBox={`0 0 ${width} ${height}`}
      className='h-10 w-36 shrink-0 text-chart-2'
    >
      <path d={path} fill='none' stroke='currentColor' strokeWidth='2' strokeLinejoin='round' strokeLinecap='round' />
    </svg>
  )
}

function FirstRun() {
  const { t } = useTranslation()
  return (
    <div className='mx-auto flex max-w-xl flex-col gap-4 p-6 pt-12'>
      <h1 className='text-2xl font-semibold'>{t('home.firstRunTitle')}</h1>
      <p className='text-muted-foreground'>{t('home.firstRunBody')}</p>
      <div className='flex flex-wrap gap-2'>
        <Button asChild>
          <Link to='/quick-add'>
            <Plus className='h-4 w-4' aria-hidden='true' />
            {t('home.firstRunAdd')}
          </Link>
        </Button>
        <Button asChild variant='outline'>
          <Link to='/transactions?import=1'>
            <Upload className='h-4 w-4' aria-hidden='true' />
            {t('home.firstRunImport')}
          </Link>
        </Button>
      </div>
    </div>
  )
}

function HomeSkeleton({ label }: { label: string }) {
  return (
    <div className='mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-6' aria-busy='true'>
      <span className='sr-only' role='status'>
        {label}
      </span>
      <div className='h-9 w-2/3 animate-pulse rounded-md bg-muted' />
      <div className='h-24 animate-pulse rounded-xl bg-muted' />
      <div className='grid gap-6 lg:grid-cols-2'>
        <div className='h-72 animate-pulse rounded-xl bg-muted' />
        <div className='h-72 animate-pulse rounded-xl bg-muted' />
      </div>
    </div>
  )
}

// ---- Helpers --------------------------------------------------------------------

function dayLabel(
  isoDate: string,
  today: string,
  locale: string,
  t: (key: string) => string,
): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const [ty, tm, td] = today.split('-').map(Number)
  const diff = Math.round((date.getTime() - new Date(ty, tm - 1, td).getTime()) / 86_400_000)
  if (diff === 0) return t('home.today')
  if (diff === -1) return t('home.yesterday')
  if (diff === 1) return t('home.tomorrow')
  return new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(date)
}
