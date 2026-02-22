import { memo, useState, useCallback } from 'react'
import { Handle, Position, useStore } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { Terminal, User, Sparkles, GitMerge, ChevronRight, ChevronDown, Pin, ScrollText, Swords, StickyNote, EyeOff, Brain, Paperclip, Wrench } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { useConversationStore } from '../../stores/conversationStore'
import { getChildren } from '../../utils/tree'

const LABEL_COLORS: Record<string, string> = {
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  yellow: 'bg-yellow-400',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
}

const LABEL_GRADIENT_TO: Record<string, string> = {
  red: 'to-red-500/40',
  orange: 'to-orange-500/40',
  yellow: 'to-yellow-400/40',
  green: 'to-green-500/40',
  blue: 'to-blue-500/40',
  purple: 'to-purple-500/40',
}

interface ConversationNodeData {
  role: 'system' | 'user' | 'assistant'
  content: string
  model: string | null
  isActive: boolean
  isOnActivePath: boolean
  childCount: number
  isCollapsed?: boolean
  isMergeNode?: boolean
  pinned?: boolean
  labelColor?: string
  isSummary?: boolean
  isTournament?: boolean
  hasAnnotation?: boolean
  excludedFromContext?: boolean
  heatmapIntensity?: number | null
  topic?: string
  nodeWidth?: number
  hasThinking?: boolean
  hasFiles?: boolean
  fileCount?: number
  hasAgentSteps?: boolean
  agentStepCount?: number
  [key: string]: unknown
}

const ROLE_ACCENT = {
  system: 'bg-fg-muted',
  user: 'bg-accent',
  assistant: 'bg-success',
}

const ROLE_ACCENT_GRADIENT_FROM: Record<string, string> = {
  system: 'from-fg-muted',
  user: 'from-accent',
  assistant: 'from-success',
}

const ROLE_ICONS = {
  system: Terminal,
  user: User,
  assistant: Sparkles,
}

const ROLE_DOT_COLORS = {
  system: '#a1a1aa',
  user: '#6366f1',
  assistant: '#22c55e',
}

// Compact dot for very zoomed out view (< 0.3)
function CompactDot({ role, isActive }: { role: string; isActive: boolean }) {
  const color = ROLE_DOT_COLORS[role as keyof typeof ROLE_DOT_COLORS] ?? '#a1a1aa'
  return (
    <div
      className="flex items-center justify-center"
      style={{ width: 16, height: 16 }}
    >
      <div
        className="rounded-full"
        style={{
          width: isActive ? 12 : 8,
          height: isActive ? 12 : 8,
          backgroundColor: color,
          boxShadow: isActive ? `0 0 8px ${color}` : 'none',
        }}
      />
    </div>
  )
}

// Medium node for intermediate zoom (0.3 - 0.7)
function MediumNode({
  role,
  content,
  model,
  isActive,
  isSummary,
  isTournament,
  isMerge,
}: {
  role: string
  content: string
  model: string | null
  isActive: boolean
  isSummary?: boolean
  isTournament?: boolean
  isMerge?: boolean
}) {
  const RoleIcon = isTournament ? Swords : isSummary ? ScrollText : isMerge ? GitMerge : ROLE_ICONS[role as keyof typeof ROLE_ICONS] ?? Terminal
  const color = ROLE_DOT_COLORS[role as keyof typeof ROLE_DOT_COLORS] ?? '#a1a1aa'

  return (
    <div
      className={`flex w-[180px] items-center gap-1.5 rounded-lg border px-2 py-1.5 bg-[var(--glass-bg)] backdrop-blur-lg ${
        isActive ? 'shadow-accent ring-1 ring-accent/15 border-accent/30' : 'border-[var(--glass-border)]'
      }`}
    >
      <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <RoleIcon size={10} className="shrink-0 text-fg-muted" />
      <span className="truncate text-[10px] text-fg-secondary">
        {role === 'system' ? 'System' : content.slice(0, 40)}
      </span>
      {model && (
        <span className="ml-auto shrink-0 rounded bg-elevated px-1 py-0.5 text-[8px] text-fg-muted">
          {model.split('/').pop()?.slice(0, 8)}
        </span>
      )}
    </div>
  )
}

