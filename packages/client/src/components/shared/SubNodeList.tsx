import { useState } from 'react'
import { Check, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

export interface SubNodeItem {
  id: string
  label: string
  status?: 'pending' | 'running' | 'completed' | 'failed'
  detail?: string
}

interface SubNodeListProps {
  items: SubNodeItem[]
  variant: 'agent' | 'thinking'
  compact?: boolean
  limit?: number
}

const STATUS_ICONS = {
  pending: null,
  running: Loader2,
  completed: Check,
  failed: X,
}

const STATUS_COLORS = {
  pending: 'bg-fg-muted/30',
  running: 'bg-blue-500',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
}

const VARIANT_COLORS = {
  agent: {
    border: 'border-l-blue-400/40',
    badge: 'bg-blue-500/10 text-blue-500',
    text: 'text-blue-400',
  },
  thinking: {
    border: 'border-l-purple-400/40',
    badge: 'bg-purple-500/10 text-purple-500',
    text: 'text-purple-400',
  },
}

export function SubNodeList({ items, variant, compact, limit = 5 }: SubNodeListProps) {
  const [expanded, setExpanded] = useState(false)
  const colors = VARIANT_COLORS[variant]

  const visibleItems = expanded ? items : items.slice(0, limit)
  const hiddenCount = items.length - limit

  if (items.length === 0) return null

  return (
    <div className={`mt-1 border-l-2 ${colors.border} pl-2 space-y-0.5`}>
      {visibleItems.map((item) => {
        const StatusIcon = item.status ? STATUS_ICONS[item.status] : null
        const dotColor = item.status ? STATUS_COLORS[item.status] : STATUS_COLORS.pending

        return (
          <div
            key={item.id}
            className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] ${
              compact ? '' : 'border border-[var(--glass-border)] bg-[var(--glass-bg)]'
            }`}
          >
            {StatusIcon ? (
              <StatusIcon
                size={8}
                className={`shrink-0 ${
                  item.status === 'running' ? 'animate-spin text-blue-500' : `text-${item.status === 'completed' ? 'green' : 'red'}-500`
                }`}
              />
            ) : (
              <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotColor}`} />
            )}
            <span className="truncate text-fg-secondary font-mono">{item.label}</span>
          </div>
        )
      })}
      {hiddenCount > 0 && !expanded && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(true) }}
          className={`text-[9px] ${colors.text} hover:underline`}
        >
          +{hiddenCount} more
        </button>
      )}
      {expanded && hiddenCount > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(false) }}
          className={`text-[9px] ${colors.text} hover:underline`}
        >
          Show less
        </button>
      )}
    </div>
  )
}
