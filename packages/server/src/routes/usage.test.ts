import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import * as usageService from '../services/usageService.js'

vi.mock('../services/usageService.js', () => ({
  getUsageStats: vi.fn(),
}))

const app = createApp()

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/v1/usage', () => {
  it('returns usage stats', async () => {
    const stats = { totalPromptTokens: 100, totalCompletionTokens: 200, totalCost: 0, byModel: [], topConversations: [] }
    vi.mocked(usageService.getUsageStats).mockResolvedValue(stats)

    const res = await request(app).get('/api/v1/usage')
    expect(res.status).toBe(200)
    expect(res.body.totalPromptTokens).toBe(100)
  })

  it('passes period query parameter', async () => {
    vi.mocked(usageService.getUsageStats).mockResolvedValue({
      totalPromptTokens: 0, totalCompletionTokens: 0, totalCost: 0, byModel: [], topConversations: [],
    })

    await request(app).get('/api/v1/usage?period=week')
    expect(usageService.getUsageStats).toHaveBeenCalledWith('week')
  })
})
