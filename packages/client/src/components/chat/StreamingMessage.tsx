import { useState } from 'react'
import { Sparkles, Brain, ChevronDown, ChevronUp, Wrench } from 'lucide-react'
import { MarkdownRenderer } from './MarkdownRenderer'
import { CostTicker } from './CostTicker'
import type { AgentStep } from '../../types/index'

interface StreamingMessageProps {
  content: string
  thinkingContent?: string
  agentSteps?: AgentStep[]
}

export function StreamingMessage({ content, thinkingContent, agentSteps }: StreamingMessageProps) {
  const [thinkingExpanded, setThinkingExpanded] = useState(true)
  const [stepsExpanded, setStepsExpanded] = useState(true)

  return (
    <div className="group">
      {/* Header row */}
      <div className="mb-2 flex items-center gap-2">
        <div
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-500/15"
          style={{ animation: content ? undefined : 'pulse-glow 2s ease-in-out infinite' }}
        >
          <Sparkles size={13} className="text-emerald-500" />
        </div>
        <span className="text-sm font-medium text-fg-primary">Assistant</span>
      </div>

      {/* Thinking section */}
      {thinkingContent && (
        <div className="pl-8 mb-2">
          <button
            onClick={() => setThinkingExpanded(!thinkingExpanded)}
            className="flex items-center gap-1.5 text-xs text-purple-500 hover:text-purple-400 transition-colors"
          >
            <Brain size={12} />
            <span className="font-medium">Thinking...</span>
            {thinkingExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {thinkingExpanded && (
            <div className="mt-1 border-l-2 border-purple-400/30 pl-3 text-xs italic text-fg-muted max-h-40 overflow-y-auto">
              {thinkingContent}
            </div>
          )}
        </div>
      )}

      {/* Agent steps section */}
      {agentSteps && agentSteps.length > 0 && (
        <div className="pl-8 mb-2">
          <button
            onClick={() => setStepsExpanded(!stepsExpanded)}
            className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-400 transition-colors"
          >
            <Wrench size={12} />
            <span className="font-medium">{agentSteps.length} tool call{agentSteps.length > 1 ? 's' : ''}</span>
            {stepsExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {stepsExpanded && (
            <div className="mt-1 space-y-1">
              {agentSteps.map((step) => (
                <div
                  key={step.id}
                  className="flex items-center gap-1.5 rounded border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2 py-1 text-xs"
                >
                  <div className={`h-1.5 w-1.5 rounded-full ${step.status === 'running' ? 'bg-blue-500 animate-pulse' : step.status === 'completed' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="font-mono text-fg-secondary">{step.name}</span>
                  <span className="text-fg-muted">{step.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content — flat, no bubble */}
      <div className="pl-8 text-sm text-fg-primary">
        {content ? (
          <div className="markdown-body">
            <MarkdownRenderer content={content} isStreaming />
          </div>
        ) : !thinkingContent ? (
          <div className="thinking-dots py-2">
            <span />
            <span />
            <span />
          </div>
        ) : null}
        {content && (
          <div className="mt-1 flex items-center gap-2">
            <span className="streaming-cursor" />
            <CostTicker />
          </div>
        )}
      </div>
    </div>
  )
}
