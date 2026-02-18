import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import * as settingsService from '../services/settingsService.js'

vi.mock('../services/settingsService.js', () => ({
  getAll: vi.fn(),
  set: vi.fn(),
  testConnection: vi.fn(),
  get: vi.fn(),
}))

const app = createApp()

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/v1/settings', () => {
  it('returns all settings', async () => {
    vi.mocked(settingsService.getAll).mockResolvedValue({ theme: 'dark' })
    const res = await request(app).get('/api/v1/settings')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ theme: 'dark' })
  })
})

describe('PUT /api/v1/settings', () => {
  it('updates a setting', async () => {
    vi.mocked(settingsService.set).mockResolvedValue(undefined)
    const res = await request(app)
      .put('/api/v1/settings')
      .send({ key: 'theme', value: 'light' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ success: true })
  })

  it('returns 400 when key is missing', async () => {
    const res = await request(app)
      .put('/api/v1/settings')
      .send({ value: 'light' })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/v1/settings/test-connection', () => {
  it('returns valid: true when connection succeeds', async () => {
    vi.mocked(settingsService.testConnection).mockResolvedValue(true)
    const res = await request(app)
      .post('/api/v1/settings/test-connection')
      .send({ apiKey: 'sk-test' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ valid: true })
  })

  it('returns 400 when apiKey is empty', async () => {
    const res = await request(app)
      .post('/api/v1/settings/test-connection')
      .send({ apiKey: '' })
    expect(res.status).toBe(400)
  })
})
