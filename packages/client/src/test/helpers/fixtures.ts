import type { ConversationNode, Conversation } from '../../types/index'

let counter = 0

interface MakeClientNodeOptions {
  id?: string
  conversationId?: string
  parentId?: string | null
  role?: 'system' | 'user' | 'assistant'
  content?: string
  model?: string | null
  metadata?: Record<string, unknown> | null
  createdAt?: string
}

export function makeClientNode(opts: MakeClientNodeOptions = {}): ConversationNode {
  counter++
  return {
    id: opts.id ?? `node-${counter}`,
    conversationId: opts.conversationId ?? 'conv-1',
    parentId: opts.parentId ?? null,
    role: opts.role ?? 'user',
    content: opts.content ?? `message ${counter}`,
    model: opts.model ?? null,
    metadata: opts.metadata ?? null,
    createdAt: opts.createdAt ?? '2025-01-01T00:00:00Z',
  }
}

export function makeSampleNodeMap(): Map<string, ConversationNode> {
  const nodes = new Map<string, ConversationNode>()

  const root = makeClientNode({ id: 'root', parentId: null, role: 'system', content: 'System' })
  const user1 = makeClientNode({ id: 'user1', parentId: 'root', role: 'user', content: 'Hello', createdAt: '2025-01-01T00:01:00Z' })
  const asst1 = makeClientNode({ id: 'asst1', parentId: 'user1', role: 'assistant', content: 'Hi', createdAt: '2025-01-01T00:02:00Z' })
  const user2 = makeClientNode({ id: 'user2', parentId: 'asst1', role: 'user', content: 'Follow up', createdAt: '2025-01-01T00:03:00Z' })
  const asst2 = makeClientNode({ id: 'asst2', parentId: 'user1', role: 'assistant', content: 'Alt response', createdAt: '2025-01-01T00:04:00Z' })

  for (const n of [root, user1, asst1, user2, asst2]) {
    nodes.set(n.id, n)
  }
  return nodes
}

export function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  counter++
  return {
    id: `conv-${counter}`,
    title: `Conversation ${counter}`,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  }
}

export function resetCounter() {
  counter = 0
}
