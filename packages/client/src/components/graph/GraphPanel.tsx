import { useMemo, useCallback, useRef, useEffect, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useReactFlow,
  type Node as FlowNode,
  type Edge,
  type Viewport,
} from '@xyflow/react'
import { useConversationStore } from '../../stores/conversationStore'
import { useUIStore } from '../../stores/uiStore'
import { useActivePath } from '../../hooks/useActivePath'
import { useGraphShortcuts } from '../../hooks/useGraphShortcuts'
import { getChildren } from '../../utils/tree'
import { Maximize2, RotateCcw, ArrowDownUp, ArrowLeftRight, Flame, History } from 'lucide-react'
import { computeLayout } from '../../utils/layout'
import { ConversationNodeMemo } from './ConversationNode'
import { NodeContextMenu } from './NodeContextMenu'
import { AnnotationPopover } from './AnnotationPopover'
import { PinnedNodesPanel } from './PinnedNodesPanel'
import { HeatmapLegend } from './HeatmapLegend'
import { ReplayControls } from './ReplayControls'
import { LabelFilter } from './LabelFilter'
import type { HeatmapMetric } from '../../stores/uiStore'

const nodeTypes = {
  conversation: ConversationNodeMemo,
}

// Theme-aware edge colors using CSS variable values
function getEdgeColors() {
  const style = getComputedStyle(document.documentElement)
  return {
    active: style.getPropertyValue('--color-accent').trim() || '#6366f1',
    inactive: style.getPropertyValue('--color-fg-muted').trim() || '#a1a1aa',
    merge: '#a855f7',
  }
}

const VIEWPORT_STORAGE_PREFIX = 'chatgraph-viewport-'

function saveViewport(conversationId: string, viewport: Viewport) {
  localStorage.setItem(
    `${VIEWPORT_STORAGE_PREFIX}${conversationId}`,
    JSON.stringify(viewport),
  )
}

function loadViewport(conversationId: string): Viewport | null {
  const raw = localStorage.getItem(`${VIEWPORT_STORAGE_PREFIX}${conversationId}`)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Viewport
  } catch {
    return null
  }
}

export function clearSavedViewport(conversationId: string) {
  localStorage.removeItem(`${VIEWPORT_STORAGE_PREFIX}${conversationId}`)
}

