import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSettingsStore } from './settingsStore'
import * as api from '../services/api'

vi.mock('../services/api', () => ({
  getSettings: vi.fn(),
  listModels: vi.fn(),
  updateSetting: vi.fn(),
}))

beforeEach(() => {
  useSettingsStore.setState({
    settings: {},
    models: [],
    hasApiKey: false,
    loaded: false,
  })
  vi.clearAllMocks()
  localStorage.clear()
})

describe('settingsStore', () => {
  describe('loadSettings', () => {
    it('fetches settings and sets state', async () => {
      vi.mocked(api.getSettings).mockResolvedValue({
        openrouter_api_key: 'sk-test',
        theme: 'dark',
      } as never)

      await useSettingsStore.getState().loadSettings()

      const state = useSettingsStore.getState()
      expect(state.hasApiKey).toBe(true)
      expect(state.loaded).toBe(true)
      expect(state.settings.openrouter_api_key).toBe('sk-test')
    })

    it('sets hasApiKey to false when no key', async () => {
      vi.mocked(api.getSettings).mockResolvedValue({} as never)

      await useSettingsStore.getState().loadSettings()
      expect(useSettingsStore.getState().hasApiKey).toBe(false)
    })
  })

  describe('loadModels', () => {
    it('fetches and sets models', async () => {
      const models = [{ id: 'gpt-4', name: 'GPT-4' }]
      vi.mocked(api.listModels).mockResolvedValue(models as never)

      await useSettingsStore.getState().loadModels()
      expect(useSettingsStore.getState().models).toEqual(models)
    })

    it('keeps models empty on error', async () => {
      vi.mocked(api.listModels).mockRejectedValue(new Error('Network'))

      await useSettingsStore.getState().loadModels()
      expect(useSettingsStore.getState().models).toEqual([])
    })
  })

  describe('updateSetting', () => {
    it('updates setting and merges into state', async () => {
      vi.mocked(api.updateSetting).mockResolvedValue({ success: true })
      useSettingsStore.setState({ settings: { theme: 'dark' } })

      await useSettingsStore.getState().updateSetting('theme', 'light')

      expect(api.updateSetting).toHaveBeenCalledWith('theme', 'light')
      expect(useSettingsStore.getState().settings.theme).toBe('light')
    })

    it('updates hasApiKey when setting api key', async () => {
      vi.mocked(api.updateSetting).mockResolvedValue({ success: true })

      await useSettingsStore.getState().updateSetting('openrouter_api_key', 'sk-test')
      expect(useSettingsStore.getState().hasApiKey).toBe(true)
    })
  })
})
