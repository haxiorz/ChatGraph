import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '../prisma.js'
import * as importService from './importService.js'
import { AppError } from '../types/index.js'

const db = prisma as unknown as {
  $transaction: ReturnType<typeof vi.fn>
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('importService.importChatGraphJson', () => {
  it('creates conversation and remaps node IDs', async () => {
    const mockConversation = { id: 'new-conv' }
    db.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        conversation: { create: vi.fn().mockResolvedValue(mockConversation) },
        node: { create: vi.fn().mockResolvedValue({}) },
      }
      return fn(tx)
    })

    const data = {
      format: 'chatgraph-v1',
      conversation: { title: 'Imported' },
      nodes: [
        { id: 'old-1', parentId: null, role: 'system' as const, content: 'System' },
        { id: 'old-2', parentId: 'old-1', role: 'user' as const, content: 'Hello' },
      ],
    }

    const result = await importService.importChatGraphJson(data)
    expect(result).toEqual(mockConversation)
    expect(db.$transaction).toHaveBeenCalled()
  })

  it('throws on invalid format (missing nodes)', async () => {
    const data = { format: 'chatgraph-v1', conversation: { title: 'Bad' } } as unknown as Parameters<typeof importService.importChatGraphJson>[0]
    await expect(importService.importChatGraphJson(data)).rejects.toThrow(AppError)
  })
})

describe('importService.importChatGptJson', () => {
  it('imports ChatGPT mapping format', async () => {
    const mockConversation = { id: 'new-conv' }
    db.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        conversation: { create: vi.fn().mockResolvedValue(mockConversation) },
        node: { create: vi.fn().mockResolvedValue({}) },
      }
      return fn(tx)
    })

    const data = {
      title: 'ChatGPT Conv',
      mapping: {
        'entry-1': {
          id: 'entry-1',
          parent: null,
          message: {
            author: { role: 'user' },
            content: { parts: ['Hello world'] },
          },
        },
        'entry-2': {
          id: 'entry-2',
          parent: 'entry-1',
          message: {
            author: { role: 'assistant' },
            content: { parts: ['Hi!'] },
          },
        },
      },
    }

    const result = await importService.importChatGptJson(data)
    expect(result).toEqual(mockConversation)
  })

  it('throws on missing mapping', async () => {
    const data = { title: 'Bad' } as unknown as Parameters<typeof importService.importChatGptJson>[0]
    await expect(importService.importChatGptJson(data)).rejects.toThrow(AppError)
  })
})

describe('importService.importConversation', () => {
  it('auto-detects ChatGraph format', async () => {
    db.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        conversation: { create: vi.fn().mockResolvedValue({ id: 'c1' }) },
        node: { create: vi.fn().mockResolvedValue({}) },
      }
      return fn(tx)
    })

    const data = {
      format: 'chatgraph-v1',
      conversation: { title: 'Test' },
      nodes: [{ id: 'n1', parentId: null, role: 'user', content: 'Hi' }],
    }
    await expect(importService.importConversation(data)).resolves.toBeDefined()
  })

  it('auto-detects ChatGPT format', async () => {
    db.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        conversation: { create: vi.fn().mockResolvedValue({ id: 'c1' }) },
        node: { create: vi.fn().mockResolvedValue({}) },
      }
      return fn(tx)
    })

    const data = {
      mapping: {
        'e1': { id: 'e1', parent: null, message: { author: { role: 'user' }, content: { parts: ['Hi'] } } },
      },
    }
    await expect(importService.importConversation(data)).resolves.toBeDefined()
  })

  it('throws on unrecognized format', async () => {
    await expect(importService.importConversation({ foo: 'bar' })).rejects.toThrow('Unrecognized import format')
  })
})
