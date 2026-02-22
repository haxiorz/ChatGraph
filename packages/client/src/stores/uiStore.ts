import { create } from 'zustand'
import type { StreamState, ThinkingLevel, RoutingTier, RoutingTierConfig, RoutingDecision } from '../types/index'

interface CompareState {
  isComparing: boolean
  branchPointId: string | null
  leftBranchId: string | null
  rightBranchId: string | null
}

export type LayoutDirection = 'TB' | 'LR'
export type LayoutAlgorithm = 'layered' | 'mrtree' | 'force' | 'radial'
export type BackgroundPattern = 'dots' | 'lines' | 'cross' | 'none'

export type HeatmapMetric = 'tokens' | 'branches' | 'recency'

interface HeatmapState {
  enabled: boolean
  metric: HeatmapMetric
}

interface ReplayState {
  isReplaying: boolean
  replayIndex: number
  maxIndex: number
  isPlaying: boolean
  playbackSpeed: number
}

interface LabelFilterState {
  activeFilters: Set<string>
  showUnlabeled: boolean
}

interface UIStore {
  chatPanelWidth: number
  streamState: StreamState
  selectedModel: string
  abortController: AbortController | null
  settingsOpen: boolean
  shortcutsHelpOpen: boolean
  searchOpen: boolean
  compareState: CompareState
  collapsedNodeIds: Set<string>
  layoutDirection: LayoutDirection
  layoutAlgorithm: LayoutAlgorithm
  backgroundPattern: BackgroundPattern
  fisheyeEnabled: boolean
  dynamicNodeSizing: boolean
  showEdgeTokens: boolean
  analyticsOpen: boolean
  heatmapState: HeatmapState
  replayState: ReplayState
  labelFilter: LabelFilterState
  summarizeDismissed: Set<string>
  // F079: Thinking level
  thinkingLevel: ThinkingLevel
  // F078: Smart routing
  smartRouterEnabled: boolean
  routingTierConfig: RoutingTierConfig[]
  lastRoutingDecision: RoutingDecision | null

  setChatPanelWidth: (width: number) => void
  setStreamState: (state: StreamState) => void
  setSelectedModel: (model: string) => void
  setAbortController: (controller: AbortController | null) => void
  setSettingsOpen: (open: boolean) => void
  setShortcutsHelpOpen: (open: boolean) => void
  setSearchOpen: (open: boolean) => void
  setCompareState: (state: CompareState) => void
  resetCompareState: () => void
  toggleCollapsed: (nodeId: string) => void
  clearCollapsed: () => void
  setLayoutDirection: (direction: LayoutDirection) => void
  setLayoutAlgorithm: (algorithm: LayoutAlgorithm) => void
  setBackgroundPattern: (pattern: BackgroundPattern) => void
  toggleFisheye: () => void
  toggleDynamicNodeSizing: () => void
  toggleEdgeTokens: () => void
  setAnalyticsOpen: (open: boolean) => void
  toggleHeatmap: () => void
  setHeatmapMetric: (metric: HeatmapMetric) => void
  startReplay: (maxIndex: number) => void
  exitReplay: () => void
  setReplayIndex: (index: number) => void
  setReplayPlaying: (isPlaying: boolean) => void
  setReplaySpeed: (speed: number) => void
  toggleLabelFilter: (color: string) => void
  setShowUnlabeled: (show: boolean) => void
  clearLabelFilters: () => void
  dismissSummarize: (conversationId: string) => void
  // F079: Thinking level
  setThinkingLevel: (level: ThinkingLevel) => void
  // F078: Smart routing
  toggleSmartRouter: () => void
  setRoutingTierConfig: (config: RoutingTierConfig[]) => void
  setLastRoutingDecision: (decision: RoutingDecision | null) => void
}

const INITIAL_COMPARE_STATE: CompareState = {
  isComparing: false,
  branchPointId: null,
  leftBranchId: null,
  rightBranchId: null,
}

