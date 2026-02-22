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
import type { LayoutAlgorithm, BackgroundPattern } from '../../stores/uiStore'
import { useActivePath } from '../../hooks/useActivePath'
import { useGraphShortcuts } from '../../hooks/useGraphShortcuts'
import { getChildren } from '../../utils/tree'
import {
  Maximize2,
  RotateCcw,
  ArrowDownUp,
  ArrowLeftRight,
  Flame,
  History,
  Layout,
  Scaling,
  Fish,
  Network,
  Grid3x3,
  ChevronDown,
} from 'lucide-react'
import { computeLayout, applyFisheye, NODE_WIDTH, NODE_HEIGHT } from '../../utils/layout'
import { ConversationNodeMemo } from './ConversationNode'
import { NodeContextMenu } from './NodeContextMenu'
import { AnnotationPopover } from './AnnotationPopover'
import { PinnedNodesPanel } from './PinnedNodesPanel'
import { HeatmapLegend } from './HeatmapLegend'
import { ReplayControls } from './ReplayControls'
import { LabelFilter } from './LabelFilter'
import { StreamingEdgeMemo } from './StreamingEdge'
import { computeTopicClusters, TopicClusterOverlay, TopicLegend } from './TopicCluster'
import type { HeatmapMetric } from '../../stores/uiStore'

const nodeTypes = {
  conversation: ConversationNodeMemo,
}

