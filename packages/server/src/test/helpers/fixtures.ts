interface MakeNodeOptions {
  id?: string
  conversationId?: string
  parentId?: string | null
  role?: 'system' | 'user' | 'assistant'
  content?: string
  model?: string | null
  metadata?: unknown
  createdAt?: Date
}

let counter = 0

export function makeNode(opts: MakeNodeOptions = {}) {
  counter++
  return {
    id: opts.id ?? `node-${counter}`,
    conversationId: opts.conversationId ?? 'conv-1',
    parentId: opts.parentId ?? null,
    role: opts.role ?? 'user',
    content: opts.content ?? `message ${counter}`,
    model: opts.model ?? null,
    metadata: opts.metadata ?? null,
    isMergeNode: false,
    createdAt: opts.createdAt ?? new Date('2025-01-01T00:00:00Z'),
    mergeParents: [],
  }
}

export function makeConversation(overrides: Record<string, unknown> = {}) {
  counter++
  return {
    id: (overrides.id as string) ?? `conv-${counter}`,
    title: (overrides.title as string) ?? `Conversation ${counter}`,
    createdAt: (overrides.createdAt as Date) ?? new Date('2025-01-01T00:00:00Z'),
    updatedAt: (overrides.updatedAt as Date) ?? new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  }
}

export function makeSampleTree() {
  // A simple tree:  root -> user1 -> assistant1 -> user2
  //                              \-> assistant2
  const root = makeNode({ id: 'root', parentId: null, role: 'system', content: 'System prompt' })
  const user1 = makeNode({ id: 'user1', parentId: 'root', role: 'user', content: 'Hello' })
  const asst1 = makeNode({ id: 'asst1', parentId: 'user1', role: 'assistant', content: 'Hi there' })
  const user2 = makeNode({ id: 'user2', parentId: 'asst1', role: 'user', content: 'Follow up' })
  const asst2 = makeNode({ id: 'asst2', parentId: 'user1', role: 'assistant', content: 'Alternative response' })

  return { root, user1, asst1, user2, asst2, all: [root, user1, asst1, user2, asst2] }
}

export function resetCounter() {
  counter = 0
}
