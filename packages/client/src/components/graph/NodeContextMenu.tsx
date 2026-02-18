import { useEffect, useRef, useCallback } from 'react'
import {
  MousePointer2,
  GitBranch,
  RefreshCw,
  Trash2,
  GitCompare,
  ChevronsDownUp,
  ChevronsUpDown,
  Pin,
  PinOff,
  Palette,
  ScrollText,
  StickyNote,
  EyeOff,
  Eye,
  type LucideIcon,
} from 'lucide-react'
import { useConversationStore } from '../../stores/conversationStore'
import { useUIStore } from '../../stores/uiStore'
import { useCompletion } from '../../hooks/useCompletion'
import { getChildren } from '../../utils/tree'
import * as api from '../../services/api'
import { toast } from '../../stores/toastStore'

const LABEL_COLORS = [
  { name: 'red', bg: 'bg-red-500' },
  { name: 'orange', bg: 'bg-orange-500' },
  { name: 'yellow', bg: 'bg-yellow-400' },
  { name: 'green', bg: 'bg-green-500' },
  { name: 'blue', bg: 'bg-blue-500' },
  { name: 'purple', bg: 'bg-purple-500' },
]

interface NodeContextMenuProps {
  x: number
  y: number
  nodeId: string
  onClose: () => void
  onAnnotate?: (nodeId: string, x: number, y: number) => void
}

