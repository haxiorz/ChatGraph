import { useState } from 'react'
import { Settings2, ChevronDown, ChevronUp, Pencil, RefreshCw, ThumbsUp, ThumbsDown, ScrollText, StickyNote, EyeOff, Expand, Sparkles, User, Brain, Wrench, Paperclip } from 'lucide-react'
import type { ConversationNode } from '../../types/index'
import { useSettingsStore } from '../../stores/settingsStore'
import { useConversationStore } from '../../stores/conversationStore'
import { formatCost } from '../../utils/cost'
import { formatFileSize } from '../../utils/format'
import { BranchNavigator } from './BranchNavigator'
import { MarkdownRenderer } from './MarkdownRenderer'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { Textarea } from '../ui/Input'

interface MessageBubbleProps {
  node: ConversationNode
  siblingIndex: number
  siblingCount: number
  isStreaming?: boolean
  onNavigateSibling: (nodeId: string, direction: -1 | 1) => void
  onRegenerate?: (assistantNodeId: string) => void
  onEditResend?: (parentId: string, content: string) => void
  onRate?: (nodeId: string, rating: 'up' | 'down' | null) => void
}

export function MessageBubble({
  node,
  siblingIndex,
  siblingCount,
  isStreaming,
  onNavigateSibling,
  onRegenerate,
  onEditResend,
  onRate,
}: MessageBubbleProps) {
  if (node.role === 'system') {
    return <SystemBubble node={node} />
  }

  if (node.role === 'user') {
    return (
      <UserBubble
        node={node}
        siblingIndex={siblingIndex}
        siblingCount={siblingCount}
        isStreaming={isStreaming}
        onNavigateSibling={onNavigateSibling}
        onEditResend={onEditResend}
      />
    )
  }

  // Assistant
  return (
    <AssistantBubble
      node={node}
      siblingIndex={siblingIndex}
      siblingCount={siblingCount}
      isStreaming={isStreaming}
      onNavigateSibling={onNavigateSibling}
      onRegenerate={onRegenerate}
      onRate={onRate}
    />
  )
}

// --- System Bubble ---
function SystemBubble({ node }: { node: ConversationNode }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="flex flex-col items-center">
      <div
        className="glass flex items-center gap-2 rounded-lg border border-[var(--glass-border)] px-4 py-2 text-xs text-fg-muted cursor-pointer hover:bg-[var(--glass-bg-elevated)] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <Settings2 size={12} className="shrink-0" />
        <span className="font-medium text-fg-secondary">System prompt</span>
        {!expanded && node.content.length > 60 && (
          <span className="max-w-[300px] truncate text-fg-muted">
            &mdash; {node.content.substring(0, 60)}...
          </span>
        )}
        {!expanded && node.content.length <= 60 && (
          <span className="text-fg-muted">
            &mdash; {node.content}
          </span>
        )}
        {expanded ? (
          <ChevronUp size={12} className="shrink-0" />
        ) : (
          <ChevronDown size={12} className="shrink-0" />
        )}
      </div>
      {expanded && (
        <div className="mt-2 w-full max-w-2xl">
          <div className="glass rounded-lg border border-[var(--glass-border)] px-4 py-3 text-xs text-fg-secondary whitespace-pre-wrap">
            {node.content}
          </div>
        </div>
      )}
    </div>
  )
}

