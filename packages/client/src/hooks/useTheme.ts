import { useCallback, useEffect } from 'react'
import { useSettingsStore } from '../stores/settingsStore'

type Theme = 'light' | 'dark'

function applyTheme(theme: Theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
  localStorage.setItem('chatgraph-theme', theme)
}

function getStoredTheme(): Theme {
  const stored = localStorage.getItem('chatgraph-theme') as Theme | null
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function useTheme() {
  const settings = useSettingsStore((s) => s.settings)
  const updateSetting = useSettingsStore((s) => s.updateSetting)
  const theme = (settings.theme as Theme | undefined) ?? getStoredTheme()

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Listen for system preference changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      // Only auto-follow if no explicit user preference is stored
      if (!settings.theme) {
        applyTheme(e.matches ? 'dark' : 'light')
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [settings.theme])

  const toggle = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    updateSetting('theme', next)
  }, [theme, updateSetting])

  const setTheme = useCallback(
    (value: Theme) => {
      applyTheme(value)
      updateSetting('theme', value)
    },
    [updateSetting],
  )

  return { theme, toggle, setTheme }
}
