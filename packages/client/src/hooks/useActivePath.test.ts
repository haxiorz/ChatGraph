import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useActivePath } from './useActivePath'
import { useConversationStore } from '../stores/conversationStore'
import { makeClientNode, resetCounter } from '../test/helpers/fixtures'

beforeEach(() => {
  resetCounter()
  useConversationStore.setState({
    nodes: new Map(),
    activeNodeId: null,
  })
})

describe('useActivePath', () => {
  it('returns empty array when no active node', () => {
    const { result } = renderHook(() => useActivePath())
    expect(result.current).toEqual([])
  })

  it('returns path from root to active node', () => {
    const nodes = new Map()
    const root = makeClientNode({ id: 'root', parentId: null, role: 'system' })
    const user = makeClientNode({ id: 'user', parentId: 'root', role: 'user' })
    const asst = makeClientNode({ id: 'asst', parentId: 'user', role: 'assistant' })
    nodes.set('root', root)
    nodes.set('user', user)
    nodes.set('asst', asst)

    useConversationStore.setState({ nodes, activeNodeId: 'asst' })

    const { result } = renderHook(() => useActivePath())
    expect(result.current.map((n) => n.id)).toEqual(['root', 'user', 'asst'])
  })

  it('returns single node path for root', () => {
    const nodes = new Map()
    const root = makeClientNode({ id: 'root', parentId: null })
    nodes.set('root', root)

    useConversationStore.setState({ nodes, activeNodeId: 'root' })

    const { result } = renderHook(() => useActivePath())
    expect(result.current).toHaveLength(1)
  })
})
