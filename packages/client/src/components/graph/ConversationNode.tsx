import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { Terminal, User, Sparkles, GitMerge, ChevronRight, ChevronDown, Pin, ScrollText, Swords, StickyNote, EyeOff } from 'lucide-react'
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
  [key: string]: unknown
}

const ROLE_ACCENT = {
  system: 'bg-fg-muted',
  user: 'bg-accent',
  assistant: 'bg-success',
}

const ROLE_ICONS = {
  system: Terminal,
  user: User,
  assistant: Sparkles,
}

function ConversationNodeComponent({ id, data }: NodeProps) {
  const nodeData = data as ConversationNodeData
  const isMerge = nodeData.isMergeNode
  const isSummary = nodeData.isSummary
  const isTournament = nodeData.isTournament
  const isExcluded = nodeData.excludedFromContext
  const RoleIcon = isTournament ? Swords : isSummary ? ScrollText : isMerge ? GitMerge : ROLE_ICONS[nodeData.role]
  const layoutDirection = useUIStore((s) => s.layoutDirection)

  const targetPosition = layoutDirection === 'LR' ? Position.Left : Position.Top
  const sourcePosition = layoutDirection === 'LR' ? Position.Right : Position.Bottom

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

  const accentBarClass = nodeData.labelColor && LABEL_COLORS[nodeData.labelColor]
    ? LABEL_COLORS[nodeData.labelColor]
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
          relative flex w-[200px] cursor-pointer items-start gap-2 rounded-lg border bg-surface px-3 py-2 transition-all
          ${isTournament ? 'border-dashed border-amber-400 dark:border-amber-600' : ''}
          ${!isTournament && isMerge ? 'border-dashed border-purple-400 dark:border-purple-600' : ''}
          ${!isTournament && isSummary ? 'border-dashed border-cyan-400 dark:border-cyan-600' : ''}
          ${!isMerge && !isSummary && !isTournament ? 'border-border' : ''}
          ${nodeData.isActive ? 'ring-2 ring-accent' : ''}
          ${nodeData.isCollapsed ? 'border-b-2 border-b-dashed border-b-fg-muted/40' : ''}
          ${isExcluded ? 'opacity-50' : ''}
        `}
      >
        {/* Heatmap overlay */}
        {nodeData.heatmapIntensity != null && (
          <div
            className="pointer-events-none absolute inset-0 rounded-lg"
            style={{
              backgroundColor: `hsl(${240 * (1 - nodeData.heatmapIntensity)}, 70%, 50%)`,
              opacity: 0.15 + nodeData.heatmapIntensity * 0.15,
            }}
          />
        )}

        {/* Left accent bar */}
        <div
          className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-full ${accentBarClass}`}
        />

        {/* Pin indicator */}
        {nodeData.pinned && (
          <div className="absolute -left-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white">
            <Pin size={8} />
          </div>
        )}

        {/* Annotation indicator */}
        {nodeData.hasAnnotation && !isExcluded && (
          <div className="absolute -bottom-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-white" title="Has note">
            <StickyNote size={8} />
          </div>
        )}

        {/* Context exclusion indicator */}
        {isExcluded && (
          <div className="absolute -bottom-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white" title="Excluded from context">
            <EyeOff size={8} />
          </div>
        )}

        {/* Collapse/expand toggle (for nodes with children) */}
        {nodeData.childCount >= 1 && (
          <button
            onClick={handleToggleCollapse}
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-elevated text-fg-secondary hover:bg-surface hover:text-fg-primary transition-colors"
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

        <div className="min-w-0 flex-1 pl-1.5">
          <div className="flex items-center gap-1.5">
            <RoleIcon size={12} className={`shrink-0 ${isTournament ? 'text-amber-500' : isSummary ? 'text-cyan-500' : 'text-fg-muted'}`} />
            <span className="text-xs font-medium text-fg-secondary">
              {isTournament ? 'tournament' : isSummary ? 'summary' : isMerge ? 'merge' : nodeData.role}
            </span>
            {nodeData.model && (
              <span className="ml-auto truncate rounded bg-elevated px-1 py-0.5 text-[10px] text-fg-muted">
                {nodeData.model}
              </span>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-fg-secondary">
            {nodeData.role === 'system' ? 'System prompt' : nodeData.content}
          </p>
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
