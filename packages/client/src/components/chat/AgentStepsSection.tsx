import { useState } from 'react'
import { Wrench, ChevronDown, ChevronUp, Check, X, Loader2 } from 'lucide-react'
import type { AgentStep } from '../../types/index'

interface AgentStepsSectionProps {
  steps: AgentStep[]
}

export function AgentStepsSection({ steps }: AgentStepsSectionProps) {
  const [expanded, setExpanded] = useState(false)

  if (steps.length === 0) return null

  const completedCount = steps.filter((s) => s.status === 'completed').length
  const failedCount = steps.filter((s) => s.status === 'failed').length

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-400 transition-colors"
      >
        <Wrench size={12} />
        <span className="font-medium">
          {steps.length} tool call{steps.length > 1 ? 's' : ''}
          {failedCount > 0 && ` (${failedCount} failed)`}
        </span>
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {expanded && (
        <div className="mt-1.5 space-y-1.5">
          {steps.map((step) => (
            <StepCard key={step.id} step={step} />
          ))}
        </div>
      )}
    </div>
  )
}

function StepCard({ step }: { step: AgentStep }) {
  const [detailOpen, setDetailOpen] = useState(false)

  const StatusIcon = step.status === 'running' ? Loader2
    : step.status === 'completed' ? Check
    : step.status === 'failed' ? X
    : null

  return (
    <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] overflow-hidden">
      <button
        onClick={() => setDetailOpen(!detailOpen)}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left"
      >
        {StatusIcon ? (
          <StatusIcon
            size={12}
            className={`shrink-0 ${
              step.status === 'running' ? 'animate-spin text-blue-500'
                : step.status === 'completed' ? 'text-green-500'
                : 'text-red-500'
            }`}
          />
        ) : (
          <div className="h-2 w-2 rounded-full bg-fg-muted/30 shrink-0" />
        )}
        <span className="flex-1 truncate font-mono text-xs text-fg-secondary">{step.name}</span>
        {step.duration != null && (
          <span className="text-[10px] text-fg-muted">{step.duration}ms</span>
        )}
        {(step.input || step.output) && (
          detailOpen ? <ChevronUp size={10} className="text-fg-muted" /> : <ChevronDown size={10} className="text-fg-muted" />
        )}
      </button>

      {detailOpen && (step.input || step.output) && (
        <div className="border-t border-[var(--glass-border)] px-2.5 py-1.5 space-y-1">
          {step.input && (
            <div>
              <span className="text-[10px] font-medium text-fg-muted">Input:</span>
              <pre className="mt-0.5 text-[10px] text-fg-secondary font-mono overflow-x-auto max-h-20 overflow-y-auto whitespace-pre-wrap">{step.input}</pre>
            </div>
          )}
          {step.output && (
            <div>
              <span className="text-[10px] font-medium text-fg-muted">Output:</span>
              <pre className="mt-0.5 text-[10px] text-fg-secondary font-mono overflow-x-auto max-h-20 overflow-y-auto whitespace-pre-wrap">{step.output}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
