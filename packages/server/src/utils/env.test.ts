import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('getEnv', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  async function importGetEnv() {
    const mod = await import('./env.js')
    return mod.getEnv
  }

  it('returns DATABASE_URL when set', async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
    const getEnv = await importGetEnv()
    expect(getEnv().DATABASE_URL).toBe('postgresql://test:test@localhost:5432/test')
  })

  it('throws when DATABASE_URL is missing', async () => {
    delete process.env.DATABASE_URL
    const getEnv = await importGetEnv()
    expect(() => getEnv()).toThrow('Missing required environment variable: DATABASE_URL')
  })

  it('parses PORT from env', async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
    process.env.PORT = '4000'
    const getEnv = await importGetEnv()
    expect(getEnv().PORT).toBe(4000)
  })

  it('defaults PORT to 3002', async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
    delete process.env.PORT
    const getEnv = await importGetEnv()
    expect(getEnv().PORT).toBe(3002)
  })

  it('defaults NODE_ENV to development', async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
    delete process.env.NODE_ENV
    const getEnv = await importGetEnv()
    expect(getEnv().NODE_ENV).toBe('development')
  })
})