const edgeTypes = {
  streaming: StreamingEdgeMemo,
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

const LAYOUT_ALGORITHMS: { value: LayoutAlgorithm; label: string; icon: string }[] = [
  { value: 'layered', label: 'Hierarchical', icon: '⬜' },
  { value: 'mrtree', label: 'Tree', icon: '🌲' },
  { value: 'force', label: 'Force', icon: '🔮' },
  { value: 'radial', label: 'Radial', icon: '🎯' },
]

const BG_PATTERNS: { value: BackgroundPattern; label: string }[] = [
  { value: 'dots', label: 'Dots' },
  { value: 'lines', label: 'Lines' },
  { value: 'cross', label: 'Cross' },
  { value: 'none', label: 'None' },
]

function getBackgroundVariant(pattern: BackgroundPattern): BackgroundVariant | null {
  switch (pattern) {
    case 'dots': return BackgroundVariant.Dots
    case 'lines': return BackgroundVariant.Lines
    case 'cross': return BackgroundVariant.Cross
    case 'none': return null
  }
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
  const layoutAlgorithm = useUIStore((s) => s.layoutAlgorithm)
  const setLayoutAlgorithm = useUIStore((s) => s.setLayoutAlgorithm)
  const backgroundPattern = useUIStore((s) => s.backgroundPattern)
  const setBackgroundPattern = useUIStore((s) => s.setBackgroundPattern)
  const fisheyeEnabled = useUIStore((s) => s.fisheyeEnabled)
  const toggleFisheye = useUIStore((s) => s.toggleFisheye)
  const dynamicNodeSizing = useUIStore((s) => s.dynamicNodeSizing)
  const toggleDynamicNodeSizing = useUIStore((s) => s.toggleDynamicNodeSizing)
  const showEdgeTokens = useUIStore((s) => s.showEdgeTokens)
  const toggleEdgeTokens = useUIStore((s) => s.toggleEdgeTokens)
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
  const [layoutPickerOpen, setLayoutPickerOpen] = useState(false)
  const [bgPickerOpen, setBgPickerOpen] = useState(false)
  const hasFitRef = useRef(false)
  const reactFlow = useReactFlow()

  // State for async layout results
  const [flowNodes, setFlowNodes] = useState<FlowNode[]>([])
  const [flowEdges, setFlowEdges] = useState<Edge[]>([])
  const layoutVersionRef = useRef(0)

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

  // Collect node topics from metadata
  const nodeTopics = useMemo(() => {
    const topics = new Map<string, string>()
    for (const node of nodes.values()) {
      const meta = (node.metadata ?? {}) as Record<string, unknown>
      const topic = meta.topic as string | undefined
      if (topic) topics.set(node.id, topic)
    }
    return topics
  }, [nodes])

  // Compute cumulative token counts per node (for edge labels)
  const nodeTokenCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const node of nodes.values()) {
      const meta = (node.metadata ?? {}) as Record<string, unknown>
      const usage = meta.usage as Record<string, unknown> | undefined
      if (usage) {
        const total = usage.total_tokens as number | undefined
        const prompt = (usage.prompt_tokens as number) ?? 0
        const completion = (usage.completion_tokens as number) ?? 0
        counts.set(node.id, total ?? prompt + completion)
      }
    }
    return counts
  }, [nodes])

  // Dynamic node sizing: compute widths based on significance
  const nodeSizes = useMemo(() => {
    if (!dynamicNodeSizing) return undefined
    const sizes = new Map<string, { width: number; height: number }>()
    let maxSignificance = 0

    // First pass: compute raw significance
    const rawSig = new Map<string, number>()
    for (const node of nodes.values()) {
      if (hiddenNodeIds.has(node.id)) continue
      if (replayVisibleIds && !replayVisibleIds.has(node.id)) continue

      let sig = 1
      const meta = (node.metadata ?? {}) as Record<string, unknown>
      const usage = meta.usage as Record<string, unknown> | undefined
      if (usage) {
        const tokens = (usage.total_tokens as number) ?? 0
        sig += Math.log2(Math.max(tokens, 1)) * 0.3
      }
      const branches = childCounts.get(node.id) ?? 0
      sig += branches * 0.5
      if (meta.rating === 'up') sig += 0.5
      rawSig.set(node.id, sig)
      if (sig > maxSignificance) maxSignificance = sig
    }

    // Second pass: normalize to width range [180, 300]
    for (const [nodeId, sig] of rawSig) {
      const normalized = maxSignificance > 0 ? sig / maxSignificance : 0.5
      const width = Math.round(180 + normalized * 120)
      const height = NODE_HEIGHT
      sizes.set(nodeId, { width, height })
    }

    return sizes
  }, [nodes, dynamicNodeSizing, childCounts, hiddenNodeIds, replayVisibleIds])

  // Build raw nodes (no dependency on streamStatus — avoids layout recomputation on stream start/stop)
  const rawNodes = useMemo(() => {
    const rNodes: FlowNode[] = []

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
      const topic = meta.topic as string | undefined
      const thinking = meta.thinking as { content?: string } | undefined
      const hasThinking = !!thinking?.content
      const files = meta.files as Array<unknown> | undefined
      const hasFiles = !!files && files.length > 0
      const fileCount = files?.length ?? 0
      const nodeAgentSteps = meta.agentSteps as Array<unknown> | undefined
      const hasAgentSteps = !!nodeAgentSteps && nodeAgentSteps.length > 0
      const agentStepCount = nodeAgentSteps?.length ?? 0

      // Label filter: skip nodes that don't match active filters
      if (isLabelFiltering) {
        if (labelColor) {
          if (labelFilter.activeFilters.size > 0 && !labelFilter.activeFilters.has(labelColor)) continue
        } else {
          if (!labelFilter.showUnlabeled) continue
        }
      }

      const nodeWidth = dynamicNodeSizing ? (nodeSizes?.get(node.id)?.width ?? NODE_WIDTH) : NODE_WIDTH + 40

      rNodes.push({
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
          topic,
          nodeWidth,
          hasThinking,
          hasFiles,
          fileCount,
          hasAgentSteps,
          agentStepCount,
        },
      })
    }

    return rNodes
  }, [nodes, activeNodeId, activePathIds, childCounts, hiddenNodeIds, collapsedNodeIds, heatmapValues, replayVisibleIds, isLabelFiltering, labelFilter, dynamicNodeSizing, nodeSizes])

  // Build raw edges (separated so streamStatus changes only affect edges, not layout)
  const rawEdges = useMemo(() => {
    const rEdges: Edge[] = []
    const isStreaming = streamStatus === 'streaming'

    for (const node of nodes.values()) {
      if (hiddenNodeIds.has(node.id)) continue
      if (replayVisibleIds && !replayVisibleIds.has(node.id)) continue

      if (node.parentId && !hiddenNodeIds.has(node.parentId) && (!replayVisibleIds || replayVisibleIds.has(node.parentId))) {
        const isActivePath =
          activePathIds.has(node.id) && activePathIds.has(node.parentId)

        // Determine if this edge is the streaming edge (last active edge while streaming)
        const isStreamingEdge = isStreaming && isActivePath && node.id === activeNodeId

        const tokenCount = showEdgeTokens ? (nodeTokenCounts.get(node.id) ?? 0) : 0

        // Use custom streaming edge type when streaming or showing tokens
        const useCustomEdge = isStreamingEdge || (showEdgeTokens && tokenCount > 0)

        rEdges.push({
          id: `${node.parentId}-${node.id}`,
          source: node.parentId,
          target: node.id,
          type: useCustomEdge ? 'streaming' : 'smoothstep',
          data: useCustomEdge ? {
            isStreaming: isStreamingEdge,
            isActivePath,
            tokenCount,
            showTokens: showEdgeTokens,
          } : undefined,
          style: {
            stroke: isActivePath ? edgeColors.active : edgeColors.inactive,
            strokeWidth: isActivePath ? 2.5 : 1.5,
          },
        })
      }
    }

    // Add merge edges (dashed purple lines)
    for (const me of mergeEdges) {
      if (hiddenNodeIds.has(me.parentId) || hiddenNodeIds.has(me.childId)) continue
      if (replayVisibleIds && (!replayVisibleIds.has(me.parentId) || !replayVisibleIds.has(me.childId))) continue
      rEdges.push({
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

    return rEdges
  }, [nodes, activeNodeId, activePathIds, mergeEdges, edgeColors, hiddenNodeIds, replayVisibleIds, streamStatus, showEdgeTokens, nodeTokenCounts])

  // Async layout computation via ELK.js (only depends on rawNodes, not rawEdges)
  useEffect(() => {
    if (rawNodes.length === 0) {
      setFlowNodes([])
      return
    }

    let cancelled = false
    const version = ++layoutVersionRef.current

    computeLayout(rawNodes, rawEdges, {
      direction: layoutDirection,
      algorithm: layoutAlgorithm,
      nodeSizes: nodeSizes,
    }).then((layoutedNodes) => {
      if (cancelled || version !== layoutVersionRef.current) return

      // Apply fisheye distortion if enabled
      const finalNodes = fisheyeEnabled
        ? applyFisheye(layoutedNodes, activeNodeId)
        : layoutedNodes

      setFlowNodes(finalNodes)
    })

    return () => { cancelled = true }
  }, [rawNodes, rawEdges, layoutDirection, layoutAlgorithm, nodeSizes, fisheyeEnabled, activeNodeId])

  // Update edges independently (no layout recomputation needed for edge styling changes)
  useEffect(() => {
    setFlowEdges(rawEdges)
  }, [rawEdges])

  // Compute topic cluster regions for SVG overlay
  const topicClusters = useMemo(() => {
    if (nodeTopics.size === 0) return []
    return computeTopicClusters(flowNodes, nodeTopics)
  }, [flowNodes, nodeTopics])

  const activeTopics = useMemo(() => {
    const topics = new Set<string>()
    for (const t of nodeTopics.values()) topics.add(t)
    return [...topics]
  }, [nodeTopics])

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
    setLayoutPickerOpen(false)
    setBgPickerOpen(false)
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
    const centerX = active.position.x + NODE_WIDTH / 2
    const centerY = active.position.y + NODE_HEIGHT / 2
    const currentZoom = reactFlow.getZoom()
    reactFlow.setCenter(centerX, centerY, { zoom: currentZoom, duration: 400 })
  }, [activeNodeId, flowNodes, reactFlow, replayState.isReplaying])

  const handleFitView = useCallback(() => {
    reactFlow.fitView({ duration: 300 })
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

  const bgVariant = getBackgroundVariant(backgroundPattern)

  if (nodes.size === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-fg-muted gap-3">
        <div className="glass flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--glass-border)]">
          <Maximize2 size={20} className="text-fg-muted" />
        </div>
        <p className="text-sm">Graph will appear here</p>
        <p className="text-xs text-fg-muted">Send a message to start building the tree</p>
      </div>
    )
  }

  return (
    <div className="relative h-full">
      {/* Graph toolbar */}
      <div className="glass absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-xl border border-[var(--glass-border)] p-1.5 shadow-md">
        <LabelFilter />

        <button
          onClick={toggleHeatmap}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${heatmapState.enabled ? 'bg-accent/20 text-accent' : 'text-fg-muted hover:bg-[var(--glass-bg-elevated)] hover:text-fg-primary'}`}
          title={heatmapState.enabled ? 'Disable heatmap' : 'Enable heatmap'}
        >
          <Flame size={14} />
        </button>
        {heatmapState.enabled && (
          <div className="flex rounded-lg border border-[var(--glass-border)] overflow-hidden">
            {(['tokens', 'branches', 'recency'] as const).map((metric) => (
              <button
                key={metric}
                onClick={() => setHeatmapMetric(metric)}
                className={`px-2 py-1 text-[11px] font-medium transition-colors ${
                  heatmapState.metric === metric
                    ? 'bg-accent/20 text-accent'
                    : 'text-fg-muted hover:bg-[var(--glass-bg-elevated)] hover:text-fg-primary'
                }`}
              >
                {metric.charAt(0).toUpperCase() + metric.slice(1)}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => startReplay(sortedNodeIds.length)}
          disabled={replayState.isReplaying || streamStatus === 'streaming' || sortedNodeIds.length < 2}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${replayState.isReplaying ? 'bg-accent/20 text-accent' : 'text-fg-muted hover:bg-[var(--glass-bg-elevated)] hover:text-fg-primary'} disabled:opacity-30 disabled:cursor-not-allowed`}
          title="Replay conversation"
        >
          <History size={14} />
        </button>

        <div className="w-px h-5 bg-[var(--glass-border)]" />

        {/* F065: Dynamic node sizing toggle */}
        <button
          onClick={toggleDynamicNodeSizing}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${dynamicNodeSizing ? 'bg-accent/20 text-accent' : 'text-fg-muted hover:bg-[var(--glass-bg-elevated)] hover:text-fg-primary'}`}
          title={dynamicNodeSizing ? 'Disable dynamic sizing' : 'Enable dynamic sizing'}
        >
          <Scaling size={14} />
        </button>

        {/* F066: Fisheye toggle */}
        <button
          onClick={toggleFisheye}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${fisheyeEnabled ? 'bg-accent/20 text-accent' : 'text-fg-muted hover:bg-[var(--glass-bg-elevated)] hover:text-fg-primary'}`}
          title={fisheyeEnabled ? 'Disable fisheye' : 'Enable fisheye focus'}
        >
          <Fish size={14} />
        </button>

        {/* F068: Edge token toggle */}
        <button
          onClick={toggleEdgeTokens}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${showEdgeTokens ? 'bg-accent/20 text-accent' : 'text-fg-muted hover:bg-[var(--glass-bg-elevated)] hover:text-fg-primary'}`}
          title={showEdgeTokens ? 'Hide edge tokens' : 'Show edge tokens'}
        >
          <Network size={14} />
        </button>

        <div className="w-px h-5 bg-[var(--glass-border)]" />

        {/* F062: Layout algorithm picker */}
        <div className="relative">
          <button
            onClick={() => { setLayoutPickerOpen(!layoutPickerOpen); setBgPickerOpen(false) }}
            className="flex h-8 items-center gap-1 rounded-lg px-2 text-fg-muted transition-colors hover:bg-[var(--glass-bg-elevated)] hover:text-fg-primary"
            title="Layout algorithm"
          >
            <Layout size={14} />
            <span className="text-[11px] font-medium">
              {LAYOUT_ALGORITHMS.find((a) => a.value === layoutAlgorithm)?.label ?? 'Layout'}
            </span>
            <ChevronDown size={10} />
          </button>
          {layoutPickerOpen && (
            <div className="glass-strong absolute right-0 top-full mt-1 min-w-[160px] rounded-lg border border-[var(--glass-border)] py-1 shadow-lg z-50">
              {LAYOUT_ALGORITHMS.map((algo) => (
                <button
                  key={algo.value}
                  onClick={() => { setLayoutAlgorithm(algo.value); setLayoutPickerOpen(false) }}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
                    layoutAlgorithm === algo.value
                      ? 'bg-accent/15 text-accent'
                      : 'text-fg-secondary hover:bg-[var(--glass-bg-elevated)] hover:text-fg-primary'
                  }`}
                >
                  <span>{algo.icon}</span>
                  <span>{algo.label}</span>
                </button>
              ))}
              <div className="my-1 border-t border-[var(--glass-border)]" />
              <div className="px-3 py-1 text-[10px] text-fg-muted">Direction</div>
              <button
                onClick={() => { setLayoutDirection(layoutDirection === 'TB' ? 'LR' : 'TB'); setLayoutPickerOpen(false) }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-fg-secondary hover:bg-[var(--glass-bg-elevated)] hover:text-fg-primary"
              >
                {layoutDirection === 'TB' ? <ArrowLeftRight size={12} /> : <ArrowDownUp size={12} />}
                <span>{layoutDirection === 'TB' ? 'Switch to horizontal' : 'Switch to vertical'}</span>
              </button>
            </div>
          )}
        </div>

        {/* F070: Background pattern picker */}
        <div className="relative">
          <button
            onClick={() => { setBgPickerOpen(!bgPickerOpen); setLayoutPickerOpen(false) }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-[var(--glass-bg-elevated)] hover:text-fg-primary"
            title="Background pattern"
          >
            <Grid3x3 size={14} />
          </button>
          {bgPickerOpen && (
            <div className="glass-strong absolute right-0 top-full mt-1 min-w-[120px] rounded-lg border border-[var(--glass-border)] py-1 shadow-lg z-50">
              {BG_PATTERNS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => { setBackgroundPattern(p.value); setBgPickerOpen(false) }}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
                    backgroundPattern === p.value
                      ? 'bg-accent/15 text-accent'
                      : 'text-fg-secondary hover:bg-[var(--glass-bg-elevated)] hover:text-fg-primary'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-[var(--glass-border)]" />

        <button
          onClick={handleFitView}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-[var(--glass-bg-elevated)] hover:text-fg-primary"
          title="Fit view (Ctrl+Shift+F)"
        >
          <Maximize2 size={14} />
        </button>
        <button
          onClick={handleResetView}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-[var(--glass-bg-elevated)] hover:text-fg-primary"
          title="Reset zoom (Ctrl+0)"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
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
        {/* F070: Configurable background */}
        {bgVariant !== null && <Background variant={bgVariant} gap={16} size={1} />}

        {/* F067: Topic cluster overlay (rendered as SVG in the flow viewport) */}
        {topicClusters.length > 0 && (
          <svg className="react-flow__edge-textwrapper" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: -1 }}>
            <TopicClusterOverlay clusters={topicClusters} />
          </svg>
        )}

        <Controls />

        {/* F069: Interactive minimap with pannable + zoomable */}
        <MiniMap
          pannable
          zoomable
          nodeColor={(node) => {
            const data = node.data as {
              role: string
              isMergeNode?: boolean
              isOnActivePath?: boolean
              isActive?: boolean
              pinned?: boolean
              excludedFromContext?: boolean
              topic?: string
            }
            // Fog-of-war: dim nodes not on the active path
            if (!data.isOnActivePath) {
              return 'rgba(120, 120, 130, 0.3)'
            }
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
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--color-page)]/80 text-fg-muted">
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

      {/* F067: Topic legend */}
      {activeTopics.length > 0 && <TopicLegend topics={activeTopics} />}

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
