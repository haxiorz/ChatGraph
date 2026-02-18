import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '../stores/uiStore'
import { useConversationStore } from '../stores/conversationStore'
import { useTheme } from './useTheme'

const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.userAgent)

function isModKey(e: KeyboardEvent) {
  return isMac ? e.metaKey : e.ctrlKey
}

function isInputFocused() {
  const tag = document.activeElement?.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    (document.activeElement as HTMLElement)?.isContentEditable === true
  )
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate()
  const { toggle: toggleTheme } = useTheme()

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.isComposing) return

      const ui = useUIStore.getState()

      // Close modals on Escape
      if (e.key === 'Escape') {
        if (ui.shortcutsHelpOpen) {
          ui.setShortcutsHelpOpen(false)
          e.preventDefault()
          return
        }
        if (ui.searchOpen) {
          ui.setSearchOpen(false)
          e.preventDefault()
          return
        }
        if (ui.settingsOpen) {
          ui.setSettingsOpen(false)
          e.preventDefault()
          return
        }
        return
      }

      // Ctrl+K — open search
      if (isModKey(e) && e.key === 'k') {
        e.preventDefault()
        ui.setSearchOpen(!ui.searchOpen)
        return
      }

      // Ctrl+N — new conversation
      if (isModKey(e) && e.key === 'n') {
        e.preventDefault()
        navigate('/')
        return
      }

      // Ctrl+, — settings
      if (isModKey(e) && e.key === ',') {
        e.preventDefault()
        ui.setSettingsOpen(!ui.settingsOpen)
        return
      }

      // Ctrl+D — toggle dark mode
      if (isModKey(e) && e.key === 'd') {
        e.preventDefault()
        toggleTheme()
        return
      }

      // Ctrl+Shift+S — stop streaming
      if (isModKey(e) && e.shiftKey && e.key === 'S') {
        const controller = ui.abortController
        if (controller) {
          e.preventDefault()
          controller.abort()
          ui.setStreamState({ status: 'idle' })
          ui.setAbortController(null)
        }
        return
      }

      // Shortcuts below only when not typing in an input
      if (isInputFocused()) return

      // ? — shortcuts help
      if (e.key === '?' && !e.shiftKey && !isModKey(e)) {
        e.preventDefault()
        ui.setShortcutsHelpOpen(!ui.shortcutsHelpOpen)
        return
      }

      // / — focus chat input
      if (e.key === '/' && !isModKey(e)) {
        const input = document.getElementById('chat-input') as HTMLTextAreaElement | null
        if (input) {
          e.preventDefault()
          input.focus()
        }
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate, toggleTheme])
}
