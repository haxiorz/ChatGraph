import { create } from 'zustand'
import type { ConversationNode } from '../types/index'

interface TournamentModelState {
  model: string
  status: 'streaming' | 'done' | 'error'
  content: string
  node: ConversationNode | null
  timing: { ttft: number; totalDuration: number } | null
  error: string | null
}

interface TournamentStore {
  active: boolean
  models: TournamentModelState[]
  userNodeId: string | null
  winnerId: string | null

  startTournament: (models: string[]) => void
  setUserNodeId: (id: string) => void
  appendToken: (modelIndex: number, content: string) => void
  setModelDone: (
    modelIndex: number,
    node: ConversationNode,
    timing: { ttft: number; totalDuration: number },
  ) => void
  setModelError: (modelIndex: number, message: string) => void
  pickWinner: (nodeId: string) => void
  reset: () => void
}

export const useTournamentStore = create<TournamentStore>((set, get) => ({
  active: false,
  models: [],
  userNodeId: null,
  winnerId: null,

  startTournament: (models: string[]) => {
    set({
      active: true,
      winnerId: null,
      userNodeId: null,
      models: models.map((model) => ({
        model,
        status: 'streaming',
        content: '',
        node: null,
        timing: null,
        error: null,
      })),
    })
  },

  setUserNodeId: (id: string) => {
    set({ userNodeId: id })
  },

  appendToken: (modelIndex: number, content: string) => {
    const models = [...get().models]
    const m = models[modelIndex]
    if (!m) return
    models[modelIndex] = { ...m, content: m.content + content }
    set({ models })
  },

  setModelDone: (modelIndex, node, timing) => {
    const models = [...get().models]
    const m = models[modelIndex]
    if (!m) return
    models[modelIndex] = { ...m, status: 'done', node, timing }
    set({ models })
  },

  setModelError: (modelIndex, message) => {
    const models = [...get().models]
    const m = models[modelIndex]
    if (!m) return
    models[modelIndex] = { ...m, status: 'error', error: message }
    set({ models })
  },

  pickWinner: (nodeId: string) => {
    set({ winnerId: nodeId, active: false })
  },

  reset: () => {
    set({
      active: false,
      models: [],
      userNodeId: null,
      winnerId: null,
    })
  },
}))
