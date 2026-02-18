import { useMemo, useState } from 'react'
import { BarChart3, Zap, Clock, DollarSign, Hash, ArrowUpDown, type LucideIcon } from 'lucide-react'
import { useTournamentStore } from '../../stores/tournamentStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { formatCost, estimateTokens, formatDuration } from '../../utils/cost'

type SortKey = 'ttft' | 'total' | 'tokens' | 'cost' | 'throughput'

interface ModelMetrics {
  model: string
  status: 'done' | 'error'
  ttft: number | null
  totalDuration: number | null
  tokens: number
  cost: number
  throughput: number | null
}

export function TournamentComparison() {
  const models = useTournamentStore((s) => s.models)
  const allModels = useSettingsStore((s) => s.models)
  const [sortKey, setSortKey] = useState<SortKey>('total')
  const [sortAsc, setSortAsc] = useState(true)

  const metrics: ModelMetrics[] = useMemo(() => {
    return models.map((m) => {
      const tokenCount = m.node?.metadata
        ? ((m.node.metadata as Record<string, unknown>).usage as
            | { completion_tokens?: number }
            | undefined)?.completion_tokens ?? estimateTokens(m.content)
        : estimateTokens(m.content)

      let cost = 0
      const modelData = allModels.find((am) => am.id === m.model)
      if (modelData?.pricing && m.node?.metadata) {
        const usage = (m.node.metadata as Record<string, unknown>).usage as
          | { prompt_tokens?: number; completion_tokens?: number }
          | undefined
        if (usage) {
          const promptPrice = parseFloat(modelData.pricing.prompt) || 0
          const completionPrice = parseFloat(modelData.pricing.completion) || 0
          cost =
            (usage.prompt_tokens ?? 0) * promptPrice +
            (usage.completion_tokens ?? 0) * completionPrice
        }
      }

      const totalMs = m.timing?.totalDuration ?? null
      const throughput =
        totalMs && totalMs > 0 ? (tokenCount / totalMs) * 1000 : null

      return {
        model: m.model,
        status: m.status === 'error' ? 'error' : 'done',
        ttft: m.timing?.ttft ?? null,
        totalDuration: totalMs,
        tokens: tokenCount,
        cost,
        throughput,
      }
    })
  }, [models, allModels])

  const sorted = useMemo(() => {
    const arr = [...metrics]
    arr.sort((a, b) => {
      // Errors always go to the bottom
      if (a.status === 'error' && b.status !== 'error') return 1
      if (b.status === 'error' && a.status !== 'error') return -1

      let aVal: number
      let bVal: number
      switch (sortKey) {
        case 'ttft':
          aVal = a.ttft ?? Infinity
          bVal = b.ttft ?? Infinity
          break
        case 'total':
          aVal = a.totalDuration ?? Infinity
          bVal = b.totalDuration ?? Infinity
          break
        case 'tokens':
          aVal = a.tokens
          bVal = b.tokens
          break
        case 'cost':
          aVal = a.cost
          bVal = b.cost
          break
        case 'throughput':
          aVal = a.throughput ?? 0
          bVal = b.throughput ?? 0
          break
      }
      return sortAsc ? aVal - bVal : bVal - aVal
    })
    return arr
  }, [metrics, sortKey, sortAsc])

  // Find best values (among done models)
  const doneMetrics = metrics.filter((m) => m.status === 'done')
  const best = useMemo(() => {
    if (doneMetrics.length === 0)
      return {
        ttft: null as string | null,
        cost: null as string | null,
        throughput: null as string | null,
      }
    const fastestTtft = doneMetrics.reduce(
      (best, m) =>
        m.ttft !== null && (best === null || m.ttft < best) ? m.ttft : best,
      null as number | null,
    )
    const cheapest = doneMetrics.reduce(
      (best, m) => (best === null || m.cost < best ? m.cost : best),
      null as number | null,
    )
    const bestThroughput = doneMetrics.reduce(
      (best, m) =>
        m.throughput !== null && (best === null || m.throughput > best)
          ? m.throughput
          : best,
      null as number | null,
    )
    return {
      ttft: fastestTtft,
      cost: cheapest,
      throughput: bestThroughput,
    }
  }, [doneMetrics])

  // Quick insight line
  const insights: string[] = []
  if (best.ttft !== null) {
    const fastestModel = doneMetrics.find((m) => m.ttft === best.ttft)
    if (fastestModel) insights.push(`Fastest TTFT: ${shortName(fastestModel.model)}`)
  }
  if (best.cost !== null) {
    const cheapestModel = doneMetrics.find((m) => m.cost === best.cost)
    if (cheapestModel) insights.push(`Cheapest: ${shortName(cheapestModel.model)}`)
  }
  if (best.throughput !== null) {
    const fastModel = doneMetrics.find((m) => m.throughput === best.throughput)
    if (fastModel) insights.push(`Best throughput: ${shortName(fastModel.model)}`)
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  if (doneMetrics.length < 2) return null

  return (
    <div className="border-t border-border">
      <div className="flex items-center gap-1.5 px-4 py-2">
        <BarChart3 size={13} className="text-amber-500" />
        <span className="text-xs font-medium text-fg-secondary">
          Comparison
        </span>
      </div>
      <div className="overflow-x-auto px-4 pb-3">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-fg-muted">
              <th className="pb-1.5 pr-2 text-left font-medium">Model</th>
              <SortHeader
                label="TTFT"
                icon={Zap}
                sortKey="ttft"
                currentKey={sortKey}
                asc={sortAsc}
                onSort={handleSort}
              />
              <SortHeader
                label="Total"
                icon={Clock}
                sortKey="total"
                currentKey={sortKey}
                asc={sortAsc}
                onSort={handleSort}
              />
              <SortHeader
                label="Tokens"
                icon={Hash}
                sortKey="tokens"
                currentKey={sortKey}
                asc={sortAsc}
                onSort={handleSort}
              />
              <SortHeader
                label="Cost"
                icon={DollarSign}
                sortKey="cost"
                currentKey={sortKey}
                asc={sortAsc}
                onSort={handleSort}
              />
              <SortHeader
                label="tok/s"
                icon={ArrowUpDown}
                sortKey="throughput"
                currentKey={sortKey}
                asc={sortAsc}
                onSort={handleSort}
              />
            </tr>
          </thead>
          <tbody>
            {sorted.map((m) => (
              <tr
                key={m.model}
                className={m.status === 'error' ? 'text-fg-muted' : 'text-fg-secondary'}
              >
                <td className="py-1 pr-2 font-medium truncate max-w-[120px]">
                  {shortName(m.model)}
                </td>
                <td className={cellClass(m.ttft === best.ttft && m.status === 'done')}>
                  {m.status === 'error'
                    ? 'Error'
                    : m.ttft !== null
                      ? formatDuration(m.ttft)
                      : '-'}
                </td>
                <td className={cellClass(false)}>
                  {m.status === 'error'
                    ? ''
                    : m.totalDuration !== null
                      ? formatDuration(m.totalDuration)
                      : '-'}
                </td>
                <td className={cellClass(false)}>
                  {m.status === 'error' ? '' : m.tokens.toLocaleString()}
                </td>
                <td className={cellClass(m.cost === best.cost && m.status === 'done')}>
                  {m.status === 'error' ? '' : formatCost(m.cost) || '$0'}
                </td>
                <td
                  className={cellClass(
                    m.throughput === best.throughput && m.status === 'done',
                  )}
                >
                  {m.status === 'error'
                    ? ''
                    : m.throughput !== null
                      ? m.throughput.toFixed(1)
                      : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {insights.length > 0 && (
        <div className="border-t border-border px-4 py-1.5 text-[10px] text-fg-muted">
          {insights.join(' · ')}
        </div>
      )}
    </div>
  )
}

function shortName(modelId: string): string {
  const parts = modelId.split('/')
  return parts[parts.length - 1] ?? modelId
}

function cellClass(isBest: boolean): string {
  return `py-1 pr-2 tabular-nums text-right ${isBest ? 'text-green-500 font-semibold' : ''}`
}

function SortHeader({
  label,
  icon: Icon,
  sortKey,
  currentKey,
  asc,
  onSort,
}: {
  label: string
  icon: LucideIcon
  sortKey: SortKey
  currentKey: SortKey
  asc: boolean
  onSort: (key: SortKey) => void
}) {
  const isActive = currentKey === sortKey
  return (
    <th className="pb-1.5 pr-2 text-right font-medium">
      <button
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-0.5 transition-colors hover:text-fg-primary ${isActive ? 'text-accent' : ''}`}
      >
        <Icon size={9} />
        {label}
        {isActive && <span className="text-[8px]">{asc ? '▲' : '▼'}</span>}
      </button>
    </th>
  )
}
