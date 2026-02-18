import { useState, useEffect } from 'react'
import type { DailySpendingPoint, UsageStats } from '../../types/index'
import * as api from '../../services/api'
import { useSettingsStore } from '../../stores/settingsStore'

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

function formatCost(cost: number): string {
  if (cost === 0) return '$0.00'
  if (cost < 0.001) return `$${cost.toFixed(6)}`
  if (cost < 0.01) return `$${cost.toFixed(4)}`
  if (cost < 1) return `$${cost.toFixed(3)}`
  return `$${cost.toFixed(2)}`
}

function generateUsageCSV(
  stats: UsageStats,
  daily: DailySpendingPoint[] | null,
): string {
  const lines: string[] = []

  // Summary section
  lines.push('Section,Metric,Value')
  lines.push(`Summary,Total Prompt Tokens,${stats.totalPromptTokens}`)
  lines.push(`Summary,Total Completion Tokens,${stats.totalCompletionTokens}`)
  lines.push(`Summary,Total Cost,${stats.totalCost.toFixed(6)}`)
  lines.push('')

  // By model
  lines.push('Model,Prompt Tokens,Completion Tokens,Cost,Request Count')
  for (const m of stats.byModel) {
    lines.push(
      `"${m.model}",${m.promptTokens},${m.completionTokens},${m.cost.toFixed(6)},${m.count}`,
    )
  }
  lines.push('')

  // Top conversations
  lines.push('Conversation,Total Tokens,Cost')
  for (const c of stats.topConversations) {
    lines.push(
      `"${c.title.replace(/"/g, '""')}",${c.totalTokens},${c.cost.toFixed(6)}`,
    )
  }

  // Daily spending if available
  if (daily && daily.length > 0) {
    lines.push('')
    lines.push('Date,Prompt Tokens,Completion Tokens,Cost')
    for (const d of daily) {
      lines.push(
        `${d.date},${d.promptTokens},${d.completionTokens},${d.cost.toFixed(6)}`,
      )
    }
  }

  return lines.join('\n')
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function SpendingChart({
  data,
  dailyBudget,
}: {
  data: DailySpendingPoint[]
  dailyBudget: number | null
}) {
  const maxCost = Math.max(...data.map((d) => d.cost), dailyBudget ?? 0, 0.001)

  return (
    <div>
      <h4 className="mb-2 text-sm font-medium text-fg-secondary">
        Daily Spending
      </h4>
      <div className="flex items-end gap-px" style={{ height: 120 }}>
        {data.map((d) => {
          const heightPct = (d.cost / maxCost) * 100
          const overBudget =
            dailyBudget != null && dailyBudget > 0 && d.cost > dailyBudget
          const dateLabel = d.date.slice(5) // MM-DD
          return (
            <div
              key={d.date}
              className="group relative flex flex-1 flex-col items-center justify-end"
              style={{ height: '100%' }}
            >
              <div
                className={`w-full min-h-[2px] rounded-t transition-all ${
                  overBudget ? 'bg-red-500' : 'bg-accent'
                }`}
                style={{ height: `${Math.max(heightPct, 1)}%` }}
              />
              <span className="mt-1 text-[8px] text-fg-muted truncate w-full text-center">
                {dateLabel}
              </span>
              {/* Tooltip */}
              <div className="pointer-events-none absolute bottom-full mb-1 hidden rounded bg-elevated px-2 py-1 text-[10px] text-fg-primary shadow-lg group-hover:block z-10 whitespace-nowrap">
                <div className="font-medium">{d.date}</div>
                <div>{formatCost(d.cost)}</div>
                <div className="text-fg-muted">
                  {formatTokens(d.promptTokens + d.completionTokens)} tokens
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {/* Budget line indicator */}
      {dailyBudget != null && dailyBudget > 0 && (
        <div className="mt-1 flex items-center gap-1 text-[10px] text-fg-muted">
          <div className="h-px flex-1 border-t border-dashed border-red-500/50" />
          <span>Budget: {formatCost(dailyBudget)}</span>
        </div>
      )}
    </div>
  )
}

export function UsageDashboard() {
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [dailyData, setDailyData] = useState<DailySpendingPoint[] | null>(null)
  const dailyBudget = useSettingsStore((s) => s.settings.daily_budget)

  useEffect(() => {
    setLoading(true)
    api
      .getUsage(period)
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [period])

  // Fetch daily spending data when period is week or month
  useEffect(() => {
    if (period === 'week' || period === 'month') {
      const days = period === 'week' ? 7 : 30
      api
        .getDailySpending(days)
        .then(setDailyData)
        .catch(() => setDailyData(null))
    } else {
      setDailyData(null)
    }
  }, [period])

  const handleExportCSV = () => {
    if (!stats) return
    const csv = generateUsageCSV(stats, dailyData)
    const dateSuffix = new Date().toISOString().slice(0, 10)
    downloadCSV(csv, `chatgraph-usage-${period}-${dateSuffix}.csv`)
  }

  const PERIODS: Array<{ value: typeof period; label: string }> = [
    { value: 'day', label: 'Today' },
    { value: 'week', label: '7 days' },
    { value: 'month', label: '30 days' },
    { value: 'all', label: 'All time' },
  ]

  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-fg-muted">
        Loading usage data...
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="py-8 text-center text-sm text-fg-muted">
        No usage data available.
      </div>
    )
  }

  const maxModelTokens = Math.max(
    ...stats.byModel.map((m) => m.promptTokens + m.completionTokens),
    1,
  )

  return (
    <div className="space-y-4">
      {/* Period selector + CSV export */}
      <div className="flex items-center border-b border-border">
        <div className="flex flex-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                period === p.value
                  ? 'border-b-2 border-accent text-accent'
                  : 'text-fg-muted hover:text-fg-primary'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-fg-muted hover:bg-elevated hover:text-fg-primary transition-colors"
          title="Export usage data as CSV"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          CSV
        </button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-lg bg-accent-muted p-3">
          <p className="text-xs text-accent">Prompt Tokens</p>
          <p className="text-lg font-semibold text-fg-primary">
            {formatTokens(stats.totalPromptTokens)}
          </p>
        </div>
        <div className="rounded-lg bg-success/10 p-3">
          <p className="text-xs text-success">Completion Tokens</p>
          <p className="text-lg font-semibold text-fg-primary">
            {formatTokens(stats.totalCompletionTokens)}
          </p>
        </div>
        <div className="rounded-lg bg-elevated p-3">
          <p className="text-xs text-fg-muted">Total</p>
          <p className="text-lg font-semibold text-fg-primary">
            {formatTokens(
              stats.totalPromptTokens + stats.totalCompletionTokens,
            )}
          </p>
        </div>
        <div className="rounded-lg bg-orange-500/10 p-3">
          <p className="text-xs text-orange-500">Total Cost</p>
          <p className="text-lg font-semibold text-fg-primary">
            {formatCost(stats.totalCost)}
          </p>
        </div>
      </div>

      {/* Budget progress (daily view only) */}
      {period === 'day' && dailyBudget != null && (dailyBudget as number) > 0 && (() => {
        const budget = dailyBudget as number
        const ratio = Math.min(stats.totalCost / budget, 1)
        const pct = Math.round(ratio * 100)
        const barColor = ratio >= 1 ? 'bg-destructive' : ratio >= 0.8 ? 'bg-warning' : 'bg-success'
        return (
          <div>
            <div className="flex items-center justify-between text-xs text-fg-muted mb-1">
              <span>Daily Budget</span>
              <span>{formatCost(stats.totalCost)} / {formatCost(budget)} ({pct}%)</span>
            </div>
            <div className="h-2.5 rounded-full bg-elevated">
              <div
                className={`h-2.5 rounded-full transition-all ${barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })()}

      {/* Daily spending chart */}
      {dailyData && dailyData.length > 0 && (
        <SpendingChart
          data={dailyData}
          dailyBudget={
            dailyBudget != null && (dailyBudget as number) > 0
              ? (dailyBudget as number)
              : null
          }
        />
      )}

      {/* By model */}
      {stats.byModel.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-medium text-fg-secondary">
            By Model
          </h4>
          <div className="space-y-2">
            {stats.byModel.map((m) => {
              const total = m.promptTokens + m.completionTokens
              const pct = (total / maxModelTokens) * 100
              return (
                <div key={m.model}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="truncate text-fg-secondary">
                      {m.model}
                    </span>
                    <span className="ml-2 whitespace-nowrap text-fg-muted">
                      {formatTokens(total)} ({m.count})
                      {m.cost > 0 && (
                        <span className="ml-1 text-orange-500">
                          {formatCost(m.cost)}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="mt-0.5 h-2 rounded-full bg-elevated">
                    <div
                      className="h-2 rounded-full bg-accent"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Top conversations */}
      {stats.topConversations.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-medium text-fg-secondary">
            Top Conversations
          </h4>
          <div className="space-y-1">
            {stats.topConversations.map((c) => (
              <div
                key={c.conversationId}
                className="flex items-center justify-between rounded px-2 py-1 text-xs hover:bg-elevated"
              >
                <span className="truncate text-fg-secondary">
                  {c.title}
                </span>
                <span className="ml-2 whitespace-nowrap text-fg-muted">
                  {formatTokens(c.totalTokens)}
                  {c.cost > 0 && (
                    <span className="ml-1 text-orange-500">
                      {formatCost(c.cost)}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cost Comparison */}
      <CostComparison stats={stats} />
    </div>
  )
}

function CostComparison({ stats }: { stats: UsageStats }) {
  const models = useSettingsStore((s) => s.models)

  if (stats.totalPromptTokens === 0 && stats.totalCompletionTokens === 0) {
    return null
  }

  const estimates = models
    .filter((m) => m.pricing)
    .map((m) => {
      const promptPrice = parseFloat(m.pricing!.prompt) || 0
      const completionPrice = parseFloat(m.pricing!.completion) || 0
      const estimated =
        stats.totalPromptTokens * promptPrice +
        stats.totalCompletionTokens * completionPrice
      return { id: m.id, name: m.name, estimated }
    })
    .sort((a, b) => a.estimated - b.estimated)
    .slice(0, 15)

  if (estimates.length === 0) return null

  const actual = stats.totalCost
  const cheapestCost = estimates[0]?.estimated ?? 0

  return (
    <div>
      <h4 className="mb-2 text-sm font-medium text-fg-secondary">
        Cost Comparison
      </h4>
      <p className="mb-2 text-[10px] text-fg-muted">
        Estimated cost if all {formatTokens(stats.totalPromptTokens + stats.totalCompletionTokens)} tokens
        were processed by each model
      </p>
      <div className="space-y-1">
        {estimates.map((e) => {
          const diff = actual > 0 ? ((e.estimated - actual) / actual) * 100 : 0
          const isCheapest = e.estimated === cheapestCost
          return (
            <div
              key={e.id}
              className={`flex items-center justify-between rounded px-2 py-1 text-xs ${
                isCheapest ? 'bg-green-500/10' : 'hover:bg-elevated'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                {isCheapest && (
                  <span className="shrink-0 rounded bg-green-500/20 px-1 py-0.5 text-[9px] font-medium text-green-600 dark:text-green-400">
                    Cheapest
                  </span>
                )}
                <span className="truncate text-fg-secondary">{e.name}</span>
              </div>
              <div className="ml-2 flex items-center gap-2 whitespace-nowrap">
                <span className="text-fg-muted">{formatCost(e.estimated)}</span>
                {actual > 0 && (
                  <span
                    className={`text-[10px] font-medium ${
                      diff < 0 ? 'text-green-500' : diff > 0 ? 'text-red-500' : 'text-fg-muted'
                    }`}
                  >
                    {diff > 0 ? '+' : ''}
                    {diff.toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
