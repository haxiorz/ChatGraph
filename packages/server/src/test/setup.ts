import { vi } from 'vitest'
import { createPrismaMock } from './helpers/prisma-mock.js'

vi.mock('../prisma.js', () => ({
  prisma: createPrismaMock(),
}))
