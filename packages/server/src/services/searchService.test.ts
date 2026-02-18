import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '../prisma.js'
import * as searchService from './searchService.js'

const db = prisma as unknown as {
  $queryRawUnsafe: ReturnType<typeof vi.fn>
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('searchService.searchNodes', () => {
  it('returns empty results for empty query', async () => {
    const result = await searchService.searchNodes('')
    expect(result).toEqual({ results: [], total: 0 })
    expect(db.$queryRawUnsafe).not.toHaveBeenCalled()
  })

  it('returns empty results for whitespace-only query', async () => {
    const result = await searchService.searchNodes('   ')
    expect(result).toEqual({ results: [], total: 0 })
  })

  it('formats query words as tsquery', async () => {
    db.$queryRawUnsafe
      .mockResolvedValueOnce([
        {
          nodeId: 'n1',
          conversationId: 'c1',
          conversationTitle: 'Test',
          role: 'user',
          snippet: 'hello <mark>world</mark>',
          createdAt: new Date('2025-01-01'),
        },
      ])
      .mockResolvedValueOnce([{ count: 1n }])

    const result = await searchService.searchNodes('hello world')
    expect(result.results).toHaveLength(1)
    expect(result.total).toBe(1)
    // Check that tsquery format is used (word:* & word:*)
    const queryArg = db.$queryRawUnsafe.mock.calls[0]![1]
    expect(queryArg).toBe('hello:* & world:*')
  })

  it('applies conversationId filter', async () => {
    db.$queryRawUnsafe
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ count: 0n }])

    await searchService.searchNodes('test', { conversationId: 'c1' })
    const sql = db.$queryRawUnsafe.mock.calls[0]![0] as string
    expect(sql).toContain('"conversationId"')
  })
})
