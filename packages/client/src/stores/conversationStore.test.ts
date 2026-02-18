import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useConversationStore } from './conversationStore'
import * as api from '../services/api'
import type { ConversationNode } from '../types/index'

vi.mock('../services/api', () => ({
  listConversations: vi.fn(),
  getConversation: vi.fn(),
}))

beforeEach(() => {
  useConversationStore.setState({
    conversations: [],
    activeConversationId: null,
    nodes: new Map(),
    activeNodeId: null,
    mergeEdges: [],
  })
  vi.clearAllMocks()
})

describe('conversationStore', () => {
  it('has correct initial state', () => {
    const state = useConversationStore.getState()
    expect(state.conversations).toEqual([])
    expect(state.activeConversationId).toBeNull()
    expect(state.nodes.size).toBe(0)
    expect(state.activeNodeId).toBeNull()
  })

  describe('addNode', () => {
    it('adds a node to the map and sets it as active', () => {
      const node: ConversationNode = {
        id: 'n1', conversationId: 'c1', parentId: null,
        role: 'user', content: 'Hello', model: null, metadata: null, createdAt: '2025-01-01',
      }

      useConversationStore.getState().addNode(node)

      const state = useConversationStore.getState()
      expect(state.nodes.get('n1')).toEqual(node)
      expect(state.activeNodeId).toBe('n1')
    })
  })

  describe('removeNode', () => {
    it('removes a node from the map', () => {
      const node: ConversationNode = {
        id: 'n1', conversationId: 'c1', parentId: null,
        role: 'user', content: 'Hello', model: null, metadata: null, createdAt: '2025-01-01',
      }
      useConversationStore.getState().addNode(node)
      useConversationStore.getState().removeNode('n1')

      expect(useConversationStore.getState().nodes.has('n1')).toBe(false)
    })
  })

  describe('setActiveNode', () => {
    it('sets the active node id', () => {
      useConversationStore.getState().setActiveNode('n1')
      expect(useConversationStore.getState().activeNodeId).toBe('n1')
    })
  })

  describe('reset', () => {
    it('resets to initial state', () => {
      useConversationStore.getState().addNode({
        id: 'n1', conversationId: 'c1', parentId: null,
        role: 'user', content: 'Hello', model: null, metadata: null, createdAt: '2025-01-01',
      })
      useConversationStore.setState({ activeConversationId: 'c1' })

      useConversationStore.getState().reset()

      const state = useConversationStore.getState()
      expect(state.activeConversationId).toBeNull()
      expect(state.nodes.size).toBe(0)
      expect(state.activeNodeId).toBeNull()
    })
  })

  describe('loadConversations', () => {
    it('fetches and sets conversations', async () => {
      const convos = [{ id: 'c1', title: 'Test' }]
      vi.mocked(api.listConversations).mockResolvedValue(convos as never)

      await useConversationStore.getState().loadConversations()
      expect(useConversationStore.getState().conversations).toEqual(convos)
    })
  })

  describe('loadConversation', () => {
    it('loads conversation and selects the latest leaf node', async () => {
      vi.mocked(api.getConversation).mockResolvedValue({
        id: 'c1',
        title: 'Test',
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
        nodes: [
          { id: 'n1', conversationId: 'c1', parentId: null, role: 'system', content: 'Sys', model: null, metadata: null, createdAt: '2025-01-01T00:00:00Z' },
          { id: 'n2', conversationId: 'c1', parentId: 'n1', role: 'user', content: 'Hello', model: null, metadata: null, createdAt: '2025-01-01T00:01:00Z' },
          { id: 'n3', conversationId: 'c1', parentId: 'n2', role: 'assistant', content: 'Hi', model: 'gpt-4', metadata: null, createdAt: '2025-01-01T00:02:00Z' },
        ],
      } as never)

      await useConversationStore.getState().loadConversation('c1')
      const state = useConversationStore.getState()

      expect(state.activeConversationId).toBe('c1')
      expect(state.nodes.size).toBe(3)
      // n3 is the only leaf (latest) → should be active
      expect(state.activeNodeId).toBe('n3')
    })

    it('handles conversation with no nodes', async () => {
      vi.mocked(api.getConversation).mockResolvedValue({
        id: 'c1', title: 'Empty', createdAt: '2025-01-01', updatedAt: '2025-01-01', nodes: [],
      } as never)

      await useConversationStore.getState().loadConversation('c1')
      expect(useConversationStore.getState().activeNodeId).toBeNull()
    })
  })
})
