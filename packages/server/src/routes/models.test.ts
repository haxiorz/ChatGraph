import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import * as modelService from '../services/modelService.js'

vi.mock('../services/modelService.js', () => ({
  listModels: vi.fn(),
  clearCache: vi.fn(),
}))

const app = createApp()

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/v1/models', () => {
  it('returns models wrapped in { data }', async () => {
    const models = [{ id: 'gpt-4', name: 'GPT-4' }]
    vi.mocked(modelService.listModels).mockResolvedValue(models as never)

    const res = await request(app).get('/api/v1/models')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ data: models })
  })

  it('returns empty data array when no models', async () => {
    vi.mocked(modelService.listModels).mockResolvedValue([])

    const res = await request(app).get('/api/v1/models')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ data: [] })
  })
})
