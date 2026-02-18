import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '../prisma.js'
import * as completionService from './completionService.js'
import * as settingsService from './settingsService.js'
import { AppError } from '../types/index.js'
import { createMockResponse, createMockSSEStream } from '../test/helpers/sse-mock.js'
import type { Response } from 'express'

vi.mock('./settingsService.js', () => ({
  get: vi.fn(),
}))

const mockSettingsGet = settingsService.get as ReturnType<typeof vi.fn>

const db = prisma as unknown as {
  node: {
    findMany: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
  conversation: {
    update: ReturnType<typeof vi.fn>
  }
  mergeEdge: {
    create: ReturnType<typeof vi.fn>
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('completionService.streamCompletion', () => {
  it('throws when parent node not found', async () => {
    db.node.findMany.mockResolvedValue([])
    const res = createMockResponse()
    const signal = new AbortController().signal

    await expect(
      completionService.streamCompletion(
        { conversationId: 'c1', parentNodeId: 'missing', content: 'Hi', model: 'gpt-4' },
        res as unknown as Response,
        signal,
      ),
    ).rejects.toThrow(AppError)
  })

  it('writes error event when no API key', async () => {
    db.node.findMany.mockResolvedValue([{ id: 'p1', parentId: null, role: 'system', content: 'Sys' }])
    db.node.create.mockResolvedValue({ id: 'u1', parentId: 'p1', role: 'user', content: 'Hi' })
    mockSettingsGet.mockResolvedValue(null)

    const res = createMockResponse()
    const signal = new AbortController().signal

    await completionService.streamCompletion(
      { conversationId: 'c1', parentNodeId: 'p1', content: 'Hi', model: 'gpt-4' },
      res as unknown as Response,
      signal,
    )

    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('event: userNode'))
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('event: error'))
    expect(res.end).toHaveBeenCalled()
  })

  it('streams tokens and creates assistant node on success', async () => {
    const parentNode = { id: 'p1', parentId: null, role: 'system', content: 'Sys' }
    db.node.findMany.mockResolvedValue([parentNode])
    db.node.create
      .mockResolvedValueOnce({ id: 'u1', parentId: 'p1', role: 'user', content: 'Hi' })
      .mockResolvedValueOnce({ id: 'a1', parentId: 'u1', role: 'assistant', content: 'Hello!', model: 'gpt-4' })
    db.conversation.update.mockResolvedValue({})
    mockSettingsGet.mockResolvedValue('sk-test')

    const sseChunks = [
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"!"}}]}\n\n',
      'data: [DONE]\n\n',
    ]
    const mockStream = createMockSSEStream(sseChunks)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      body: mockStream,
    }))

    const res = createMockResponse()
    const signal = new AbortController().signal

    await completionService.streamCompletion(
      { conversationId: 'c1', parentNodeId: 'p1', content: 'Hi', model: 'gpt-4' },
      res as unknown as Response,
      signal,
    )

    // Should write userNode event, then token events, then done event
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('event: userNode'))
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('event: token'))
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('event: done'))
    expect(res.end).toHaveBeenCalled()
  })

  it('writes error event when OpenRouter returns non-ok', async () => {
    db.node.findMany.mockResolvedValue([{ id: 'p1', parentId: null, role: 'system', content: 'Sys' }])
    db.node.create.mockResolvedValue({ id: 'u1', parentId: 'p1', role: 'user', content: 'Hi' })
    mockSettingsGet.mockResolvedValue('sk-test')

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'Rate limited',
    }))

    const res = createMockResponse()
    const signal = new AbortController().signal

    await completionService.streamCompletion(
      { conversationId: 'c1', parentNodeId: 'p1', content: 'Hi', model: 'gpt-4' },
      res as unknown as Response,
      signal,
    )

    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('event: error'))
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('429'))
  })

  it('auto-titles conversation on first exchange', async () => {
    // Only root node (length <= 1) triggers auto-title
    db.node.findMany.mockResolvedValue([{ id: 'p1', parentId: null, role: 'system', content: 'Sys' }])
    db.node.create
      .mockResolvedValueOnce({ id: 'u1', parentId: 'p1', role: 'user', content: 'Hi' })
      .mockResolvedValueOnce({ id: 'a1', parentId: 'u1', role: 'assistant', content: 'Hello', model: 'gpt-4' })
    db.conversation.update.mockResolvedValue({})
    mockSettingsGet.mockResolvedValue('sk-test')

    const mockStream = createMockSSEStream(['data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n', 'data: [DONE]\n\n'])
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      body: mockStream,
    }))

    const res = createMockResponse()
    await completionService.streamCompletion(
      { conversationId: 'c1', parentNodeId: 'p1', content: 'Hi', model: 'gpt-4' },
      res as unknown as Response,
      new AbortController().signal,
    )

    expect(db.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'c1' },
        data: { title: 'Hi' },
      }),
    )
  })
})

describe('completionService.streamRegeneration', () => {
  it('throws when assistant node not found', async () => {
    db.node.findMany.mockResolvedValue([])
    const res = createMockResponse()

    await expect(
      completionService.streamRegeneration(
        { conversationId: 'c1', assistantNodeId: 'missing', model: 'gpt-4' },
        res as unknown as Response,
        new AbortController().signal,
      ),
    ).rejects.toThrow(AppError)
  })

  it('throws when assistant node has no parent', async () => {
    db.node.findMany.mockResolvedValue([
      { id: 'a1', parentId: null, role: 'assistant', content: 'Hi' },
    ])
    const res = createMockResponse()

    await expect(
      completionService.streamRegeneration(
        { conversationId: 'c1', assistantNodeId: 'a1', model: 'gpt-4' },
        res as unknown as Response,
        new AbortController().signal,
      ),
    ).rejects.toThrow(AppError)
  })

  it('writes error event when no API key', async () => {
    db.node.findMany.mockResolvedValue([
      { id: 'u1', parentId: null, role: 'user', content: 'Hello' },
      { id: 'a1', parentId: 'u1', role: 'assistant', content: 'Hi' },
    ])
    mockSettingsGet.mockResolvedValue(null)

    const res = createMockResponse()
    await completionService.streamRegeneration(
      { conversationId: 'c1', assistantNodeId: 'a1', model: 'gpt-4' },
      res as unknown as Response,
      new AbortController().signal,
    )

    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('event: error'))
    expect(res.end).toHaveBeenCalled()
  })
})