// --- User Bubble ---
function UserBubble({
  node,
  siblingIndex,
  siblingCount,
  isStreaming,
  onNavigateSibling,
  onEditResend,
}: {
  node: ConversationNode
  siblingIndex: number
  siblingCount: number
  isStreaming?: boolean
  onNavigateSibling: (nodeId: string, direction: -1 | 1) => void
  onEditResend?: (parentId: string, content: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(node.content)

  const handleSubmitEdit = () => {
    const trimmed = editContent.trim()
    if (!trimmed || !node.parentId || !onEditResend) return
    setIsEditing(false)
    onEditResend(node.parentId, trimmed)
  }

  if (isEditing) {
    return (
      <div className="w-full">
        <Textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
              e.preventDefault()
              handleSubmitEdit()
            } else if (e.key === 'Escape') {
              setIsEditing(false)
              setEditContent(node.content)
            }
          }}
          rows={3}
          autoFocus
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsEditing(false)
              setEditContent(node.content)
            }}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmitEdit}
            disabled={!editContent.trim()}
          >
            Save & Submit
          </Button>
        </div>
      </div>
    )
  }

  const userMeta = (node.metadata ?? {}) as Record<string, unknown>
  const userAnnotation = userMeta.annotation as string | undefined
  const isUserExcluded = userMeta.excludeFromContext === true
  const userFiles = userMeta.files as Array<{ id: string; name: string; size: number; category: string }> | undefined

  return (
    <div className="group">
      {/* Header row */}
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/15">
          <User size={13} className="text-accent" />
        </div>
        <span className="text-sm font-medium text-fg-primary">You</span>
        {isUserExcluded && (
          <span className="flex items-center gap-1 text-[10px] text-red-400">
            <EyeOff size={10} />
            excluded
          </span>
        )}
        <BranchNavigator
          currentIndex={siblingIndex}
          totalSiblings={siblingCount}
          onNavigate={(dir) => onNavigateSibling(node.id, dir)}
          nodeId={node.id}
        />
      </div>
      {/* File attachments */}
      {userFiles && userFiles.length > 0 && (
        <div className="pl-8 mb-1.5 flex flex-wrap gap-1.5">
          {userFiles.map((f) => (
            <span
              key={f.id}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2 py-0.5 text-[10px] text-fg-muted"
            >
              <Paperclip size={10} />
              {f.name}
              <span className="text-fg-muted/60">({formatFileSize(f.size)})</span>
            </span>
          ))}
        </div>
      )}
      {/* Content — flat, no bubble */}
      <div className="pl-8 text-sm text-fg-primary whitespace-pre-wrap">
        {node.content}
      </div>
      {userAnnotation && <div className="pl-8"><AnnotationBlock text={userAnnotation} /></div>}
      {onEditResend && !isStreaming && (
        <div className="mt-1 pl-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <IconButton
            onClick={() => setIsEditing(true)}
            aria-label="Edit message"
            tooltip="Edit"
            size="sm"
          >
            <Pencil size={13} />
          </IconButton>
        </div>
      )}
    </div>
  )
}

