import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import * as exportService from '../services/exportService.js'
import * as importService from '../services/importService.js'

vi.mock('../services/exportService.js', () => ({
  exportAsJson: vi.fn(),
  exportAsMarkdown: vi.fn(),
}))

vi.mock('../services/importService.js', () => ({
  importConversation: vi.fn(),
}))

const app = createApp()

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/v1/conversations/:id/export', () => {
  it('exports as JSON by default', async () => {
    const data = { format: 'chatgraph-v1', nodes: [] }
    vi.mocked(exportService.exportAsJson).mockResolvedValue(data as never)

    const res = await request(app).get('/api/v1/conversations/c1/export')
    expect(res.status).toBe(200)
    expect(res.body.format).toBe('chatgraph-v1')
  })

  it('exports as markdown when requested', async () => {
    vi.mocked(exportService.exportAsMarkdown).mockResolvedValue('# Test\n\nHello')

    const res = await request(app).get('/api/v1/conversations/c1/export?format=markdown')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/markdown')
    expect(res.text).toContain('# Test')
  })
})

describe('POST /api/v1/conversations/import', () => {
  it('imports and returns 201', async () => {
    const conv = { id: 'c1', title: 'Imported' }
    vi.mocked(importService.importConversation).mockResolvedValue(conv as never)

    const res = await request(app)
      .post('/api/v1/conversations/import')
      .send({ format: 'chatgraph-v1', nodes: [] })
    expect(res.status).toBe(201)
    expect(res.body.title).toBe('Imported')
  })

  it('returns 400 for unrecognized format', async () => {
    const { AppError } = await import('../types/index.js')
    vi.mocked(importService.importConversation).mockRejectedValue(
      new AppError('Unrecognized import format', 400, 'INVALID_FORMAT'),
    )

    const res = await request(app)
      .post('/api/v1/conversations/import')
      .send({ bad: 'data' })
    expect(res.status).toBe(400)
  })
})
