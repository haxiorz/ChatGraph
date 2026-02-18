import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as api from './api'

beforeEach(() => {
  vi.restoreAllMocks()
})

function mockFetch(body: unknown, status = 200) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }))
}

function mockFetch204() {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    status: 204,
    json: async () => { throw new Error('no body') },
  }))
}

describe('listConversations', () => {
  it('fetches conversations', async () => {
    const convos = [{ id: 'c1', title: 'Test' }]
    mockFetch(convos)
    const result = await api.listConversations()
    expect(result).toEqual(convos)
  })
})

describe('getConversation', () => {
  it('fetches a conversation by id', async () => {
    const conv = { id: 'c1', title: 'Test', nodes: [] }
    mockFetch(conv)
    const result = await api.getConversation('c1')
    expect(result).toEqual(conv)
  })
})

describe('createConversation', () => {
  it('creates a conversation', async () => {
    mockFetch({ id: 'c1', title: 'New' })
    const result = await api.createConversation('New')
    expect(result.title).toBe('New')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/conversations'),
      expect.objectContaining({ method: 'POST' }),
    )
  })
})

describe('deleteConversation', () => {
  it('handles 204 response', async () => {
    mockFetch204()
    await expect(api.deleteConversation('c1')).resolves.toBeUndefined()
  })
})

describe('error handling', () => {
  it('throws with error message from response body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: { message: 'Not found' } }),
    }))

    await expect(api.getConversation('missing')).rejects.toThrow('Not found')
  })

  it('throws with HTTP status when no error body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => { throw new Error() },
    }))

    await expect(api.listConversations()).rejects.toThrow('HTTP 500')
  })
})

describe('listModels', () => {
  it('unwraps data from response', async () => {
    const models = [{ id: 'gpt-4', name: 'GPT-4' }]
    mockFetch({ data: models })
    const result = await api.listModels()
    expect(result).toEqual(models)
  })
})

describe('updateSetting', () => {
  it('sends PUT request', async () => {
    mockFetch({ success: true })
    await api.updateSetting('theme', 'dark')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/settings'),
      expect.objectContaining({ method: 'PUT' }),
    )
  })
})

describe('search', () => {
  it('passes query params', async () => {
    mockFetch({ results: [], total: 0 })
    await api.search('hello', { conversationId: 'c1' })
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('q=hello'),
      expect.anything(),
    )
  })
})

describe('exportConversation', () => {
  it('passes format query param', async () => {
    mockFetch({})
    await api.exportConversation('c1', 'markdown')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('format=markdown'),
      expect.anything(),
    )
  })
})