export function NodeContextMenu({ x, y, nodeId, onClose, onAnnotate }: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const nodes = useConversationStore((s) => s.nodes)
  const setActiveNode = useConversationStore((s) => s.setActiveNode)
  const updateNodeData = useConversationStore((s) => s.updateNodeData)
  const removeNode = useConversationStore((s) => s.removeNode)
  const { regenerate, summarize } = useCompletion()

  const collapsedNodeIds = useUIStore((s) => s.collapsedNodeIds)

  const node = nodes.get(nodeId)
  const children = node ? getChildren(nodes, nodeId) : []
  const isRoot = node?.parentId === null
  const isAssistant = node?.role === 'assistant'
  const canBranch = node?.role === 'assistant' || node?.role === 'system'
  const canCompare = children.length >= 2
  const hasChildren = children.length > 0
  const isCollapsed = collapsedNodeIds.has(nodeId)
  const meta = (node?.metadata ?? {}) as Record<string, unknown>
  const isPinned = meta.pinned === true
  const currentLabelColor = (meta.label as Record<string, unknown> | undefined)?.color as string | undefined
  const hasAnnotation = !!meta.annotation
  const isExcludedFromContext = meta.excludeFromContext === true

  const handleToggleExclude = useCallback(async () => {
    onClose()
    const newMeta = { ...meta }
    if (isExcludedFromContext) {
      newMeta.excludeFromContext = undefined
    } else {
      newMeta.excludeFromContext = true
    }
    try {
      await updateNodeData(nodeId, { metadata: newMeta })
      toast.info(
        newMeta.excludeFromContext
          ? 'Node excluded from context'
          : 'Node included in context',
      )
    } catch {
      toast.error('Failed to update context exclusion')
    }
  }, [nodeId, meta, isExcludedFromContext, onClose, updateNodeData])

  const handleAnnotate = useCallback(() => {
    onClose()
    onAnnotate?.(nodeId, x, y)
  }, [nodeId, x, y, onClose, onAnnotate])

  const handleNavigate = useCallback(() => {
    setActiveNode(nodeId)
    onClose()
  }, [nodeId, setActiveNode, onClose])

  const handleBranch = useCallback(() => {
    setActiveNode(nodeId)
    onClose()
    // Focus the chat input after a tick so the active node updates first
    requestAnimationFrame(() => {
      document.getElementById('chat-input')?.focus()
    })
  }, [nodeId, setActiveNode, onClose])

  const handleRegenerate = useCallback(() => {
    regenerate(nodeId)
    onClose()
  }, [nodeId, regenerate, onClose])

  const handleDelete = useCallback(async () => {
    onClose()
    try {
      await api.deleteNode(nodeId)
      removeNode(nodeId)
      toast.success('Node deleted')
    } catch {
      toast.error('Failed to delete node')
    }
  }, [nodeId, removeNode, onClose])

  const handleCompare = useCallback(() => {
    const store = useConversationStore.getState()
    const nodeChildren = getChildren(store.nodes, nodeId)
    if (nodeChildren.length < 2) return

    const getLeaf = (startId: string): string => {
      let current = startId
      while (true) {
        const c = getChildren(store.nodes, current)
        if (c.length === 0) return current
        current = c[c.length - 1]!.id
      }
    }

    useUIStore.getState().setCompareState({
      isComparing: true,
      branchPointId: nodeId,
      leftBranchId: getLeaf(nodeChildren[0]!.id),
      rightBranchId: getLeaf(nodeChildren[1]!.id),
    })
    onClose()
  }, [nodeId, onClose])

  const handleToggleCollapse = useCallback(() => {
    useUIStore.getState().toggleCollapsed(nodeId)
    onClose()
  }, [nodeId, onClose])

  const handleTogglePin = useCallback(async () => {
    onClose()
    const newMeta = { ...meta, pinned: !isPinned }
    try {
      await updateNodeData(nodeId, { metadata: newMeta })
    } catch {
      toast.error('Failed to update pin')
    }
  }, [nodeId, meta, isPinned, onClose, updateNodeData])

  const handleSetLabelColor = useCallback(async (color: string | null) => {
    onClose()
    const newMeta = { ...meta }
    if (color) {
      newMeta.label = { color }
    } else {
      delete newMeta.label
    }
    try {
      await updateNodeData(nodeId, { metadata: newMeta })
    } catch {
      toast.error('Failed to update label')
    }
  }, [nodeId, meta, onClose, updateNodeData])

  const handleSummarize = useCallback(() => {
    summarize(nodeId)
    onClose()
  }, [nodeId, summarize, onClose])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Adjust position to keep menu within viewport
  const style: React.CSSProperties = {
    position: 'fixed',
    left: x,
    top: y,
    zIndex: 50,
  }

  if (!node) return null

  return (
    <div ref={menuRef} style={style} className="min-w-[180px] rounded-lg border border-border bg-surface py-1 shadow-lg">
      <MenuItem icon={MousePointer2} label="Navigate here" onClick={handleNavigate} />
      {canBranch && (
        <MenuItem icon={GitBranch} label="Branch from here" onClick={handleBranch} />
      )}
      {isAssistant && (
        <MenuItem icon={RefreshCw} label="Regenerate" onClick={handleRegenerate} />
      )}
      {canCompare && (
        <MenuItem icon={GitCompare} label="Compare branches" onClick={handleCompare} />
      )}
      {hasChildren && (
        <MenuItem
          icon={isCollapsed ? ChevronsUpDown : ChevronsDownUp}
          label={isCollapsed ? 'Expand subtree' : 'Collapse subtree'}
          onClick={handleToggleCollapse}
        />
      )}
      {!isRoot && (
        <MenuItem
          icon={ScrollText}
          label="Summarize above"
          onClick={handleSummarize}
        />
      )}
      {!isRoot && (
        <MenuItem
          icon={isExcludedFromContext ? Eye : EyeOff}
          label={isExcludedFromContext ? 'Include in context' : 'Exclude from context'}
          onClick={handleToggleExclude}
        />
      )}
      <MenuItem
        icon={StickyNote}
        label={hasAnnotation ? 'Edit note' : 'Add note'}
        onClick={handleAnnotate}
      />
      <div className="my-1 border-t border-border" />
      <MenuItem
        icon={isPinned ? PinOff : Pin}
        label={isPinned ? 'Unpin node' : 'Pin node'}
        onClick={handleTogglePin}
      />
      {/* Label color picker */}
      <div className="flex items-center gap-1.5 px-3 py-1.5">
        <Palette size={14} className="text-fg-secondary" />
        <div className="flex items-center gap-1">
          {LABEL_COLORS.map((c) => (
            <button
              key={c.name}
              onClick={() => handleSetLabelColor(c.name)}
              className={`h-4 w-4 rounded-full ${c.bg} transition-transform hover:scale-125 ${currentLabelColor === c.name ? 'ring-2 ring-fg-primary ring-offset-1 ring-offset-surface' : ''}`}
              title={c.name}
            />
          ))}
          {currentLabelColor && (
            <button
              onClick={() => handleSetLabelColor(null)}
              className="ml-0.5 text-[10px] text-fg-muted hover:text-fg-secondary"
              title="Remove label"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      {!isRoot && (
        <>
          <div className="my-1 border-t border-border" />
          <MenuItem icon={Trash2} label="Delete node" onClick={handleDelete} destructive />
        </>
      )}
    </div>
  )
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  destructive,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
  destructive?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
        destructive
          ? 'text-destructive hover:bg-destructive/10'
          : 'text-fg-secondary hover:bg-elevated hover:text-fg-primary'
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  )
}
