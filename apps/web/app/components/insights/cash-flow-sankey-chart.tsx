'use client'

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Sankey, Rectangle } from 'recharts'
import { Waves } from 'lucide-react'

import { LoadError } from '@/components/load-error'
import { ChartConfig, ChartContainer } from '@/components/ui/chart'
import { EmptyPlaceholder } from '@/components/ui/empty-placeholder'
import { AnimateSpinner } from '@/components/spinner'
import { formatCurrency, useCurrency } from '@/context/currency-context'
import { useCashFlowSankey, type SankeyLink, type SankeyNode } from '@/lib/ledger'

interface CashFlowSankeyChartProps {
  startDate?: string
  endDate?: string
  topN?: number
}

type Side = 'income' | 'hub' | 'expense'

interface RawNode extends SankeyNode {
  side: Side
  /** Total flow through this node - computed and injected by recharts itself
   * (not present on the raw nodes this component's own data sends in). */
  value?: number
}

// Money in vs money out is a polarity, not a set of category identities: two
// hues around a neutral hub. Those two hues are the app's own income and
// expense tokens, so the flows read in the same colours as every amount
// elsewhere, and follow the active theme.
const chartConfig = {
  income: { color: 'var(--income)' },
  expense: { color: 'var(--expense)' },
  hub: { color: 'var(--category-other)' },
} satisfies ChartConfig

// recharts' Sankey computes layout purely numerically (summing/comparing
// link.value while positioning nodes) - a string amount like "700.00" would
// silently corrupt that math via string concatenation instead of addition,
// so values are converted to numbers here, once, before they ever reach it.
function toChartData(nodes: SankeyNode[], links: SankeyLink[]) {
  return {
    nodes: nodes as RawNode[],
    links: links.map((link) => ({ ...link, value: Number(link.value) })),
  }
}

// recharts' Sankey draws nothing but a plain blue rectangle by default - no
// label, no per-node color, so both are drawn explicitly here. The amount is
// part of the label itself rather than a tooltip: this app's version of
// recharts' Sankey never activates its own hover tooltip (its bespoke
// mouseenter wiring - distinct from the shared, working path every dataKey
// chart uses - never flips isTooltipActive here, seemingly a recharts/React 19
// interaction; confirmed live with the pointer verified over the exact
// element via elementFromPoint), so the value has to be visible without
// hovering regardless.
function SankeyNodeShape(props: {
  x?: number
  y?: number
  width?: number
  height?: number
  payload?: RawNode
  currencyCode: string
}) {
  const { x, y, width, height, payload, currencyCode } = props
  if (x === undefined || y === undefined || width === undefined || height === undefined || !payload) {
    return null
  }
  const fill = `var(--color-${payload.side})`
  const label =
    payload.value === undefined
      ? payload.name
      : `${payload.name} — ${formatCurrency(payload.value, currencyCode, { maximumFractionDigits: 0 })}`
  return (
    <g>
      <Rectangle x={x} y={y} width={width} height={height} fill={fill} />
      {/* Labels point outward, away from the diagram, into the margin
          reserved for them - toward the ribbons (inward) would sit on top of
          the very links fanning out from the node. The hub sits in the
          middle with no outward direction, so it gets no label at all;
          "Cash flow" as the card title already says what it is. */}
      {payload.side === 'income' && (
        <text x={x - 6} y={y + height / 2} textAnchor='end' dominantBaseline='middle' className='fill-foreground text-xs'>
          {label}
        </text>
      )}
      {payload.side === 'expense' && (
        <text
          x={x + width + 6}
          y={y + height / 2}
          textAnchor='start'
          dominantBaseline='middle'
          className='fill-foreground text-xs'
        >
          {label}
        </text>
      )}
    </g>
  )
}

// recharts' default link is a flat gray path with no color story - drawn
// explicitly here in the source node's color, since a link's color job is
// "which side is this flow on", the same encoding as its endpoint node.
function SankeyLinkShape(props: {
  sourceX?: number
  sourceY?: number
  sourceControlX?: number
  targetX?: number
  targetY?: number
  targetControlX?: number
  linkWidth?: number
  payload?: { source: RawNode; target: RawNode }
}) {
  const {
    sourceX,
    sourceY,
    sourceControlX,
    targetX,
    targetY,
    targetControlX,
    linkWidth,
    payload,
  } = props
  if (
    sourceX === undefined ||
    sourceY === undefined ||
    sourceControlX === undefined ||
    targetX === undefined ||
    targetY === undefined ||
    targetControlX === undefined ||
    linkWidth === undefined ||
    !payload
  ) {
    return null
  }
  const side: Side = payload.source.side === 'hub' ? payload.target.side : payload.source.side
  return (
    <path
      d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
      fill='none'
      stroke={`var(--color-${side})`}
      strokeOpacity={0.3}
      strokeWidth={linkWidth}
    />
  )
}

export function CashFlowSankeyChart({ startDate, endDate, topN }: CashFlowSankeyChartProps) {
  const { t } = useTranslation()
  const { currency } = useCurrency()
  const { data, isLoading, error, mutate } = useCashFlowSankey(startDate, endDate, topN)

  const chartData = useMemo(() => toChartData(data?.nodes ?? [], data?.links ?? []), [data])

  if (isLoading) {
    return <AnimateSpinner size={48} />
  }

  if (error && !data) {
    return <LoadError inline what={t('loadError.chart')} onRetry={() => void mutate()} />
  }

  if (!chartData.nodes.length) {
    return (
      <EmptyPlaceholder
        icon={<Waves className='w-12 h-12' />}
        title={t('insights.cashFlowEmptyTitle')}
        description={t('insights.cashFlowEmptyDescription')}
      />
    )
  }

  return (
    <ChartContainer config={chartConfig} className='aspect-auto h-[360px] w-full'>
      <Sankey
        data={chartData}
        node={<SankeyNodeShape currencyCode={currency.code} />}
        link={<SankeyLinkShape />}
        nodePadding={24}
        margin={{ top: 8, right: 140, bottom: 8, left: 140 }}
      />
    </ChartContainer>
  )
}
