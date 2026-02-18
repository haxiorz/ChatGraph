import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '../prisma.js'
import * as usageService from './usageService.js'

const db = prisma as unknown as {
  $queryRawUnsafe: ReturnType<typeof vi.fn>
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('usageService.getUsageStats', () => {
  it('returns aggregated stats', async () => {
    db.$queryRawUnsafe
      .mockResolvedValueOnce([
        { model: 'gpt-4', prompt_tokens: 100n, completion_tokens: 200n, count: 5n },
      ])
      .mockResolvedValueOnce([
        { conversationId: 'c1', title: 'Test Chat', total_tokens: 300n },
      ])

    const result = await usageService.getUsageStats()
    expect(result.totalPromptTokens).toBe(100)
    expect(result.totalCompletionTokens).toBe(200)
    expect(result.byModel).toHaveLength(1)
    expect(result.byModel[0]!.model).toBe('gpt-4')
    expect(result.topConversations).toHaveLength(1)
  })

  it('returns zero totals when no data', async () => {
    db.$queryRawUnsafe
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const result = await usageService.getUsageStats()
    expect(result.totalPromptTokens).toBe(0)
    expect(result.totalCompletionTokens).toBe(0)
    expect(result.byModel).toEqual([])
    expect(result.topConversations).toEqual([])
  })

  it('applies period filter for "day"', async () => {
    db.$queryRawUnsafe
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    await usageService.getUsageStats('day')
    const sql = db.$queryRawUnsafe.mock.calls[0]![0] as string
    expect(sql).toContain("INTERVAL '1 day'")
  })

  it('applies period filter for "week"', async () => {
    db.$queryRawUnsafe
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    await usageService.getUsageStats('week')
    const sql = db.$queryRawUnsafe.mock.calls[0]![0] as string
    expect(sql).toContain("INTERVAL '7 days'")
  })
})
