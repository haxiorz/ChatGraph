import { Trophy, Clock, Zap, AlertCircle, Loader2 } from 'lucide-react'
import { useTournamentStore } from '../../stores/tournamentStore'
import { useConversationStore } from '../../stores/conversationStore'
import { MarkdownRenderer } from './MarkdownRenderer'
import { TournamentComparison } from './TournamentComparison'
import { Button } from '../ui/Button'
import { formatDuration } from '../../utils/cost'

export function TournamentPanel() {
  const models = useTournamentStore((s) => s.models)
  const setActiveNode = useConversationStore((s) => s.setActiveNode)
  const reset = useTournamentStore((s) => s.reset)

  const allDone = models.every(
    (m) => m.status === 'done' || m.status === 'error',
  )

  const handlePickWinner = (nodeId: string) => {
    setActiveNode(nodeId)
    useTournamentStore.getState().pickWinner(nodeId)
  }

  const handleCancel = () => {
    reset()
  }

  const colCount = models.length

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-amber-500" />
          <span className="text-sm font-semibold text-fg-primary">
            Tournament Mode
          </span>
          <span className="rounded bg-elevated px-2 py-0.5 text-xs text-fg-muted">
            {models.length} models
          </span>
          {!allDone && (
            <Loader2 size={14} className="animate-spin text-accent" />
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={handleCancel}>
          {allDone ? 'Close' : 'Cancel'}
        </Button>
      </div>

      {/* Columns */}
      <div className="flex flex-1 flex-col overflow-y-auto">
      <div
        className="flex-1"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${colCount}, 1fr)`,
          gap: '1px',
          background: 'var(--color-border)',
        }}
      >
        {models.map((m, idx) => (
          <div
            key={idx}
            className="flex flex-col bg-surface"
          >
            {/* Model header */}
            <div className="sticky top-0 z-10 border-b border-border bg-elevated px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="truncate text-xs font-medium text-fg-secondary">
                  {m.model}
                </span>
                {m.status === 'streaming' && (
                  <span className="ml-1 h-2 w-2 shrink-0 animate-pulse rounded-full bg-accent" />
                )}
                {m.status === 'done' && (
                  <span className="ml-1 h-2 w-2 shrink-0 rounded-full bg-green-500" />
                )}
                {m.status === 'error' && (
                  <span className="ml-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                )}
              </div>

              {/* Timing stats */}
              {m.timing && (
                <div className="mt-1 flex items-center gap-3 text-[10px] text-fg-muted">
                  <span className="flex items-center gap-0.5">
                    <Zap size={8} />
                    TTFT: {formatDuration(m.timing.ttft)}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Clock size={8} />
                    Total: {formatDuration(m.timing.totalDuration)}
                  </span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-3 py-2">
              {m.status === 'error' ? (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-2 text-xs text-destructive">
                  <AlertCircle size={12} className="mt-0.5 shrink-0" />
                  <span>{m.error}</span>
                </div>
              ) : m.content ? (
                <div className="markdown-body text-sm text-fg-primary">
                  <MarkdownRenderer content={m.content} />
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-fg-muted">
                  <Loader2 size={12} className="animate-spin" />
                  Waiting for response...
                </div>
              )}
            </div>

            {/* Pick winner button */}
            {allDone && m.status === 'done' && m.node && (
              <div className="border-t border-border px-3 py-2">
                <Button
                  className="w-full"
                  size="sm"
                  onClick={() => handlePickWinner(m.node!.id)}
                >
                  <Trophy size={12} className="mr-1.5" />
                  Pick Winner
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
      {allDone && <TournamentComparison />}
      </div>
    </div>
  )
}
