import { useEffect, useCallback, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useConversation } from '../../hooks/useConversation'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { useSettingsStore } from '../../stores/settingsStore'
import { useUIStore } from '../../stores/uiStore'
import { useConversationStore } from '../../stores/conversationStore'
import { Header } from './Header'
import { ChatPanel } from '../chat/ChatPanel'
import { GraphPanel } from '../graph/GraphPanel'
import { SettingsDialog } from '../settings/SettingsDialog'
import { ShortcutsDialog } from '../shared/ShortcutsDialog'
import { SearchModal } from '../shared/SearchModal'
import { ComparisonView } from '../shared/ComparisonView'
import { ConversationList } from '../chat/ConversationList'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import { ToastContainer } from '../ui/Toast'
import { AnalyticsPanel } from '../shared/AnalyticsPanel'
import { ActivityFeed } from '../shared/ActivityFeed'
import { useActivityStore } from '../../stores/activityStore'

export function AppLayout() {
  useConversation()
  useKeyboardShortcuts()

  const loadSettings = useSettingsStore((s) => s.loadSettings)
  const loadConversations = useConversationStore((s) => s.loadConversations)
  const chatPanelWidth = useUIStore((s) => s.chatPanelWidth)
  const setChatPanelWidth = useUIStore((s) => s.setChatPanelWidth)
  const settingsOpen = useUIStore((s) => s.settingsOpen)
  const shortcutsHelpOpen = useUIStore((s) => s.shortcutsHelpOpen)
  const searchOpen = useUIStore((s) => s.searchOpen)
  const compareState = useUIStore((s) => s.compareState)
  const analyticsOpen = useUIStore((s) => s.analyticsOpen)
  const activityOpen = useActivityStore((s) => s.isOpen)
  const activeConversationId = useConversationStore(
    (s) => s.activeConversationId,
  )
  const loaded = useSettingsStore((s) => s.loaded)

  useEffect(() => {
    loadSettings()
    loadConversations()
  }, [loadSettings, loadConversations])

  const isResizing = useRef(false)

  const clampWidth = useCallback(
    (clientX: number) => {
      const pct = (clientX / window.innerWidth) * 100
      setChatPanelWidth(Math.min(70, Math.max(30, pct)))
    },
    [setChatPanelWidth],
  )

  const handleMouseDown = useCallback(() => {
    isResizing.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      clampWidth(e.clientX)
    }

    const handleMouseUp = () => {
      isResizing.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [clampWidth])

  const handleTouchStart = useCallback(() => {
    isResizing.current = true
    document.body.style.userSelect = 'none'

    const handleTouchMove = (e: TouchEvent) => {
      if (!isResizing.current) return
      const touch = e.touches[0]
      if (touch) clampWidth(touch.clientX)
    }

    const handleTouchEnd = () => {
      isResizing.current = false
      document.body.style.userSelect = ''
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }

    document.addEventListener('touchmove', handleTouchMove)
    document.addEventListener('touchend', handleTouchEnd)
  }, [clampWidth])

  if (!loaded) {
    return (
      <div className="flex h-full items-center justify-center bg-page">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-page">
      <Header />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {activeConversationId ? (
          compareState.isComparing ? (
            <ComparisonView />
          ) : (
            <>
              <div
                className="flex min-h-0 flex-col overflow-hidden"
                style={{ width: `${chatPanelWidth}%` }}
              >
                <ChatPanel />
              </div>
              <div
                role="separator"
                className="w-px cursor-col-resize bg-border hover:bg-accent transition-colors"
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
              />
              <div className="flex-1 overflow-hidden">
                <GraphPanel />
              </div>
            </>
          )
        ) : (
          <ConversationList />
        )}
      </div>
      <AnimatePresence>
        {settingsOpen && <SettingsDialog />}
        {shortcutsHelpOpen && <ShortcutsDialog />}
        {searchOpen && <SearchModal />}
        {analyticsOpen && <AnalyticsPanel />}
        {activityOpen && <ActivityFeed />}
      </AnimatePresence>
      <ToastContainer />
    </div>
  )
}
