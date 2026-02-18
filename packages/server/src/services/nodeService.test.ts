import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '../prisma.js'
import * as nodeService from './nodeService.js'
import { AppError } from '../types/index.js'

const db = prisma as unknown as {
  node: {
    findMany: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    deleteMany: ReturnType<typeof vi.fn>
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('nodeService.create', () => {
  it('creates a node with provided input', async () => {
    const mockNode = { id: 'n1', conversationId: 'c1', parentId: null, role: 'user', content: 'Hello', model: null }
    db.node.create.mockResolvedValue(mockNode)

    const result = await nodeService.create('c1', {
      parentId: null,
      role: 'user',
      content: 'Hello',
    })
    expect(result).toEqual(mockNode)
    expect(db.node.create).toHaveBeenCalledWith({
      data: { conversationId: 'c1', parentId: null, role: 'user', content: 'Hello', model: null },
    })
  })

  it('passes model when provided', async () => {
    db.node.create.mockResolvedValue({})
    await nodeService.create('c1', {
      parentId: 'p1',
      role: 'assistant',
      content: 'Hi',
      model: 'gpt-4',
    })
    expect(db.node.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ model: 'gpt-4' }),
    })
  })
})

describe('nodeService.updateContent', () => {
  it('updates node content', async () => {
    db.node.update.mockResolvedValue({ id: 'n1', content: 'Updated' })
    const result = await nodeService.updateContent('n1', 'Updated')
    expect(result.content).toBe('Updated')
  })

  it('throws 404 when node not found', async () => {
    db.node.update.mockRejectedValue(new Error('Not found'))
    await expect(nodeService.updateContent('missing', 'x')).rejects.toThrow(AppError)
  })
})

describe('nodeService.deleteSubtree', () => {
  it('deletes a node and all its descendants', async () => {
    db.node.findUnique.mockResolvedValue({ id: 'n1', conversationId: 'c1' })
    db.node.findMany.mockResolvedValue([
      { id: 'n1', parentId: null },
      { id: 'n2', parentId: 'n1' },
      { id: 'n3', parentId: 'n2' },
      { id: 'n4', parentId: 'n1' },
    ])
    db.node.deleteMany.mockResolvedValue({ count: 4 })

    const count = await nodeService.deleteSubtree('n1')
    expect(count).toBe(4)
    expect(db.node.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['n1', 'n2', 'n4', 'n3'] } },
    })
  })

  it('throws 404 when node not found', async () => {
    db.node.findUnique.mockResolvedValue(null)
    await expect(nodeService.deleteSubtree('missing')).rejects.toThrow(AppError)
  })

  it('deletes only the target node if it has no children', async () => {
    db.node.findUnique.mockResolvedValue({ id: 'leaf', conversationId: 'c1' })
    db.node.findMany.mockResolvedValue([
      { id: 'root', parentId: null },
      { id: 'leaf', parentId: 'root' },
    ])
    db.node.deleteMany.mockResolvedValue({ count: 1 })

    const count = await nodeService.deleteSubtree('leaf')
    expect(count).toBe(1)
    expect(db.node.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['leaf'] } },
    })
  })
})

describe('nodeService.getByConversation', () => {
  it('returns all nodes for a conversation sorted by createdAt', async () => {
    const mockNodes = [{ id: 'n1' }, { id: 'n2' }]
    db.node.findMany.mockResolvedValue(mockNodes)

    const result = await nodeService.getByConversation('c1')
    expect(result).toEqual(mockNodes)
    expect(db.node.findMany).toHaveBeenCalledWith({
      where: { conversationId: 'c1' },
      orderBy: { createdAt: 'asc' },
    })
  })
})
