import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import * as searchService from '../services/searchService.js'

vi.mock('../services/searchService.js', () => ({
  searchNodes: vi.fn(),
}))

const app = createApp()

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/v1/search', () => {
  it('returns search results', async () => {
    const results = { results: [{ nodeId: 'n1' }], total: 1 }
    vi.mocked(searchService.searchNodes).mockResolvedValue(results as never)

    const res = await request(app).get('/api/v1/search?q=hello')
    expect(res.status).toBe(200)
    expect(res.body.total).toBe(1)
  })

  it('passes query parameters to service', async () => {
    vi.mocked(searchService.searchNodes).mockResolvedValue({ results: [], total: 0 })

    await request(app).get('/api/v1/search?q=test&conversationId=c1&limit=5')
    expect(searchService.searchNodes).toHaveBeenCalledWith('test', {
      conversationId: 'c1',
      limit: 5,
    })
  })
})
