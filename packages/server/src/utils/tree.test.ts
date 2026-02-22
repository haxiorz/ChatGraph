import { describe, it, expect } from 'vitest'
import { buildPath, pathToMessages } from './tree.js'

describe('buildPath', () => {
  const nodes = [
    { id: 'root', parentId: null, role: 'system' as const, content: 'System prompt' },
    { id: 'user1', parentId: 'root', role: 'user' as const, content: 'Hello' },
    { id: 'asst1', parentId: 'user1', role: 'assistant' as const, content: 'Hi' },
    { id: 'user2', parentId: 'asst1', role: 'user' as const, content: 'Follow up' },
    { id: 'asst2', parentId: 'user1', role: 'assistant' as const, content: 'Alt' },
  ]

  it('builds path from root to a deep node', () => {
    const path = buildPath(nodes, 'user2')
    expect(path.map((n) => n.id)).toEqual(['root', 'user1', 'asst1', 'user2'])
  })

  it('returns single node when target is root', () => {
    const path = buildPath(nodes, 'root')
    expect(path).toHaveLength(1)
    expect(path[0]!.id).toBe('root')
  })

  it('follows the correct branch', () => {
    const path = buildPath(nodes, 'asst2')
    expect(path.map((n) => n.id)).toEqual(['root', 'user1', 'asst2'])
  })

  it('returns empty array for unknown target', () => {
    const path = buildPath(nodes, 'nonexistent')
    expect(path).toEqual([])
  })

  it('handles empty nodes array', () => {
    const path = buildPath([], 'any')
    expect(path).toEqual([])
  })
})

describe('pathToMessages', () => {
  it('converts path nodes to OpenRouter messages', async () => {
    const path = [
      { id: 'root', parentId: null, role: 'system' as const, content: 'You are helpful' },
      { id: 'user1', parentId: 'root', role: 'user' as const, content: 'Hello' },
    ]
    const messages = await pathToMessages(path)
    expect(messages).toEqual([
      { role: 'system', content: 'You are helpful' },
      { role: 'user', content: 'Hello' },
    ])
  })

  it('returns empty array for empty path', async () => {
    expect(await pathToMessages([])).toEqual([])
  })
})