function ConversationNodeComponent({ id, data }: NodeProps) {
  const nodeData = data as ConversationNodeData
  const zoomLevel = useStore(
    useCallback((s: { transform: [number, number, number] }) => {
      const z = s.transform[2]
      return z < 0.3 ? 'dot' : z < 0.7 ? 'medium' : 'full'
    }, []),
  )
  const isMerge = nodeData.isMergeNode
  const isSummary = nodeData.isSummary
  const isTournament = nodeData.isTournament
  const isExcluded = nodeData.excludedFromContext
  const RoleIcon = isTournament ? Swords : isSummary ? ScrollText : isMerge ? GitMerge : ROLE_ICONS[nodeData.role]
  const layoutDirection = useUIStore((s) => s.layoutDirection)

  const targetPosition = layoutDirection === 'LR' ? Position.Left : Position.Top
  const sourcePosition = layoutDirection === 'LR' ? Position.Right : Position.Bottom

  const nodeWidth = nodeData.nodeWidth ?? 240

  // Semantic zoom: compact dot at very low zoom
  if (zoomLevel === 'dot') {
    return (
      <>
        <Handle type="target" position={targetPosition} className="!bg-transparent !border-0 !w-0 !h-0" />
        <CompactDot role={nodeData.role} isActive={nodeData.isActive} />
        <Handle type="source" position={sourcePosition} className="!bg-transparent !border-0 !w-0 !h-0" />
      </>
    )
  }

  // Semantic zoom: medium detail at intermediate zoom
  if (zoomLevel === 'medium') {
    return (
      <>
        <Handle type="target" position={targetPosition} className="!bg-fg-muted" />
        <MediumNode
          role={nodeData.role}
          content={nodeData.content}
          model={nodeData.model}
          isActive={nodeData.isActive}
          isSummary={isSummary}
          isTournament={isTournament}
          isMerge={isMerge}
        />
        <Handle type="source" position={sourcePosition} className="!bg-fg-muted" />
      </>
    )
  }

  const handleCompare = (e: React.MouseEvent) => {
    e.stopPropagation()
    const store = useConversationStore.getState()
    const children = getChildren(store.nodes, id)
    if (children.length < 2) return

    // Auto-select first two children, find their leaf nodes
    const getLeaf = (startId: string): string => {
      let nodeId = startId
      while (true) {
        const c = getChildren(store.nodes, nodeId)
        if (c.length === 0) return nodeId
        nodeId = c[c.length - 1]!.id
      }
    }

    useUIStore.getState().setCompareState({
      isComparing: true,
      branchPointId: id,
      leftBranchId: getLeaf(children[0]!.id),
      rightBranchId: getLeaf(children[1]!.id),
    })
  }

  const handleToggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation()
    useUIStore.getState().toggleCollapsed(id)
  }

  // Determine accent bar gradient
  const labelColor = nodeData.labelColor
  const gradientTo = labelColor && LABEL_GRADIENT_TO[labelColor]
    ? LABEL_GRADIENT_TO[labelColor]
    : isTournament
      ? 'to-amber-500/40'
      : isMerge
        ? 'to-purple-500/40'
        : isSummary
          ? 'to-cyan-500/40'
          : `to-${nodeData.role === 'system' ? 'fg-muted' : nodeData.role === 'user' ? 'accent' : 'success'}/40`

  const accentBarBg = labelColor && LABEL_COLORS[labelColor]
    ? LABEL_COLORS[labelColor]
    : isTournament
      ? 'bg-amber-500'
      : isMerge
        ? 'bg-purple-500'
        : isSummary
          ? 'bg-cyan-500'
          : ROLE_ACCENT[nodeData.role]

  return (
    <>
      <Handle type="target" position={targetPosition} className="!bg-fg-muted" />
      <div
        className={`
          relative flex cursor-pointer items-start gap-2 rounded-xl border px-3.5 py-2.5 transition-all duration-200
          bg-[var(--glass-bg)] backdrop-blur-lg
          ${isTournament ? 'border-dashed border-amber-400 dark:border-amber-600' : ''}
          ${!isTournament && isMerge ? 'border-dashed border-purple-400 dark:border-purple-600' : ''}
          ${!isTournament && isSummary ? 'border-dashed border-cyan-400 dark:border-cyan-600' : ''}
          ${!isMerge && !isSummary && !isTournament ? 'border-[var(--glass-border)] shadow-sm hover:shadow-lg hover:-translate-y-0.5' : ''}
          ${nodeData.isActive ? 'shadow-accent ring-1 ring-accent/15' : ''}
          ${nodeData.isCollapsed ? 'border-b-2 border-b-dashed border-b-fg-muted/40' : ''}
          ${isExcluded ? 'opacity-50' : ''}
        `}
        style={{ width: nodeWidth }}
      >
        {/* Heatmap overlay */}
        {nodeData.heatmapIntensity != null && (
          <div
            className="pointer-events-none absolute inset-0 rounded-xl"
            style={{
              backgroundColor: `hsl(${240 * (1 - nodeData.heatmapIntensity)}, 70%, 50%)`,
              opacity: 0.15 + nodeData.heatmapIntensity * 0.15,
            }}
          />
        )}

        {/* Pin indicator */}
        {nodeData.pinned && (
          <div className="absolute -left-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm">
            <Pin size={8} />
          </div>
        )}

        {/* Annotation indicator */}
        {nodeData.hasAnnotation && !isExcluded && (
          <div className="absolute -bottom-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-white shadow-sm" title="Has note">
            <StickyNote size={8} />
          </div>
        )}

        {/* Context exclusion indicator */}
        {isExcluded && (
          <div className="absolute -bottom-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white shadow-sm" title="Excluded from context">
            <EyeOff size={8} />
          </div>
        )}

        {/* Thinking badge */}
        {nodeData.hasThinking && (
          <div className="absolute -top-1.5 -left-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 text-white shadow-sm" title="Has thinking content">
            <Brain size={8} />
          </div>
        )}

        {/* Files badge */}
        {nodeData.hasFiles && (
          <div className="absolute -top-1.5 right-6 flex h-4 items-center gap-0.5 rounded-full bg-blue-500 px-1 text-white shadow-sm" title={`${nodeData.fileCount} file(s) attached`}>
            <Paperclip size={8} />
            {(nodeData.fileCount ?? 0) > 1 && <span className="text-[7px] font-bold">{nodeData.fileCount}</span>}
          </div>
        )}

        {/* Topic indicator */}
        {nodeData.topic && (
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 rounded-md bg-[var(--glass-bg-elevated)] px-1.5 py-0.5 text-[8px] font-medium text-fg-muted border border-[var(--glass-border)]">
            {nodeData.topic}
          </div>
        )}

        {/* Collapse/expand toggle (for nodes with children) */}
        {nodeData.childCount >= 1 && (
          <button
            onClick={handleToggleCollapse}
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-elevated)] text-fg-secondary shadow-xs hover:bg-[var(--color-surface)] hover:text-fg-primary transition-all active:scale-[0.9]"
            title={nodeData.isCollapsed ? 'Expand subtree' : 'Collapse subtree'}
          >
            {nodeData.isCollapsed ? (
              <ChevronRight size={10} />
            ) : nodeData.childCount >= 2 ? (
              <span className="text-[9px] font-bold">{nodeData.childCount}</span>
            ) : (
              <ChevronDown size={10} />
            )}
          </button>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <div className={`h-2 w-2 shrink-0 rounded-full ${accentBarBg}`} />
            <RoleIcon size={12} className={`shrink-0 ${isTournament ? 'text-amber-500' : isSummary ? 'text-cyan-500' : 'text-fg-muted'}`} />
            <span className="text-xs font-medium text-fg-secondary">
              {isTournament ? 'tournament' : isSummary ? 'summary' : isMerge ? 'merge' : nodeData.role}
            </span>
            {nodeData.model && (
              <span className="ml-auto truncate rounded-md bg-elevated px-1.5 py-0.5 text-[10px] text-fg-muted">
                {nodeData.model}
              </span>
            )}
          </div>
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-fg-secondary">
            {nodeData.role === 'system' ? 'System prompt' : nodeData.content}
          </p>
          {/* Sub-node indicators */}
          {nodeData.hasThinking && (
            <div className="mt-1 flex items-center gap-1 text-[9px] text-purple-400">
              <Brain size={8} />
              <span>thinking</span>
            </div>
          )}
          {nodeData.hasAgentSteps && (
            <div className="mt-0.5 flex items-center gap-1 text-[9px] text-blue-400">
              <Wrench size={8} />
              <span>{nodeData.agentStepCount} tool call{(nodeData.agentStepCount ?? 0) > 1 ? 's' : ''}</span>
            </div>
          )}
          {nodeData.hasFiles && (
            <div className="mt-0.5 flex items-center gap-1 text-[9px] text-fg-muted">
              <Paperclip size={8} />
              <span>{nodeData.fileCount} file{(nodeData.fileCount ?? 0) > 1 ? 's' : ''}</span>
            </div>
          )}
          {nodeData.childCount >= 2 && !isMerge && !nodeData.isCollapsed && (
            <button
              onClick={handleCompare}
              className="mt-1 text-[10px] text-fg-muted hover:text-accent transition-colors"
            >
              Compare
            </button>
          )}
        </div>
      </div>
      <Handle type="source" position={sourcePosition} className="!bg-fg-muted" />
    </>
  )
}

export const ConversationNodeMemo = memo(ConversationNodeComponent)
