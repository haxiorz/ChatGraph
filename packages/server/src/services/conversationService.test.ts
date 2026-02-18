import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '../prisma.js'
import * as conversationService from './conversationService.js'
import { AppError } from '../types/index.js'

const db = prisma as unknown as {
  conversation: {
    findMany: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }
  mergeEdge: {
    findMany: ReturnType<typeof vi.fn>
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('conversationService.list', () => {
  it('returns paginated conversations', async () => {
    const mockConvos = [{ id: 'c1', title: 'Test' }]
    db.conversation.findMany.mockResolvedValue(mockConvos)

    const result = await conversationService.list()
    expect(result).toEqual(mockConvos)
    expect(db.conversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 50 }),
    )
  })

  it('applies custom page and limit', async () => {
    db.conversation.findMany.mockResolvedValue([])
    await conversationService.list(2, 10)
    expect(db.conversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 }),
    )
  })
})

describe('conversationService.getById', () => {
  it('returns conversation with nodes and merge edges', async () => {
    const conv = { id: 'c1', title: 'Test', nodes: [] }
    db.conversation.findUnique.mockResolvedValue(conv)
    db.mergeEdge.findMany.mockResolvedValue([])

    const result = await conversationService.getById('c1')
    expect(result).toEqual({ ...conv, mergeEdges: [] })
  })

  it('throws AppError 404 when not found', async () => {
    db.conversation.findUnique.mockResolvedValue(null)

    await expect(conversationService.getById('missing')).rejects.toThrow(AppError)
    await expect(conversationService.getById('missing')).rejects.toThrow('Conversation not found')
  })
})

describe('conversationService.create', () => {
  it('creates with provided title', async () => {
    db.conversation.create.mockResolvedValue({ id: 'c1', title: 'My Chat' })
    const result = await conversationService.create('My Chat')
    expect(db.conversation.create).toHaveBeenCalledWith({
      data: { title: 'My Chat' },
    })
    expect(result.title).toBe('My Chat')
  })

  it('defaults title to "New Conversation"', async () => {
    db.conversation.create.mockResolvedValue({ id: 'c1', title: 'New Conversation' })
    await conversationService.create()
    expect(db.conversation.create).toHaveBeenCalledWith({
      data: { title: 'New Conversation' },
    })
  })
})

describe('conversationService.rename', () => {
  it('renames an existing conversation', async () => {
    db.conversation.update.mockResolvedValue({ id: 'c1', title: 'Renamed' })
    const result = await conversationService.rename('c1', 'Renamed')
    expect(result.title).toBe('Renamed')
  })

  it('throws 404 when conversation not found', async () => {
    db.conversation.update.mockRejectedValue(new Error('Not found'))
    await expect(conversationService.rename('missing', 'x')).rejects.toThrow(AppError)
  })
})

describe('conversationService.remove', () => {
  it('deletes the conversation', async () => {
    db.conversation.delete.mockResolvedValue({})
    await conversationService.remove('c1')
    expect(db.conversation.delete).toHaveBeenCalledWith({ where: { id: 'c1' } })
  })

  it('throws 404 when conversation not found', async () => {
    db.conversation.delete.mockRejectedValue(new Error('Not found'))
    await expect(conversationService.remove('missing')).rejects.toThrow(AppError)
  })
})