// --- Assistant Bubble ---
function AssistantBubble({
  node,
  siblingIndex,
  siblingCount,
  isStreaming,
  onNavigateSibling,
  onRegenerate,
  onRate,
}: {
  node: ConversationNode
  siblingIndex: number
  siblingCount: number
  isStreaming?: boolean
  onNavigateSibling: (nodeId: string, direction: -1 | 1) => void
  onRegenerate?: (assistantNodeId: string) => void
  onRate?: (nodeId: string, rating: 'up' | 'down' | null) => void
}) {
  const meta = (node.metadata ?? {}) as Record<string, unknown>
  const currentRating = meta.rating as 'up' | 'down' | null | undefined
  const isSummary = meta.isSummary === true
  const summarizedCount = (meta.summarizedMessageCount as number) ?? 0
  const summarizedNodeIds = (meta.summarizedNodeIds as string[] | undefined) ?? []
  const annotation = meta.annotation as string | undefined
  const isAssistantExcluded = meta.excludeFromContext === true
  const thinkingData = meta.thinking as { content?: string; level?: string } | undefined
  const thinkingContent = thinkingData?.content
  const thinkingLevel = thinkingData?.level
  const agentSteps = meta.agentSteps as Array<{ id: string; type: string; name: string; input?: string; output?: string; status: string }> | undefined
  const [showOriginals, setShowOriginals] = useState(false)
  const [showThinking, setShowThinking] = useState(false)
  const [showAgentSteps, setShowAgentSteps] = useState(false)
  const allNodes = useConversationStore((s) => s.nodes)

  return (
    <div className="group">
      {/* Header row */}
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-500/15">
          <Sparkles size={13} className="text-emerald-500" />
        </div>
        <span className="text-sm font-medium text-fg-primary">Assistant</span>
        {isAssistantExcluded && (
          <Badge variant="outline" className="border-red-400 text-red-400">
            <EyeOff size={10} className="mr-1" />
            excluded
          </Badge>
        )}
        {isSummary && (
          <Badge variant="outline" className="border-cyan-400 text-cyan-500">
            <ScrollText size={10} className="mr-1" />
            Summary{summarizedCount > 0 ? ` (${summarizedCount} msgs)` : ''}
          </Badge>
        )}
        {thinkingLevel && thinkingLevel !== 'fast' && (
          <Badge variant="outline" className="border-purple-400 text-purple-500">
            <Brain size={10} className="mr-1" />
            {thinkingLevel}
          </Badge>
        )}
        {node.model && (
          <Badge variant="outline">{node.model}</Badge>
        )}
        <BranchNavigator
          currentIndex={siblingIndex}
          totalSiblings={siblingCount}
          onNavigate={(dir) => onNavigateSibling(node.id, dir)}
          nodeId={node.id}
        />
      </div>

      {/* Thinking content (collapsible) */}
      {thinkingContent && (
        <div className="pl-8 mb-2">
          <button
            onClick={() => setShowThinking(!showThinking)}
            className="flex items-center gap-1.5 text-xs text-purple-500 hover:text-purple-400 transition-colors"
          >
            <Brain size={12} />
            <span className="font-medium">
              Show thinking ({thinkingContent.length > 100 ? `${Math.ceil(thinkingContent.length / 4)} tokens` : `${thinkingContent.length} chars`})
            </span>
            {showThinking ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {showThinking && (
            <div className="mt-1 border-l-2 border-purple-400/30 pl-3 text-xs italic text-fg-muted max-h-60 overflow-y-auto whitespace-pre-wrap">
              {thinkingContent}
            </div>
          )}
        </div>
      )}

      {/* Agent steps (collapsible) */}
      {agentSteps && agentSteps.length > 0 && (
        <div className="pl-8 mb-2">
          <button
            onClick={() => setShowAgentSteps(!showAgentSteps)}
            className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-400 transition-colors"
          >
            <Wrench size={12} />
            <span className="font-medium">{agentSteps.length} tool call{agentSteps.length > 1 ? 's' : ''}</span>
            {showAgentSteps ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {showAgentSteps && (
            <div className="mt-1 space-y-1">
              {agentSteps.map((step) => (
                <div
                  key={step.id}
                  className="rounded border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2.5 py-1.5 text-xs"
                >
                  <div className="flex items-center gap-1.5">
                    <div className={`h-1.5 w-1.5 rounded-full ${step.status === 'completed' ? 'bg-green-500' : step.status === 'running' ? 'bg-blue-500' : 'bg-red-500'}`} />
                    <span className="font-mono font-medium text-fg-secondary">{step.name}</span>
                  </div>
                  {step.input && (
                    <pre className="mt-1 text-[10px] text-fg-muted overflow-x-auto max-h-20 overflow-y-auto">{step.input}</pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content — flat, no bubble */}
      <div className={`pl-8 text-sm text-fg-primary ${isSummary ? 'ring-1 ring-cyan-400/20 rounded-lg p-3 -ml-3' : ''}`}>
        {node.content ? (
          <div className="markdown-body">
            <MarkdownRenderer content={node.content} />
          </div>
        ) : (
          <span className="italic text-fg-muted">Empty response</span>
        )}
      </div>
      {isSummary && summarizedNodeIds.length > 0 && (
        <div className="mt-2 pl-8">
          <button
            onClick={() => setShowOriginals(!showOriginals)}
            className="flex items-center gap-1.5 rounded-md border border-cyan-400/30 bg-cyan-500/5 px-2.5 py-1 text-xs text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
          >
            <Expand size={12} />
            {showOriginals ? 'Hide' : 'Show'} original {summarizedNodeIds.length} messages
            {showOriginals ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {showOriginals && (
            <div className="mt-2 space-y-1.5 rounded-lg border border-cyan-400/20 bg-cyan-500/5 p-2.5">
              {summarizedNodeIds.map((nid) => {
                const orig = allNodes.get(nid)
                if (!orig) return null
                const truncated = orig.content.length > 300
                  ? orig.content.substring(0, 300) + '...'
                  : orig.content
                return (
                  <div
                    key={nid}
                    className="rounded border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2.5 py-1.5 text-xs"
                  >
                    <span className="font-medium text-fg-muted capitalize">
                      {orig.role}:
                    </span>{' '}
                    <span className="text-fg-secondary whitespace-pre-wrap">{truncated}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
      {annotation && <div className="pl-8"><AnnotationBlock text={annotation} /></div>}
      <div className="mt-1 pl-8 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        {onRegenerate && !isStreaming && (
          <IconButton
            onClick={() => onRegenerate(node.id)}
            aria-label="Regenerate"
            tooltip="Regenerate"
            size="sm"
          >
            <RefreshCw size={13} />
          </IconButton>
        )}
        {onRate && !isStreaming && (
          <>
            <IconButton
              onClick={() =>
                onRate(node.id, currentRating === 'up' ? null : 'up')
              }
              aria-label="Thumbs up"
              tooltip="Good response"
              size="sm"
            >
              <ThumbsUp
                size={13}
                className={
                  currentRating === 'up'
                    ? 'fill-green-500 text-green-500'
                    : ''
                }
              />
            </IconButton>
            <IconButton
              onClick={() =>
                onRate(node.id, currentRating === 'down' ? null : 'down')
              }
              aria-label="Thumbs down"
              tooltip="Bad response"
              size="sm"
            >
              <ThumbsDown
                size={13}
                className={
                  currentRating === 'down'
                    ? 'fill-red-500 text-red-500'
                    : ''
                }
              />
            </IconButton>
          </>
        )}
        <TokenInfo metadata={node.metadata} model={node.model} />
      </div>
    </div>
  )
}

// --- Token Info ---
function TokenInfo({
  metadata,
  model,
}: {
  metadata: Record<string, unknown> | null
  model: string | null
}) {
  if (!metadata) return null
  const usage = metadata.usage as
    | { prompt_tokens?: number; completion_tokens?: number }
    | undefined
  if (!usage) return null
  const pt = usage.prompt_tokens ?? 0
  const ct = usage.completion_tokens ?? 0
  if (pt === 0 && ct === 0) return null

  // Calculate cost from settingsStore models pricing
  let costStr = ''
  if (model) {
    const models = useSettingsStore.getState().models
    const modelData = models.find((m) => m.id === model)
    if (modelData?.pricing) {
      const promptPrice = parseFloat(modelData.pricing.prompt) || 0
      const completionPrice = parseFloat(modelData.pricing.completion) || 0
      const cost = pt * promptPrice + ct * completionPrice
      costStr = formatCost(cost)
    }
  }

  return (
    <span className="text-[10px] text-fg-muted">
      {pt + ct} tokens ({pt}p + {ct}c)
      {costStr && <span className="ml-1 text-orange-500">{costStr}</span>}
    </span>
  )
}

// --- Annotation Block ---
function AnnotationBlock({ text }: { text: string }) {
  return (
    <div className="mt-1.5 flex items-start gap-1.5 rounded-md border border-amber-400/40 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-300">
      <StickyNote size={12} className="mt-0.5 shrink-0" />
      <div>
        <span className="font-medium">Note</span>
        <p className="mt-0.5 whitespace-pre-wrap text-amber-600 dark:text-amber-400">{text}</p>
      </div>
    </div>
  )
}
