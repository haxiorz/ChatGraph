import { useMemo, useState } from 'react'
import { useActivePath } from '../../hooks/useActivePath'
import { useSettingsStore } from '../../stores/settingsStore'
import { useUIStore } from '../../stores/uiStore'
import type { ConversationNode } from '../../types/index'

interface NodeTokenInfo {
  node: ConversationNode
  tokens: number
}

const ROLE_COLORS: Record<string, string> = {
  system: 'bg-gray-500',
  user: 'bg-accent',
  assistant: 'bg-green-500',
}

const ROLE_LABELS: Record<string, string> = {
  system: 'SYS',
  user: 'USR',
  assistant: 'AI',
}

function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4)
}

export function ContextBar() {
  const path = useActivePath()
  const models = useSettingsStore((s) => s.models)
  const selectedModel = useUIStore((s) => s.selectedModel)
  const [expanded, setExpanded] = useState(false)

  const { totalTokens, contextLength, nodeBreakdown } = useMemo(() => {
    // Find the last assistant node with usage data for actual totals
    let total = 0
    let promptTokens = 0
    for (let i = path.length - 1; i >= 0; i--) {
      const node = path[i]!
      if (node.role === 'assistant' && node.metadata) {
        const usage = (node.metadata as Record<string, unknown>).usage as
          | { prompt_tokens?: number; completion_tokens?: number }
          | undefined
        if (usage) {
          promptTokens = usage.prompt_tokens ?? 0
          total = promptTokens + (usage.completion_tokens ?? 0)
          break
        }
      }
    }

    const model = models.find((m) => m.id === selectedModel)

    // Compute per-node token estimates
    const breakdown: NodeTokenInfo[] = []
    let rawTotal = 0

    for (const node of path) {
      let tokens: number
      if (node.role === 'assistant' && node.metadata) {
        const usage = (node.metadata as Record<string, unknown>).usage as
          | { completion_tokens?: number }
          | undefined
        tokens = usage?.completion_tokens ?? estimateTokens(node.content)
      } else {
        tokens = estimateTokens(node.content)
      }
      rawTotal += tokens
      breakdown.push({ node, tokens })
    }

    // Scale proportionally to match actual prompt_tokens total
    if (rawTotal > 0 && promptTokens > 0) {
      const scale = promptTokens / rawTotal
      for (const entry of breakdown) {
        entry.tokens = Math.round(entry.tokens * scale)
      }
    }

    return {
      totalTokens: total,
      contextLength: model?.context_length ?? 0,
      nodeBreakdown: breakdown,
    }
  }, [path, models, selectedModel])

  if (totalTokens === 0 || contextLength === 0) return null

  const ratio = totalTokens / contextLength
  const percent = Math.min(ratio * 100, 100)

  // Smooth gradient color: accent → warning → destructive
  let barGradient = 'from-accent to-accent'
  if (ratio > 0.8) barGradient = 'from-warning to-destructive'
  else if (ratio > 0.5) barGradient = 'from-accent to-warning'

  // Compute total estimated tokens for proportional segment widths
  const totalEstimated = nodeBreakdown.reduce((sum, e) => sum + e.tokens, 0)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-1">
      {/* Clickable bar area */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 text-xs text-fg-muted group"
      >
        {/* Segmented progress bar — thicker */}
        <div
          className="h-1.5 flex-1 rounded-full bg-elevated overflow-hidden flex"
          title={`${totalTokens.toLocaleString()} / ${contextLength.toLocaleString()} tokens (${Math.round(percent)}%)`}
        >
          {totalEstimated > 0 ? (
            nodeBreakdown.map((entry, i) => {
              const meta = (entry.node.metadata ?? {}) as Record<string, unknown>
              const isExcluded = meta.excludeFromContext === true
              const segWidth = (entry.tokens / contextLength) * 100
              if (segWidth < 0.1) return null
              return (
                <div
                  key={entry.node.id}
                  className={`h-full transition-all duration-300 ${
                    isExcluded
                      ? 'bg-red-400/30'
                      : (ROLE_COLORS[entry.node.role] ?? 'bg-accent')
                  } ${i === 0 ? 'rounded-l-full' : ''}`}
                  style={{ width: `${segWidth}%` }}
                />
              )
            })
          ) : (
            <div
              className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-500`}
              style={{ width: `${percent}%` }}
            />
          )}
        </div>
        <span className="shrink-0 tabular-nums text-xs">
          {totalTokens.toLocaleString()} / {contextLength.toLocaleString()}
        </span>
        {/* Expand chevron */}
        <svg
          className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Expanded per-node breakdown */}
      {expanded && nodeBreakdown.length > 0 && (
        <div className="glass mt-2 max-h-48 space-y-1 overflow-y-auto rounded-xl border border-[var(--glass-border)] p-3">
          {/* Legend */}
          <div className="flex gap-3 pb-1 border-b border-[var(--glass-border)] mb-1">
            {(['system', 'user', 'assistant'] as const).map((role) => (
              <div key={role} className="flex items-center gap-1 text-[10px] text-fg-muted">
                <div className={`h-2 w-2 rounded-full ${ROLE_COLORS[role]}`} />
                {ROLE_LABELS[role]}
              </div>
            ))}
          </div>
          {nodeBreakdown.map((entry) => {
            const meta = (entry.node.metadata ?? {}) as Record<string, unknown>
            const isExcluded = meta.excludeFromContext === true
            const preview =
              entry.node.content.length > 80
                ? entry.node.content.slice(0, 80) + '...'
                : entry.node.content
            const barPct =
              totalEstimated > 0
                ? Math.max((entry.tokens / totalEstimated) * 100, 1)
                : 0
            return (
              <div key={entry.node.id} className={`flex items-center gap-2 ${isExcluded ? 'opacity-40' : ''}`}>
                {/* Role badge */}
                <span
                  className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-medium text-white ${
                    ROLE_COLORS[entry.node.role] ?? 'bg-gray-500'
                  }`}
                >
                  {ROLE_LABELS[entry.node.role] ?? entry.node.role}
                </span>
                {/* Mini bar */}
                <div className="h-1 w-12 shrink-0 rounded-full bg-elevated overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      isExcluded ? 'bg-red-400' : (ROLE_COLORS[entry.node.role] ?? 'bg-accent')
                    }`}
                    style={{ width: `${barPct}%` }}
                  />
                </div>
                {/* Token count */}
                <span className={`shrink-0 w-10 text-right text-[10px] tabular-nums text-fg-muted ${isExcluded ? 'line-through' : ''}`}>
                  {entry.tokens.toLocaleString()}
                </span>
                {/* Content preview */}
                <span className={`truncate text-[10px] text-fg-muted ${isExcluded ? 'line-through' : ''}`}>
                  {isExcluded ? '[excluded] ' : ''}{preview}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
