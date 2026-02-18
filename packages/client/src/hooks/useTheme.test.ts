import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme } from './useTheme'
import { useSettingsStore } from '../stores/settingsStore'
import * as api from '../services/api'

vi.mock('../services/api', () => ({
  getSettings: vi.fn(),
  listModels: vi.fn(),
  updateSetting: vi.fn().mockResolvedValue({ success: true }),
}))

beforeEach(() => {
  useSettingsStore.setState({
    settings: {},
    models: [],
    hasApiKey: false,
    loaded: false,
  })
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})

describe('useTheme', () => {
  it('defaults to light when no stored preference and no system dark mode', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')
  })

  it('reads from localStorage when available', () => {
    localStorage.setItem('chatgraph-theme', 'dark')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
  })

  it('toggles theme and calls updateSetting', async () => {
    const { result } = renderHook(() => useTheme())

    await act(async () => {
      result.current.toggle()
    })

    // Was light, should now be dark
    expect(api.updateSetting).toHaveBeenCalledWith('theme', 'dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