const LAYOUT_STORAGE_KEY = 'chatgraph-layout-direction'
const LAYOUT_ALGO_STORAGE_KEY = 'chatgraph-layout-algorithm'
const BG_PATTERN_STORAGE_KEY = 'chatgraph-bg-pattern'
const THINKING_LEVEL_KEY = 'chatgraph-thinking-level'
const SMART_ROUTER_KEY = 'chatgraph-smart-router'
const ROUTING_CONFIG_KEY = 'chatgraph-routing-config'

function loadLayoutDirection(): LayoutDirection {
  const stored = localStorage.getItem(LAYOUT_STORAGE_KEY)
  return stored === 'LR' ? 'LR' : 'TB'
}

function loadLayoutAlgorithm(): LayoutAlgorithm {
  const stored = localStorage.getItem(LAYOUT_ALGO_STORAGE_KEY)
  if (stored === 'mrtree' || stored === 'force' || stored === 'radial') return stored
  return 'layered'
}

function loadBackgroundPattern(): BackgroundPattern {
  const stored = localStorage.getItem(BG_PATTERN_STORAGE_KEY)
  if (stored === 'lines' || stored === 'cross' || stored === 'none') return stored
  return 'dots'
}

function loadThinkingLevel(): ThinkingLevel {
  const stored = localStorage.getItem(THINKING_LEVEL_KEY)
  if (stored === 'thinking' || stored === 'deep') return stored
  return 'fast'
}

function loadSmartRouter(): boolean {
  return localStorage.getItem(SMART_ROUTER_KEY) === 'true'
}

const DEFAULT_ROUTING_CONFIG: RoutingTierConfig[] = [
  { tier: 'simple', label: 'Simple', description: 'Short answers, acknowledgments', modelId: 'openai/gpt-4o-mini' },
  { tier: 'standard', label: 'Standard', description: 'General questions and tasks', modelId: 'openai/gpt-4o' },
  { tier: 'complex', label: 'Complex', description: 'Analysis, reasoning, long prompts', modelId: 'anthropic/claude-sonnet-4' },
  { tier: 'code', label: 'Code', description: 'Programming and technical tasks', modelId: 'anthropic/claude-sonnet-4' },
]

function loadRoutingConfig(): RoutingTierConfig[] {
  const stored = localStorage.getItem(ROUTING_CONFIG_KEY)
  if (!stored) return DEFAULT_ROUTING_CONFIG
  try {
    return JSON.parse(stored) as RoutingTierConfig[]
  } catch {
    return DEFAULT_ROUTING_CONFIG
  }
}

