import { motion } from 'framer-motion'
import { X, Zap, Swords, AlertCircle, ScrollText, RefreshCw, Type, Info, Trash2, Sparkles } from 'lucide-react'
import { useActivityStore } from '../../stores/activityStore'
import type { ActivityEventType } from '../../stores/activityStore'
import { modalOverlay, EASE_OUT_FAST } from '../../utils/animations'
import { IconButton } from '../ui/IconButton'

const EVENT_ICONS: Record<ActivityEventType, typeof Zap> = {
  completion: Zap,
  error: AlertCircle,
  tournament: Swords,
  summarize: ScrollText,
  regenerate: RefreshCw,
  title: Type,
  info: Info,
  routing: Sparkles,
}

const EVENT_COLORS: Record<ActivityEventType, string> = {
  completion: 'text-green-500',
  error: 'text-red-500',
  tournament: 'text-amber-500',
  summarize: 'text-cyan-500',
  regenerate: 'text-blue-500',
  title: 'text-purple-500',
  info: 'text-fg-muted',
  routing: 'text-amber-400',
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatRelative(timestamp: number): string {
  const diff = Date.now() - timestamp
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return formatTime(timestamp)
}

export function ActivityFeed() {
  const events = useActivityStore((s) => s.events)
  const clearEvents = useActivityStore((s) => s.clearEvents)
  const setOpen = useActivityStore((s) => s.setOpen)

  return (
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-black/50"
        variants={modalOverlay}
        initial="initial"
        animate="animate"
        exit="exit"
        onClick={() => setOpen(false)}
      />
      <motion.div
        className="fixed right-0 top-0 z-50 flex h-full w-[380px] max-w-[90vw] flex-col border-l border-border bg-page shadow-xl"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={EASE_OUT_FAST}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-accent" />
            <h2 className="text-sm font-semibold text-fg-primary">
              Activity Feed
            </h2>
            <span className="rounded-full bg-elevated px-1.5 py-0.5 text-[10px] text-fg-muted">
              {events.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {events.length > 0 && (
              <IconButton
                onClick={clearEvents}
                aria-label="Clear all events"
                tooltip="Clear"
                size="sm"
              >
                <Trash2 size={14} />
              </IconButton>
            )}
            <IconButton
              onClick={() => setOpen(false)}
              aria-label="Close"
              size="sm"
            >
              <X size={16} />
            </IconButton>
          </div>
        </div>

        {/* Event list */}
        <div className="flex-1 overflow-y-auto">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-fg-muted">
              <Zap size={32} strokeWidth={1.5} className="mb-2 opacity-50" />
              <p className="text-sm">No activity yet</p>
              <p className="text-xs mt-1">Events will appear as you chat</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {events.map((event) => {
                const Icon = EVENT_ICONS[event.type]
                const color = EVENT_COLORS[event.type]
                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-elevated/50 transition-colors"
                  >
                    <Icon size={14} className={`mt-0.5 shrink-0 ${color}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-fg-secondary leading-relaxed">
                        {event.message}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="text-[10px] text-fg-muted">
                          {formatRelative(event.timestamp)}
                        </span>
                        {event.model && (
                          <span className="truncate rounded bg-elevated px-1 py-0.5 text-[9px] text-fg-muted">
                            {event.model}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
}
