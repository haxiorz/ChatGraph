import { vi } from 'vitest'

function createModelMock() {
  return {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  }
}

export function createPrismaMock() {
  return {
    conversation: createModelMock(),
    node: createModelMock(),
    setting: createModelMock(),
    prompt: createModelMock(),
    mergeEdge: createModelMock(),
    $transaction: vi.fn((fn: (tx: unknown) => unknown) => {
      // Call the callback with a tx that has the same model mocks
      const tx = {
        conversation: createModelMock(),
        node: createModelMock(),
        setting: createModelMock(),
        prompt: createModelMock(),
        mergeEdge: createModelMock(),
      }
      return fn(tx)
    }),
    $queryRawUnsafe: vi.fn(),
  }
}

export type PrismaMock = ReturnType<typeof createPrismaMock>
