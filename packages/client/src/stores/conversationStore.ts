import { create } from 'zustand'
import type { Conversation, ConversationNode, MergeEdge } from '../types/index'
import { useUIStore } from './uiStore'
import * as api from '../services/api'

interface ConversationStore {
  conversations: Conversation[]
  activeConversationId: string | null
  nodes: Map<string, ConversationNode>
  activeNodeId: string | null
  mergeEdges: MergeEdge[]

  loadConversations: () => Promise<void>
  loadConversation: (id: string) => Promise<void>
  setActiveNode: (nodeId: string) => void
  addNode: (node: ConversationNode) => void
  addNodeSilent: (node: ConversationNode) => void
  removeNode: (nodeId: string) => void
  setConversations: (conversations: Conversation[]) => void
  updateNodeData: (
    nodeId: string,
    input: { content?: string; metadata?: Record<string, unknown> },
  ) => Promise<void>
  updateConversationTitle: (id: string, title: string) => void
  reset: () => void
}

export const useConversationStore = create<ConversationStore>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  nodes: new Map(),
  activeNodeId: null,
  mergeEdges: [],

  loadConversations: async () => {
    const conversations = await api.listConversations()
    set({ conversations })
  },

  loadConversation: async (id: string) => {
    const conversation = await api.getConversation(id)
    const nodeMap = new Map<string, ConversationNode>()
    for (const node of conversation.nodes) {
      nodeMap.set(node.id, node)
    }

    // Extract merge edges if present
    const mergeEdges: MergeEdge[] = (
      conversation as unknown as { mergeEdges?: MergeEdge[] }
    ).mergeEdges ?? []

    // Find the deepest node on the rightmost branch (latest created leaf)
    let activeNodeId: string | null = null
    if (conversation.nodes.length > 0) {
      // Find leaf nodes (nodes that aren't parents of any other node)
      const parentIds = new Set(
        conversation.nodes
          .map((n) => n.parentId)
          .filter((id): id is string => id !== null),
      )
      const leaves = conversation.nodes.filter((n) => !parentIds.has(n.id))
      // Pick the most recently created leaf
      const latest = leaves.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0]
      activeNodeId = latest?.id ?? conversation.nodes[0]?.id ?? null
    }

    useUIStore.getState().clearCollapsed()
    useUIStore.getState().clearLabelFilters()
    set({
      activeConversationId: id,
      nodes: nodeMap,
      activeNodeId,
      mergeEdges,
    })
  },

  setActiveNode: (nodeId: string) => {
    set({ activeNodeId: nodeId })
  },

  addNode: (node: ConversationNode) => {
    const nodes = new Map(get().nodes)
    nodes.set(node.id, node)
    set({ nodes, activeNodeId: node.id })
  },

  addNodeSilent: (node: ConversationNode) => {
    const nodes = new Map(get().nodes)
    nodes.set(node.id, node)
    set({ nodes })
  },

  removeNode: (nodeId: string) => {
    const nodes = new Map(get().nodes)
    nodes.delete(nodeId)
    set({ nodes })
  },

  setConversations: (conversations: Conversation[]) => {
    set({ conversations })
  },

  updateNodeData: async (nodeId, input) => {
    const updated = await api.updateNode(nodeId, input)
    const nodes = new Map(get().nodes)
    nodes.set(nodeId, updated)
    set({ nodes })
  },

  updateConversationTitle: (id, title) => {
    set({
      conversations: get().conversations.map((c) =>
        c.id === id ? { ...c, title } : c,
      ),
    })
  },

  reset: () => {
    useUIStore.getState().clearCollapsed()
    useUIStore.getState().clearLabelFilters()
    set({
      activeConversationId: null,
      nodes: new Map(),
      activeNodeId: null,
      mergeEdges: [],
    })
  },
}))
