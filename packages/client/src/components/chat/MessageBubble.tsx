import { useState } from 'react'
import { Settings2, ChevronDown, ChevronUp, Pencil, RefreshCw, ThumbsUp, ThumbsDown, ScrollText, StickyNote, EyeOff, Expand } from 'lucide-react'
import type { ConversationNode } from '../../types/index'
import { useSettingsStore } from '../../stores/settingsStore'
import { useConversationStore } from '../../stores/conversationStore'
import { formatCost } from '../../utils/cost'
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
    <div
      className="flex items-start gap-2 rounded-lg bg-elevated px-3 py-2 text-xs text-fg-muted cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <Settings2 size={14} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <span className="font-medium text-fg-secondary">System prompt</span>
        {expanded && (
          <p className="mt-1 whitespace-pre-wrap text-fg-secondary">{node.content}</p>
        )}
        {!expanded && node.content.length > 80 && (
          <span className="ml-1 text-fg-muted">
            &mdash; {node.content.substring(0, 80)}...
          </span>
        )}
        {!expanded && node.content.length <= 80 && (
          <span className="ml-1 text-fg-muted">
            &mdash; {node.content}
          </span>
        )}
      </div>
      {expanded ? (
        <ChevronUp size={14} className="shrink-0" />
      ) : (
        <ChevronDown size={14} className="shrink-0" />
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
      <div className="flex justify-end">
        <div className="w-full max-w-[80%]">
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
      </div>
    )
  }

  const userMeta = (node.metadata ?? {}) as Record<string, unknown>
  const userAnnotation = userMeta.annotation as string | undefined
  const isUserExcluded = userMeta.excludeFromContext === true

  return (
    <div className="group flex justify-end">
      <div className="max-w-[80%]">
        <div className="mb-1 flex items-center justify-end gap-2">
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
        <div className="rounded-xl rounded-br-sm bg-accent px-4 py-2.5 text-sm text-accent-text whitespace-pre-wrap">
          {node.content}
        </div>
        {userAnnotation && <AnnotationBlock text={userAnnotation} />}
        {onEditResend && !isStreaming && (
          <div className="mt-1 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
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
  const [showOriginals, setShowOriginals] = useState(false)
  const allNodes = useConversationStore((s) => s.nodes)

  return (
    <div className="group flex justify-start">
      <div className="max-w-[80%]">
        <div className="mb-1 flex items-center gap-2">
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
        <div className={`border-l-2 pl-4 text-sm text-fg-primary ${isSummary ? 'border-cyan-400/50' : 'border-accent/30'}`}>
          {node.content ? (
            <div className="markdown-body">
              <MarkdownRenderer content={node.content} />
            </div>
          ) : (
            <span className="italic text-fg-muted">Empty response</span>
          )}
        </div>
        {isSummary && summarizedNodeIds.length > 0 && (
          <div className="mt-2">
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
                      className="rounded border border-border bg-surface px-2.5 py-1.5 text-xs"
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
        {annotation && <AnnotationBlock text={annotation} />}
        <div className="mt-1 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
