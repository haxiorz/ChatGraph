import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as modelService from './modelService.js'
import * as settingsService from './settingsService.js'

vi.mock('./settingsService.js', () => ({
  get: vi.fn(),
}))

const mockSettingsGet = settingsService.get as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
  modelService.clearCache()
})

describe('modelService.listModels', () => {
  it('returns empty array when no API key', async () => {
    mockSettingsGet.mockResolvedValue(null)
    const result = await modelService.listModels()
    expect(result).toEqual([])
  })

  it('fetches models from OpenRouter', async () => {
    const mockModels = [{ id: 'gpt-4', name: 'GPT-4' }]
    mockSettingsGet.mockResolvedValue('sk-test')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockModels }),
    }))

    const result = await modelService.listModels()
    expect(result).toEqual(mockModels)
  })

  it('caches results for subsequent calls', async () => {
    const mockModels = [{ id: 'gpt-4', name: 'GPT-4' }]
    mockSettingsGet.mockResolvedValue('sk-test')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockModels }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await modelService.listModels()
    await modelService.listModels()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('throws when API returns error', async () => {
    mockSettingsGet.mockResolvedValue('sk-test')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    }))

    await expect(modelService.listModels()).rejects.toThrow('Failed to fetch models: 401')
  })
})

describe('modelService.clearCache', () => {
  it('clears the cache so next call fetches again', async () => {
    const mockModels = [{ id: 'gpt-4', name: 'GPT-4' }]
    mockSettingsGet.mockResolvedValue('sk-test')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockModels }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await modelService.listModels()
    modelService.clearCache()
    await modelService.listModels()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
