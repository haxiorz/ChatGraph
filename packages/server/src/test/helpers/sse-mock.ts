import { vi } from 'vitest'

export function createMockResponse() {
  return {
    write: vi.fn(),
    end: vi.fn(),
    setHeader: vi.fn(),
    flushHeaders: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  }
}

export function createMockSSEStream(chunks: string[]) {
  let index = 0
  const encoder = new TextEncoder()
  return {
    getReader: () => ({
      read: vi.fn(async () => {
        if (index >= chunks.length) return { done: true, value: undefined }
        const chunk = chunks[index++]
        return { done: false, value: encoder.encode(chunk) }
      }),
    }),
  }
}
