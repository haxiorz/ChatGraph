import { create } from 'zustand'
import type { StreamState } from '../types/index'

interface CompareState {
  isComparing: boolean
  branchPointId: string | null
  leftBranchId: string | null
  rightBranchId: string | null
}

export type LayoutDirection = 'TB' | 'LR'

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
  analyticsOpen: boolean
  heatmapState: HeatmapState
  replayState: ReplayState
  labelFilter: LabelFilterState
  summarizeDismissed: Set<string>

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
}

const INITIAL_COMPARE_STATE: CompareState = {
  isComparing: false,
  branchPointId: null,
  leftBranchId: null,
  rightBranchId: null,
}

const LAYOUT_STORAGE_KEY = 'chatgraph-layout-direction'

function loadLayoutDirection(): LayoutDirection {
  const stored = localStorage.getItem(LAYOUT_STORAGE_KEY)
  return stored === 'LR' ? 'LR' : 'TB'
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
  analyticsOpen: false,
  heatmapState: { enabled: false, metric: 'tokens' },
  replayState: { isReplaying: false, replayIndex: 0, maxIndex: 0, isPlaying: false, playbackSpeed: 1 },
  labelFilter: { activeFilters: new Set<string>(), showUnlabeled: true },
  summarizeDismissed: new Set<string>(),

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
}))