function GraphPanelInner() {
  useGraphShortcuts()

  const nodes = useConversationStore((s) => s.nodes)
  const activeConversationId = useConversationStore((s) => s.activeConversationId)
  const activeNodeId = useConversationStore((s) => s.activeNodeId)
  const setActiveNode = useConversationStore((s) => s.setActiveNode)
  const mergeEdges = useConversationStore((s) => s.mergeEdges)
  const activePath = useActivePath()

  const collapsedNodeIds = useUIStore((s) => s.collapsedNodeIds)
  const layoutDirection = useUIStore((s) => s.layoutDirection)
  const setLayoutDirection = useUIStore((s) => s.setLayoutDirection)
  const heatmapState = useUIStore((s) => s.heatmapState)
  const toggleHeatmap = useUIStore((s) => s.toggleHeatmap)
  const setHeatmapMetric = useUIStore((s) => s.setHeatmapMetric)
  const replayState = useUIStore((s) => s.replayState)
  const startReplay = useUIStore((s) => s.startReplay)
  const exitReplay = useUIStore((s) => s.exitReplay)
  const streamStatus = useUIStore((s) => s.streamState.status)
  const labelFilter = useUIStore((s) => s.labelFilter)
  const [contextMenu, setContextMenu] = useState<{ nodeId: string; x: number; y: number } | null>(null)
  const [annotationPopover, setAnnotationPopover] = useState<{ nodeId: string; x: number; y: number } | null>(null)
  const hasFitRef = useRef(false)
  const reactFlow = useReactFlow()

  const activePathIds = useMemo(
    () => new Set(activePath.map((n) => n.id)),
    [activePath],
  )

  const childCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const node of nodes.values()) {
      if (node.parentId) {
        counts.set(node.parentId, (counts.get(node.parentId) ?? 0) + 1)
      }
    }
    return counts
  }, [nodes])

  const edgeColors = useMemo(() => getEdgeColors(), [])

  // Compute heatmap intensity values (0-1 normalized) per node
  const heatmapValues = useMemo(() => {
    if (!heatmapState.enabled) return new Map<string, number>()

    const values = new Map<string, number>()
    let min = Infinity
    let max = -Infinity

    // Collect raw values per metric
    for (const node of nodes.values()) {
      let raw = 0
      if (heatmapState.metric === 'tokens') {
        const meta = (node.metadata ?? {}) as Record<string, unknown>
        const usage = meta.usage as Record<string, unknown> | undefined
        if (usage) {
          const total = usage.total_tokens as number | undefined
          const prompt = (usage.prompt_tokens as number) ?? 0
          const completion = (usage.completion_tokens as number) ?? 0
          raw = total ?? prompt + completion
        }
      } else if (heatmapState.metric === 'branches') {
        raw = childCounts.get(node.id) ?? 0
      } else {
        raw = new Date(node.createdAt).getTime()
      }
      values.set(node.id, raw)
      if (raw < min) min = raw
      if (raw > max) max = raw
    }

    // Normalize to 0-1
    const range = max - min
    if (range === 0) {
      for (const key of values.keys()) values.set(key, 0)
    } else {
      for (const [key, val] of values) {
        values.set(key, (val - min) / range)
      }
    }
    return values
  }, [nodes, heatmapState.enabled, heatmapState.metric, childCounts])

  // Sort all node IDs chronologically for replay
  const sortedNodeIds = useMemo(() => {
    return [...nodes.values()]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((n) => n.id)
  }, [nodes])

  // Set of node IDs visible during replay (null = show all)
  const replayVisibleIds = useMemo(() => {
    if (!replayState.isReplaying) return null
    return new Set(sortedNodeIds.slice(0, replayState.replayIndex))
  }, [replayState.isReplaying, replayState.replayIndex, sortedNodeIds])

  // Build set of all node IDs hidden by collapsed ancestors
  const hiddenNodeIds = useMemo(() => {
    const hidden = new Set<string>()
    for (const collapsedId of collapsedNodeIds) {
      // BFS from collapsed node's children
      const queue = getChildren(nodes, collapsedId).map((c) => c.id)
      while (queue.length > 0) {
        const id = queue.shift()!
        if (hidden.has(id)) continue
        hidden.add(id)
        for (const child of getChildren(nodes, id)) {
          queue.push(child.id)
        }
      }
    }
    return hidden
  }, [nodes, collapsedNodeIds])

  // Determine if label filtering is active
  const isLabelFiltering = labelFilter.activeFilters.size > 0 || !labelFilter.showUnlabeled

  const { flowNodes, flowEdges } = useMemo(() => {
    const rawNodes: FlowNode[] = []
    const edges: Edge[] = []

    for (const node of nodes.values()) {
      if (hiddenNodeIds.has(node.id)) continue
      if (replayVisibleIds && !replayVisibleIds.has(node.id)) continue

      const meta = (node.metadata ?? {}) as Record<string, unknown>
      const isMergeNode = meta.isMergeNode === true
      const isSummary = meta.isSummary === true
      const isTournament = meta.isTournament === true
      const pinned = meta.pinned === true
      const labelColor = (meta.label as Record<string, unknown> | undefined)?.color as string | undefined
      const excludedFromContext = meta.excludeFromContext === true

      // Label filter: skip nodes that don't match active filters
      if (isLabelFiltering) {
        if (labelColor) {
          if (labelFilter.activeFilters.size > 0 && !labelFilter.activeFilters.has(labelColor)) continue
        } else {
          if (!labelFilter.showUnlabeled) continue
        }
      }

      rawNodes.push({
        id: node.id,
        type: 'conversation',
        position: { x: 0, y: 0 },
        data: {
          role: node.role,
          content: node.content,
          model: node.model,
          isActive: node.id === activeNodeId,
          isOnActivePath: activePathIds.has(node.id),
          childCount: childCounts.get(node.id) ?? 0,
          isCollapsed: collapsedNodeIds.has(node.id),
          isMergeNode,
          isSummary,
          isTournament,
          pinned,
          labelColor,
          hasAnnotation: !!meta.annotation,
          excludedFromContext,
          heatmapIntensity: heatmapValues.get(node.id) ?? null,
        },
      })

      if (node.parentId && !hiddenNodeIds.has(node.parentId) && (!replayVisibleIds || replayVisibleIds.has(node.parentId))) {
        const isActivePath =
          activePathIds.has(node.id) && activePathIds.has(node.parentId)
        edges.push({
          id: `${node.parentId}-${node.id}`,
          source: node.parentId,
          target: node.id,
          type: 'smoothstep',
          style: {
            stroke: isActivePath ? edgeColors.active : edgeColors.inactive,
            strokeWidth: isActivePath ? 2.5 : 1.5,
          },
        })
      }
    }

    // Add merge edges (dashed purple lines) — skip if either end is hidden or filtered by replay
    for (const me of mergeEdges) {
      if (hiddenNodeIds.has(me.parentId) || hiddenNodeIds.has(me.childId)) continue
      if (replayVisibleIds && (!replayVisibleIds.has(me.parentId) || !replayVisibleIds.has(me.childId))) continue
      edges.push({
        id: `merge-${me.parentId}-${me.childId}`,
        source: me.parentId,
        target: me.childId,
        type: 'smoothstep',
        style: {
          stroke: edgeColors.merge,
          strokeWidth: 2,
          strokeDasharray: '5,5',
        },
        animated: true,
      })
    }

    const layoutNodes = computeLayout(rawNodes, edges, { direction: layoutDirection })
    return { flowNodes: layoutNodes, flowEdges: edges }
  }, [nodes, activeNodeId, activePathIds, childCounts, mergeEdges, edgeColors, hiddenNodeIds, collapsedNodeIds, layoutDirection, heatmapValues, replayVisibleIds, isLabelFiltering, labelFilter])

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: FlowNode) => {
      setActiveNode(node.id)
    },
    [setActiveNode],
  )

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: FlowNode) => {
      event.preventDefault()
      setContextMenu({ nodeId: node.id, x: event.clientX, y: event.clientY })
    },
    [],
  )

  const handlePaneClick = useCallback(() => {
    setContextMenu(null)
    setAnnotationPopover(null)
  }, [])

  // Debounced viewport save on move
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleMoveEnd = useCallback(
    (_event: unknown, viewport: Viewport) => {
      if (!activeConversationId || !hasFitRef.current) return
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        saveViewport(activeConversationId, viewport)
      }, 300)
    },
    [activeConversationId],
  )

  // Only fitView on initial load — restore saved viewport if available
  useEffect(() => {
    if (!hasFitRef.current && flowNodes.length > 0) {
      if (activeConversationId) {
        const saved = loadViewport(activeConversationId)
        if (saved) {
          reactFlow.setViewport(saved, { duration: 300 })
          hasFitRef.current = true
          return
        }
      }
      reactFlow.fitView()
      hasFitRef.current = true
    }
  }, [flowNodes.length, reactFlow, activeConversationId])

  // Reset fit tracking when conversation changes (nodes cleared); exit replay
  useEffect(() => {
    if (nodes.size === 0) {
      hasFitRef.current = false
      if (replayState.isReplaying) exitReplay()
    }
  }, [nodes.size, replayState.isReplaying, exitReplay])

  // Auto-pan to active node when it changes (suppressed during replay)
  useEffect(() => {
    if (!activeNodeId || !hasFitRef.current || replayState.isReplaying) return
    const active = flowNodes.find((n) => n.id === activeNodeId)
    if (!active) return
    const centerX = active.position.x + 100 // half of NODE_WIDTH
    const centerY = active.position.y + 30 // half of NODE_HEIGHT
    const currentZoom = reactFlow.getZoom()
    reactFlow.setCenter(centerX, centerY, { zoom: currentZoom, duration: 400 })
  }, [activeNodeId, flowNodes, reactFlow, replayState.isReplaying])

  const handleFitView = useCallback(() => {
    reactFlow.fitView({ duration: 300 })
    // Save the new fitted viewport after animation
    if (activeConversationId) {
      setTimeout(() => {
        const vp = reactFlow.getViewport()
        saveViewport(activeConversationId, vp)
      }, 350)
    }
  }, [reactFlow, activeConversationId])

  const handleResetView = useCallback(() => {
    reactFlow.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 300 })
    if (activeConversationId) {
      clearSavedViewport(activeConversationId)
    }
  }, [reactFlow, activeConversationId])

  // Keyboard shortcuts for toolbar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault()
        handleFitView()
      }
      if (e.ctrlKey && e.key === '0') {
        e.preventDefault()
        handleResetView()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [handleFitView, handleResetView])

  if (nodes.size === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-page text-fg-muted">
        Graph will appear here
      </div>
    )
  }

  return (
    <div className="relative h-full">
      {/* Graph toolbar */}
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-lg border border-border bg-surface/80 p-1 shadow-sm backdrop-blur-sm">
        <LabelFilter />
        <button
          onClick={toggleHeatmap}
          className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${heatmapState.enabled ? 'bg-accent/20 text-accent' : 'text-fg-muted hover:bg-elevated hover:text-fg-primary'}`}
          title={heatmapState.enabled ? 'Disable heatmap' : 'Enable heatmap'}
        >
          <Flame size={14} />
        </button>
        {heatmapState.enabled && (
          <select
            value={heatmapState.metric}
            onChange={(e) => setHeatmapMetric(e.target.value as HeatmapMetric)}
            className="h-7 rounded-md border-none bg-elevated px-1.5 text-[11px] text-fg-secondary outline-none"
          >
            <option value="tokens">Tokens</option>
            <option value="branches">Branches</option>
            <option value="recency">Recency</option>
          </select>
        )}
        <button
          onClick={() => startReplay(sortedNodeIds.length)}
          disabled={replayState.isReplaying || streamStatus === 'streaming' || sortedNodeIds.length < 2}
          className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${replayState.isReplaying ? 'bg-accent/20 text-accent' : 'text-fg-muted hover:bg-elevated hover:text-fg-primary'} disabled:opacity-30 disabled:cursor-not-allowed`}
          title="Replay conversation"
        >
          <History size={14} />
        </button>
        <div className="w-px bg-border" />
        <button
          onClick={() => setLayoutDirection(layoutDirection === 'TB' ? 'LR' : 'TB')}
          className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-elevated hover:text-fg-primary"
          title={layoutDirection === 'TB' ? 'Switch to horizontal layout' : 'Switch to vertical layout'}
        >
          {layoutDirection === 'TB' ? <ArrowLeftRight size={14} /> : <ArrowDownUp size={14} />}
        </button>
        <div className="w-px bg-border" />
        <button
          onClick={handleFitView}
          className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-elevated hover:text-fg-primary"
          title="Fit view (Ctrl+Shift+F)"
        >
          <Maximize2 size={14} />
        </button>
        <button
          onClick={handleResetView}
          className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-elevated hover:text-fg-primary"
          title="Reset zoom (Ctrl+0)"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onNodeContextMenu={handleNodeContextMenu}
        onPaneClick={handlePaneClick}
        onMoveEnd={handleMoveEnd}
        nodesDraggable={false}
        nodesConnectable={false}
        fitView
        minZoom={0.1}
        maxZoom={2}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as {
              role: string
              isMergeNode?: boolean
              isOnActivePath?: boolean
              isActive?: boolean
              pinned?: boolean
              excludedFromContext?: boolean
            }
            // Fog-of-war: dim nodes not on the active path
            if (!data.isOnActivePath) {
              return 'rgba(120, 120, 130, 0.3)'
            }
            // Active (selected) node gets bright highlight
            if (data.isActive) return '#f59e0b'
            if (data.isMergeNode) return edgeColors.merge
            if (data.role === 'system') return edgeColors.inactive
            if (data.role === 'user') return edgeColors.active
            return '#22c55e'
          }}
          nodeStrokeColor={(node) => {
            const data = node.data as { isOnActivePath?: boolean; isActive?: boolean }
            if (data.isActive) return '#f59e0b'
            if (data.isOnActivePath) return 'rgba(99, 102, 241, 0.6)'
            return 'transparent'
          }}
          nodeStrokeWidth={2}
        />
      </ReactFlow>
      {isLabelFiltering && flowNodes.length === 0 && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-page/80 text-fg-muted">
          <p className="text-sm">No nodes match the current filter</p>
          <button
            onClick={() => useUIStore.getState().clearLabelFilters()}
            className="mt-2 text-xs text-accent hover:underline"
          >
            Clear filter
          </button>
        </div>
      )}
      {heatmapState.enabled && <HeatmapLegend metric={heatmapState.metric} />}
      {replayState.isReplaying && <ReplayControls sortedNodeIds={sortedNodeIds} />}
      <PinnedNodesPanel />
      {contextMenu && (
        <NodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          onClose={() => setContextMenu(null)}
          onAnnotate={(nodeId, ax, ay) => {
            setContextMenu(null)
            setAnnotationPopover({ nodeId, x: ax, y: ay })
          }}
        />
      )}
      {annotationPopover && (
        <AnnotationPopover
          nodeId={annotationPopover.nodeId}
          x={annotationPopover.x}
          y={annotationPopover.y}
          onClose={() => setAnnotationPopover(null)}
        />
      )}
    </div>
  )
}

export function GraphPanel() {
  return (
    <ReactFlowProvider>
      <GraphPanelInner />
    </ReactFlowProvider>
  )
}
