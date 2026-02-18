import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '../prisma.js'
import * as settingsService from './settingsService.js'

const db = prisma as unknown as {
  setting: {
    findUnique: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    upsert: ReturnType<typeof vi.fn>
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('settingsService.get', () => {
  it('returns the value for an existing key', async () => {
    db.setting.findUnique.mockResolvedValue({ key: 'theme', value: 'dark' })
    const result = await settingsService.get('theme')
    expect(result).toBe('dark')
  })

  it('returns null when key does not exist', async () => {
    db.setting.findUnique.mockResolvedValue(null)
    const result = await settingsService.get('missing')
    expect(result).toBeNull()
  })
})

describe('settingsService.set', () => {
  it('upserts the setting', async () => {
    db.setting.upsert.mockResolvedValue({})
    await settingsService.set('theme', 'light')
    expect(db.setting.upsert).toHaveBeenCalledWith({
      where: { key: 'theme' },
      update: { value: 'light' },
      create: { key: 'theme', value: 'light' },
    })
  })
})

describe('settingsService.getAll', () => {
  it('returns all settings as key-value object', async () => {
    db.setting.findMany.mockResolvedValue([
      { key: 'theme', value: 'dark' },
      { key: 'default_model', value: 'gpt-4' },
    ])
    const result = await settingsService.getAll()
    expect(result).toEqual({ theme: 'dark', default_model: 'gpt-4' })
  })
})

describe('settingsService.testConnection', () => {
  it('returns true when API responds ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    const result = await settingsService.testConnection('sk-test')
    expect(result).toBe(true)
  })

  it('returns false when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
    const result = await settingsService.testConnection('sk-bad')
    expect(result).toBe(false)
  })
})
