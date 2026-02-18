import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import * as nodeService from '../services/nodeService.js'

vi.mock('../services/nodeService.js', () => ({
  create: vi.fn(),
  updateContent: vi.fn(),
  deleteSubtree: vi.fn(),
  getByConversation: vi.fn(),
}))

const app = createApp()

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/v1/conversations/:id/nodes', () => {
  it('creates a node and returns 201', async () => {
    const node = { id: 'n1', role: 'user', content: 'Hello' }
    vi.mocked(nodeService.create).mockResolvedValue(node as never)

    const res = await request(app)
      .post('/api/v1/conversations/c1/nodes')
      .send({ parentId: null, role: 'user', content: 'Hello' })
    expect(res.status).toBe(201)
    expect(res.body.id).toBe('n1')
  })

  it('returns 400 for invalid input', async () => {
    const res = await request(app)
      .post('/api/v1/conversations/c1/nodes')
      .send({ role: 'invalid', content: '' })
    expect(res.status).toBe(400)
  })
})

describe('PATCH /api/v1/nodes/:id', () => {
  it('updates node content', async () => {
    vi.mocked(nodeService.updateContent).mockResolvedValue({ id: 'n1', content: 'Updated' } as never)

    const res = await request(app)
      .patch('/api/v1/nodes/n1')
      .send({ content: 'Updated' })
    expect(res.status).toBe(200)
    expect(res.body.content).toBe('Updated')
  })

  it('returns 400 for empty content', async () => {
    const res = await request(app)
      .patch('/api/v1/nodes/n1')
      .send({ content: '' })
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/v1/nodes/:id', () => {
  it('deletes subtree and returns 204', async () => {
    vi.mocked(nodeService.deleteSubtree).mockResolvedValue(3)

    const res = await request(app).delete('/api/v1/nodes/n1')
    expect(res.status).toBe(204)
  })
})