export const useUIStore = create<UIStore>((set, get) => ({
  chatPanelWidth: 50,
  streamState: { status: 'idle' },
  selectedModel: 'openai/gpt-4o-mini',
  abortController: null,
  settingsOpen: false,
  shortcutsHelpOpen: false,
  searchOpen: false,
  compareState: INITIAL_COMPARE_STATE,
  collapsedNodeIds: new Set<string>(),
  layoutDirection: loadLayoutDirection(),
  layoutAlgorithm: loadLayoutAlgorithm(),
  backgroundPattern: loadBackgroundPattern(),
  fisheyeEnabled: false,
  dynamicNodeSizing: false,
  showEdgeTokens: false,
  analyticsOpen: false,
  heatmapState: { enabled: false, metric: 'tokens' },
  replayState: { isReplaying: false, replayIndex: 0, maxIndex: 0, isPlaying: false, playbackSpeed: 1 },
  labelFilter: { activeFilters: new Set<string>(), showUnlabeled: true },
  summarizeDismissed: new Set<string>(),
  thinkingLevel: loadThinkingLevel(),
  smartRouterEnabled: loadSmartRouter(),
  routingTierConfig: loadRoutingConfig(),
  lastRoutingDecision: null,

  setChatPanelWidth: (width: number) => set({ chatPanelWidth: width }),
  setStreamState: (streamState: StreamState) => set({ streamState }),
  setSelectedModel: (selectedModel: string) => set({ selectedModel }),
  setAbortController: (abortController: AbortController | null) =>
    set({ abortController }),
  setSettingsOpen: (settingsOpen: boolean) => set({ settingsOpen }),
  setShortcutsHelpOpen: (shortcutsHelpOpen: boolean) =>
    set({ shortcutsHelpOpen }),
  setSearchOpen: (searchOpen: boolean) => set({ searchOpen }),
  setCompareState: (compareState: CompareState) => set({ compareState }),
  resetCompareState: () => set({ compareState: INITIAL_COMPARE_STATE }),
  toggleCollapsed: (nodeId: string) => {
    const next = new Set(get().collapsedNodeIds)
    if (next.has(nodeId)) {
      next.delete(nodeId)
    } else {
      next.add(nodeId)
    }
    set({ collapsedNodeIds: next })
  },
  clearCollapsed: () => set({ collapsedNodeIds: new Set<string>() }),
  setLayoutDirection: (direction: LayoutDirection) => {
    localStorage.setItem(LAYOUT_STORAGE_KEY, direction)
    set({ layoutDirection: direction })
  },
  setLayoutAlgorithm: (algorithm: LayoutAlgorithm) => {
    localStorage.setItem(LAYOUT_ALGO_STORAGE_KEY, algorithm)
    set({ layoutAlgorithm: algorithm })
  },
  setBackgroundPattern: (pattern: BackgroundPattern) => {
    localStorage.setItem(BG_PATTERN_STORAGE_KEY, pattern)
    set({ backgroundPattern: pattern })
  },
  toggleFisheye: () => set({ fisheyeEnabled: !get().fisheyeEnabled }),
  toggleDynamicNodeSizing: () => set({ dynamicNodeSizing: !get().dynamicNodeSizing }),
  toggleEdgeTokens: () => set({ showEdgeTokens: !get().showEdgeTokens }),
  setAnalyticsOpen: (analyticsOpen: boolean) => set({ analyticsOpen }),
  toggleHeatmap: () => {
    const current = get().heatmapState
    set({ heatmapState: { ...current, enabled: !current.enabled } })
  },
  setHeatmapMetric: (metric: HeatmapMetric) => {
    set({ heatmapState: { ...get().heatmapState, metric } })
  },
  startReplay: (maxIndex: number) => {
    set({
      replayState: { isReplaying: true, replayIndex: 1, maxIndex, isPlaying: false, playbackSpeed: 1 },
      collapsedNodeIds: new Set<string>(),
    })
  },
  exitReplay: () => {
    set({
      replayState: { isReplaying: false, replayIndex: 0, maxIndex: 0, isPlaying: false, playbackSpeed: 1 },
    })
  },
  setReplayIndex: (replayIndex: number) => {
    set({ replayState: { ...get().replayState, replayIndex } })
  },
  setReplayPlaying: (isPlaying: boolean) => {
    set({ replayState: { ...get().replayState, isPlaying } })
  },
  setReplaySpeed: (speed: number) => {
    set({ replayState: { ...get().replayState, playbackSpeed: speed } })
  },
  toggleLabelFilter: (color: string) => {
    const next = new Set(get().labelFilter.activeFilters)
    if (next.has(color)) {
      next.delete(color)
    } else {
      next.add(color)
    }
    set({ labelFilter: { ...get().labelFilter, activeFilters: next } })
  },
  setShowUnlabeled: (show: boolean) => {
    set({ labelFilter: { ...get().labelFilter, showUnlabeled: show } })
  },
  clearLabelFilters: () => {
    set({ labelFilter: { activeFilters: new Set<string>(), showUnlabeled: true } })
  },
  dismissSummarize: (conversationId: string) => {
    const next = new Set(get().summarizeDismissed)
    next.add(conversationId)
    set({ summarizeDismissed: next })
  },
  setThinkingLevel: (level: ThinkingLevel) => {
    localStorage.setItem(THINKING_LEVEL_KEY, level)
    set({ thinkingLevel: level })
  },
  toggleSmartRouter: () => {
    const next = !get().smartRouterEnabled
    localStorage.setItem(SMART_ROUTER_KEY, String(next))
    set({ smartRouterEnabled: next })
  },
  setRoutingTierConfig: (config: RoutingTierConfig[]) => {
    localStorage.setItem(ROUTING_CONFIG_KEY, JSON.stringify(config))
    set({ routingTierConfig: config })
  },
  setLastRoutingDecision: (decision: RoutingDecision | null) => {
    set({ lastRoutingDecision: decision })
  },
}))
