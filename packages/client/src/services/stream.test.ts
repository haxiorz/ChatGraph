import { describe, it, expect, vi, beforeEach } from 'vitest'
import { consumeStream } from './stream'

beforeEach(() => {
  vi.restoreAllMocks()
})

function createReadableFromChunks(chunks: string[]) {
  let index = 0
  const encoder = new TextEncoder()
  return {
    getReader: () => ({
      read: vi.fn(async () => {
        if (index >= chunks.length) return { done: true, value: undefined }
        const value = encoder.encode(chunks[index++])
        return { done: false, value }
      }),
    }),
  }
}

function mockFetchSSE(chunks: string[], status = 200) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    body: createReadableFromChunks(chunks),
    text: async () => 'error',
  }))
}

describe('consumeStream', () => {
  it('calls onUserNode for userNode events', async () => {
    const node = { id: 'u1', role: 'user', content: 'Hello' }
    mockFetchSSE([
      `event: userNode\ndata: ${JSON.stringify(node)}\n\n`,
    ])

    const callbacks = { onUserNode: vi.fn(), onToken: vi.fn(), onDone: vi.fn(), onError: vi.fn() }
    await consumeStream('/api/test', {}, callbacks)

    expect(callbacks.onUserNode).toHaveBeenCalledWith(node)
  })

  it('calls onToken for token events', async () => {
    mockFetchSSE([
      'event: token\ndata: {"content":"Hello"}\n\n',
      'event: token\ndata: {"content":" world"}\n\n',
    ])

    const callbacks = { onUserNode: vi.fn(), onToken: vi.fn(), onDone: vi.fn(), onError: vi.fn() }
    await consumeStream('/api/test', {}, callbacks)

    expect(callbacks.onToken).toHaveBeenCalledWith('Hello')
    expect(callbacks.onToken).toHaveBeenCalledWith(' world')
  })

  it('calls onDone for done events', async () => {
    const node = { id: 'a1', role: 'assistant', content: 'Response' }
    mockFetchSSE([
      `event: done\ndata: ${JSON.stringify({ node })}\n\n`,
    ])

    const callbacks = { onUserNode: vi.fn(), onToken: vi.fn(), onDone: vi.fn(), onError: vi.fn() }
    await consumeStream('/api/test', {}, callbacks)

    expect(callbacks.onDone).toHaveBeenCalledWith(node)
  })

  it('calls onError for error events', async () => {
    mockFetchSSE([
      'event: error\ndata: {"message":"Rate limited"}\n\n',
    ])

    const callbacks = { onUserNode: vi.fn(), onToken: vi.fn(), onDone: vi.fn(), onError: vi.fn() }
    await consumeStream('/api/test', {}, callbacks)

    expect(callbacks.onError).toHaveBeenCalledWith('Rate limited')
  })

  it('calls onError when response is not ok', async () => {
    mockFetchSSE([], 500)

    const callbacks = { onUserNode: vi.fn(), onToken: vi.fn(), onDone: vi.fn(), onError: vi.fn() }
    await consumeStream('/api/test', {}, callbacks)

    expect(callbacks.onError).toHaveBeenCalledWith(expect.stringContaining('500'))
  })

  it('calls onError when no response body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: null,
    }))

    const callbacks = { onUserNode: vi.fn(), onToken: vi.fn(), onDone: vi.fn(), onError: vi.fn() }
    await consumeStream('/api/test', {}, callbacks)

    expect(callbacks.onError).toHaveBeenCalledWith('No response body')
  })
})
