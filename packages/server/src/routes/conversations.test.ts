import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import * as conversationService from '../services/conversationService.js'
import { AppError } from '../types/index.js'

vi.mock('../services/conversationService.js', () => ({
  list: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  rename: vi.fn(),
  remove: vi.fn(),
}))

const app = createApp()

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/v1/conversations', () => {
  it('returns list of conversations', async () => {
    const convos = [{ id: 'c1', title: 'Test' }]
    vi.mocked(conversationService.list).mockResolvedValue(convos as never)

    const res = await request(app).get('/api/v1/conversations')
    expect(res.status).toBe(200)
    expect(res.body).toEqual(convos)
  })
})

describe('POST /api/v1/conversations', () => {
  it('creates a conversation and returns 201', async () => {
    const conv = { id: 'c1', title: 'New Chat' }
    vi.mocked(conversationService.create).mockResolvedValue(conv as never)

    const res = await request(app)
      .post('/api/v1/conversations')
      .send({ title: 'New Chat' })
    expect(res.status).toBe(201)
    expect(res.body).toEqual(conv)
  })

  it('creates with no title (defaults on server)', async () => {
    vi.mocked(conversationService.create).mockResolvedValue({ id: 'c1' } as never)
    const res = await request(app).post('/api/v1/conversations').send({})
    expect(res.status).toBe(201)
  })
})

describe('GET /api/v1/conversations/:id', () => {
  it('returns conversation with nodes', async () => {
    const conv = { id: 'c1', title: 'Test', nodes: [], mergeEdges: [] }
    vi.mocked(conversationService.getById).mockResolvedValue(conv as never)

    const res = await request(app).get('/api/v1/conversations/c1')
    expect(res.status).toBe(200)
    expect(res.body.id).toBe('c1')
  })

  it('returns 404 when not found', async () => {
    vi.mocked(conversationService.getById).mockRejectedValue(
      new AppError('Conversation not found', 404, 'NOT_FOUND'),
    )

    const res = await request(app).get('/api/v1/conversations/missing')
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })
})

describe('PATCH /api/v1/conversations/:id', () => {
  it('renames a conversation', async () => {
    vi.mocked(conversationService.rename).mockResolvedValue({ id: 'c1', title: 'Renamed' } as never)

    const res = await request(app)
      .patch('/api/v1/conversations/c1')
      .send({ title: 'Renamed' })
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Renamed')
  })

  it('returns 400 with empty title', async () => {
    const res = await request(app)
      .patch('/api/v1/conversations/c1')
      .send({ title: '' })
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/v1/conversations/:id', () => {
  it('deletes and returns 204', async () => {
    vi.mocked(conversationService.remove).mockResolvedValue(undefined)

    const res = await request(app).delete('/api/v1/conversations/c1')
    expect(res.status).toBe(204)
  })
})
