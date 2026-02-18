import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '../prisma.js'
import * as exportService from './exportService.js'
import { AppError } from '../types/index.js'

const db = prisma as unknown as {
  conversation: {
    findUnique: ReturnType<typeof vi.fn>
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

const makeConvWithNodes = () => ({
  id: 'c1',
  title: 'Test Chat',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-02T00:00:00Z'),
  nodes: [
    { id: 'n1', parentId: null, role: 'system', content: 'System prompt', model: null, metadata: null, createdAt: new Date('2025-01-01T00:00:00Z') },
    { id: 'n2', parentId: 'n1', role: 'user', content: 'Hello', model: null, metadata: null, createdAt: new Date('2025-01-01T00:01:00Z') },
    { id: 'n3', parentId: 'n2', role: 'assistant', content: 'Hi there', model: 'gpt-4', metadata: null, createdAt: new Date('2025-01-01T00:02:00Z') },
  ],
})

describe('exportService.exportAsJson', () => {
  it('returns ChatGraph v1 format', async () => {
    db.conversation.findUnique.mockResolvedValue(makeConvWithNodes())
    const result = await exportService.exportAsJson('c1')

    expect(result.format).toBe('chatgraph-v1')
    expect(result.conversation.title).toBe('Test Chat')
    expect(result.nodes).toHaveLength(3)
    expect(result.nodes[0]!.id).toBe('n1')
  })

  it('throws 404 when conversation not found', async () => {
    db.conversation.findUnique.mockResolvedValue(null)
    await expect(exportService.exportAsJson('missing')).rejects.toThrow(AppError)
  })
})

describe('exportService.exportAsMarkdown', () => {
  it('exports all nodes as markdown', async () => {
    db.conversation.findUnique.mockResolvedValue(makeConvWithNodes())
    const md = await exportService.exportAsMarkdown('c1')

    expect(md).toContain('# Test Chat')
    expect(md).toContain('**System**: System prompt')
    expect(md).toContain('**User**:')
    expect(md).toContain('Hello')
    expect(md).toContain('**Assistant** *(gpt-4)*:')
  })

  it('exports only active path when activeNodeId provided', async () => {
    db.conversation.findUnique.mockResolvedValue(makeConvWithNodes())
    const md = await exportService.exportAsMarkdown('c1', 'n2')

    // Active path: n1 -> n2 (system and user only, not assistant)
    expect(md).toContain('Hello')
    expect(md).not.toContain('Hi there')
  })

  it('throws 404 when conversation not found', async () => {
    db.conversation.findUnique.mockResolvedValue(null)
    await expect(exportService.exportAsMarkdown('missing')).rejects.toThrow(AppError)
  })
})
