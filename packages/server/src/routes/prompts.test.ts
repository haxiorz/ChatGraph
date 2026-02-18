import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import * as promptService from '../services/promptService.js'
import { AppError } from '../types/index.js'

vi.mock('../services/promptService.js', () => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  ensureBuiltInPrompts: vi.fn(),
  markUsed: vi.fn(),
}))

const app = createApp()

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/v1/prompts', () => {
  it('returns list of prompts', async () => {
    const prompts = [{ id: 'p1', name: 'Test' }]
    vi.mocked(promptService.list).mockResolvedValue(prompts as never)

    const res = await request(app).get('/api/v1/prompts')
    expect(res.status).toBe(200)
    expect(res.body).toEqual(prompts)
  })
})

describe('POST /api/v1/prompts', () => {
  it('creates a prompt and returns 201', async () => {
    const prompt = { id: 'p1', name: 'New', content: 'Content' }
    vi.mocked(promptService.create).mockResolvedValue(prompt as never)

    const res = await request(app)
      .post('/api/v1/prompts')
      .send({ name: 'New', content: 'Content' })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe('New')
  })

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/v1/prompts')
      .send({ content: 'Content' })
    expect(res.status).toBe(400)
  })
})

describe('PATCH /api/v1/prompts/:id', () => {
  it('updates a prompt', async () => {
    vi.mocked(promptService.update).mockResolvedValue({ id: 'p1', name: 'Updated' } as never)

    const res = await request(app)
      .patch('/api/v1/prompts/p1')
      .send({ name: 'Updated' })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Updated')
  })

  it('returns 403 for built-in prompts', async () => {
    vi.mocked(promptService.update).mockRejectedValue(
      new AppError('Cannot modify built-in prompts', 403, 'FORBIDDEN'),
    )

    const res = await request(app)
      .patch('/api/v1/prompts/p1')
      .send({ name: 'Hacked' })
    expect(res.status).toBe(403)
  })
})

describe('DELETE /api/v1/prompts/:id', () => {
  it('deletes a prompt and returns 204', async () => {
    vi.mocked(promptService.remove).mockResolvedValue(undefined)

    const res = await request(app).delete('/api/v1/prompts/p1')
    expect(res.status).toBe(204)
  })
})
