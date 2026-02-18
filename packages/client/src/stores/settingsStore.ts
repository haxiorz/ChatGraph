import { create } from 'zustand'
import type { OpenRouterModel, Settings } from '../types/index'
import * as api from '../services/api'

interface SettingsStore {
  settings: Settings
  models: OpenRouterModel[]
  hasApiKey: boolean
  loaded: boolean

  loadSettings: () => Promise<void>
  loadModels: () => Promise<void>
  updateSetting: (key: string, value: unknown) => Promise<void>
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: {},
  models: [],
  hasApiKey: false,
  loaded: false,

  loadSettings: async () => {
    const settings = (await api.getSettings()) as Settings
    set({
      settings,
      hasApiKey: !!settings.openrouter_api_key,
      loaded: true,
    })
    if (settings.default_model) {
      const { useUIStore } = await import('./uiStore')
      useUIStore.getState().setSelectedModel(settings.default_model as string)
    }
    if (settings.theme) {
      localStorage.setItem('chatgraph-theme', settings.theme as string)
    }
  },

  loadModels: async () => {
    try {
      const models = await api.listModels()
      set({ models })
    } catch {
      // No API key or network error — models stay empty
    }
  },

  updateSetting: async (key: string, value: unknown) => {
    await api.updateSetting(key, value)
    const settings = { ...get().settings, [key]: value }
    set({
      settings,
      hasApiKey: !!settings.openrouter_api_key,
    })
  },
}))
