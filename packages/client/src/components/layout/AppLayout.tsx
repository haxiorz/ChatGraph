import { useEffect, useCallback, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { GitBranch } from 'lucide-react'
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
  const [dividerHovered, setDividerHovered] = useState(false)

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
      <div className="gradient-mesh-bg flex h-full flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg shadow-accent-lg" style={{ backgroundImage: 'var(--gradient-accent)' }}>
            <GitBranch size={24} className="text-white" />
          </div>
          <div className="absolute inset-0 rounded-lg bg-accent blur-xl opacity-30" />
        </div>
        <motion.div
          className="text-sm text-fg-muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Loading ChatGraph...
        </motion.div>
      </div>
    )
  }

  return (
    <div className="gradient-mesh-bg flex h-full flex-col">
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
              {/* Resize divider */}
              <div
                role="separator"
                className="relative w-3 cursor-col-resize flex items-center justify-center group"
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onMouseEnter={() => setDividerHovered(true)}
                onMouseLeave={() => setDividerHovered(false)}
              >
                <div
                  className={`h-full transition-all duration-150 ${
                    dividerHovered
                      ? 'w-1 bg-accent/60 rounded-full'
                      : 'w-px bg-[var(--glass-border)]'
                  }`}
                />
              </div>
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
