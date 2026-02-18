import { useState } from 'react'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import {
  X,
  Brain,
  CheckCircle,
  HelpCircle,
  ListTodo,
  Activity,
  ChevronDown,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import type { ConversationAnalytics } from '../../types/index'
import { useConversationStore } from '../../stores/conversationStore'
import { useUIStore } from '../../stores/uiStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { modalOverlay, modalContent, EASE_OUT_FAST } from '../../utils/animations'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import * as api from '../../services/api'

type AnalysisScope = 'tree' | 'path'

function HealthGauge({ score }: { score: number }) {
  const pct = (score / 10) * 100
  const color =
    score >= 7 ? 'text-green-500' : score >= 4 ? 'text-yellow-500' : 'text-red-500'
  const bgColor =
    score >= 7 ? 'bg-green-500' : score >= 4 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-3 flex-1 rounded-full bg-elevated">
        <div
          className={`h-3 rounded-full ${bgColor} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-lg font-bold ${color}`}>{score}/10</span>
    </div>
  )
}

function CollapsibleSection({
  title,
  icon: Icon,
  items,
  emptyText,
  iconColor,
}: {
  title: string
  icon: LucideIcon
  items: string[]
  emptyText: string
  iconColor: string
}) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="rounded-lg border border-border bg-surface">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-fg-secondary hover:bg-elevated transition-colors"
      >
        <Icon size={14} className={iconColor} />
        <span className="flex-1">{title}</span>
        <span className="text-xs text-fg-muted">{items.length}</span>
        {expanded ? (
          <ChevronDown size={14} className="text-fg-muted" />
        ) : (
          <ChevronRight size={14} className="text-fg-muted" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-border px-3 py-2">
          {items.length === 0 ? (
            <p className="text-xs text-fg-muted italic">{emptyText}</p>
          ) : (
            <ul className="space-y-1">
              {items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-fg-secondary">
                  <span className="mt-0.5 text-fg-muted">-</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export function AnalyticsPanel() {
  const setAnalyticsOpen = useUIStore((s) => s.setAnalyticsOpen)
  const activeConversationId = useConversationStore((s) => s.activeConversationId)
  const activeNodeId = useConversationStore((s) => s.activeNodeId)
  const selectedModel = useUIStore((s) => s.selectedModel)
  const models = useSettingsStore((s) => s.models)

  const [scope, setScope] = useState<AnalysisScope>('tree')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ConversationAnalytics | null>(null)

  const handleAnalyze = async () => {
    if (!activeConversationId) return
    setLoading(true)
    setError(null)
    try {
      const targetNodeId = scope === 'path' ? (activeNodeId ?? undefined) : undefined
      const analytics = await api.analyzeConversation(
        activeConversationId,
        selectedModel,
        targetNodeId,
      )
      setResult(analytics)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  // Find model display name
  const modelName = models.find((m) => m.id === selectedModel)?.name ?? selectedModel

  return (
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-black/50"
        variants={modalOverlay}
        initial="initial"
        animate="animate"
        exit="exit"
        onClick={() => setAnalyticsOpen(false)}
      />
      <motion.div
        className="fixed right-0 top-0 z-50 flex h-full w-[480px] max-w-[90vw] flex-col border-l border-border bg-page shadow-xl"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={EASE_OUT_FAST}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Brain size={18} className="text-accent" />
            <h2 className="text-sm font-semibold text-fg-primary">
              Conversation Analytics
            </h2>
          </div>
          <IconButton
            onClick={() => setAnalyticsOpen(false)}
            aria-label="Close"
            size="sm"
          >
            <X size={16} />
          </IconButton>
        </div>

        {/* Controls */}
        <div className="space-y-3 border-b border-border px-4 py-3">
          {/* Scope toggle */}
          <div className="flex rounded-lg border border-border">
            <button
              onClick={() => setScope('tree')}
              className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                scope === 'tree'
                  ? 'bg-accent text-accent-text'
                  : 'text-fg-muted hover:text-fg-primary'
              } rounded-l-lg`}
            >
              Full Tree
            </button>
            <button
              onClick={() => setScope('path')}
              className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                scope === 'path'
                  ? 'bg-accent text-accent-text'
                  : 'text-fg-muted hover:text-fg-primary'
              } rounded-r-lg`}
            >
              Active Path
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-fg-muted">Using:</span>
            <span className="truncate rounded bg-elevated px-2 py-0.5 text-xs text-fg-secondary">
              {modelName}
            </span>
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={loading || !activeConversationId}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain size={14} className="mr-2" />
                Analyze
              </>
            )}
          </Button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          {result && !loading && (
            <div className="space-y-4">
              {/* Health Score */}
              <div className="rounded-lg border border-border bg-surface p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Activity size={14} className="text-accent" />
                  <span className="text-sm font-medium text-fg-secondary">
                    Health Score
                  </span>
                </div>
                <HealthGauge score={result.healthScore} />
                {result.healthAssessment && (
                  <p className="mt-2 text-xs text-fg-muted">
                    {result.healthAssessment}
                  </p>
                )}
              </div>

              {/* Stats badges */}
              <div className="flex gap-2">
                <div className="rounded-lg bg-elevated px-3 py-1.5 text-xs text-fg-secondary">
                  {result.nodeCount} nodes
                </div>
                <div className="rounded-lg bg-elevated px-3 py-1.5 text-xs text-fg-secondary">
                  {result.branchCount} branches
                </div>
                <div className="rounded-lg bg-elevated px-3 py-1.5 text-xs text-fg-secondary">
                  {result.modelsMentioned.length} models
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-lg border border-border bg-surface p-3">
                <h4 className="mb-1 text-xs font-medium text-fg-muted">
                  Summary
                </h4>
                <p className="text-sm text-fg-secondary">{result.summary}</p>
              </div>

              {/* Collapsible sections */}
              <CollapsibleSection
                title="Key Decisions"
                icon={CheckCircle}
                items={result.decisions}
                emptyText="No key decisions identified"
                iconColor="text-green-500"
              />

              <CollapsibleSection
                title="Open Questions"
                icon={HelpCircle}
                items={result.openQuestions}
                emptyText="No open questions found"
                iconColor="text-yellow-500"
              />

              <CollapsibleSection
                title="Action Items"
                icon={ListTodo}
                items={result.actionItems}
                emptyText="No action items identified"
                iconColor="text-blue-500"
              />
            </div>
          )}

          {!result && !loading && !error && (
            <div className="flex flex-col items-center justify-center py-12 text-fg-muted">
              <Brain size={32} strokeWidth={1.5} className="mb-2 opacity-50" />
              <p className="text-sm">
                Click Analyze to get AI-powered insights
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
}
