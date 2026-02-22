import { useState, useRef, useEffect, useCallback } from 'react'
import {
  ChevronLeft,
  Search,
  Download,
  Sun,
  Moon,
  Settings,
  Brain,
  Clock,
  GitBranch,
} from 'lucide-react'
import { useConversationStore } from '../../stores/conversationStore'
import { useUIStore } from '../../stores/uiStore'
import { useTheme } from '../../hooks/useTheme'
import { useNavigate } from 'react-router-dom'
import { ExportDialog } from '../shared/ExportDialog'
import { useActivityStore } from '../../stores/activityStore'
import { IconButton } from '../ui/IconButton'
import { Badge } from '../ui/Badge'
import { Input } from '../ui/Input'
import * as api from '../../services/api'

export function Header() {
  const activeConversationId = useConversationStore(
    (s) => s.activeConversationId,
  )
  const nodes = useConversationStore((s) => s.nodes)
  const loadConversations = useConversationStore((s) => s.loadConversations)
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen)
  const setSearchOpen = useUIStore((s) => s.setSearchOpen)
  const { theme, toggle: toggleTheme } = useTheme()
  const navigate = useNavigate()

  const conversations = useConversationStore((s) => s.conversations)
  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId,
  )

  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [exportOpen, setExportOpen] = useState(false)
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSuggestRetitle = useCallback(
    async (e: Event) => {
      const detail = (e as CustomEvent).detail as { conversationId: string }
      if (detail.conversationId !== activeConversationId) return
      setLoadingSuggestions(true)
      try {
        const titles = await api.suggestTitles(detail.conversationId)
        if (titles.length > 0) setTitleSuggestions(titles)
      } catch {
        // silently fail
      } finally {
        setLoadingSuggestions(false)
      }
    },
    [activeConversationId],
  )

  useEffect(() => {
    window.addEventListener('chatgraph:suggest-retitle', handleSuggestRetitle)
    return () => window.removeEventListener('chatgraph:suggest-retitle', handleSuggestRetitle)
  }, [handleSuggestRetitle])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handlePickTitle = async (title: string) => {
    if (!activeConversationId) return
    await api.renameConversation(activeConversationId, title)
    await loadConversations()
    setTitleSuggestions([])
  }

  const handleStartEdit = () => {
    if (!activeConversation) return
    setEditTitle(activeConversation.title)
    setIsEditing(true)
  }

  const handleSave = async () => {
    const trimmed = editTitle.trim()
    if (trimmed && activeConversationId && trimmed !== activeConversation?.title) {
      await api.renameConversation(activeConversationId, trimmed)
      await loadConversations()
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
    }
  }

  return (
    <header className="glass flex h-14 items-center justify-between border-b border-[var(--glass-border)] px-5 shadow-xs">
      <div className="flex items-center gap-3">
        {/* Logo */}
        <div className="flex h-8 w-8 items-center justify-center rounded-lg shadow-sm" style={{ backgroundImage: 'var(--gradient-accent)' }}>
          <GitBranch size={15} className="text-white" />
        </div>

        {activeConversationId && (
          <IconButton
            onClick={() => navigate('/')}
            aria-label="Back to conversations"
            tooltip="Back"
            size="sm"
          >
            <ChevronLeft size={18} />
          </IconButton>
        )}
        {isEditing ? (
          <Input
            ref={inputRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="h-7 w-64 text-sm font-semibold"
          />
        ) : (
          <h1
            onClick={activeConversation ? handleStartEdit : undefined}
            className={`text-base font-semibold tracking-tight text-fg-primary ${
              activeConversation
                ? 'cursor-pointer hover:text-accent transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-accent hover:after:w-full after:transition-all after:duration-200'
                : ''
            }`}
          >
            {activeConversation?.title ?? 'ChatGraph'}
          </h1>
        )}
        {activeConversationId && !isEditing && (
          <Badge variant="outline">{nodes.size} nodes</Badge>
        )}
        {/* Title suggestions dropdown */}
        {titleSuggestions.length > 0 && (
          <div className="relative">
            <div className="glass-strong absolute left-0 top-full z-50 mt-1 w-72 rounded-xl border border-[var(--glass-border)] shadow-lg">
              <div className="px-3 py-2 text-xs font-medium text-fg-muted border-b border-[var(--glass-border)]">
                Suggested titles
              </div>
              {titleSuggestions.map((title, i) => (
                <button
                  key={i}
                  onClick={() => handlePickTitle(title)}
                  className="w-full px-3 py-2 text-left text-sm text-fg-secondary hover:bg-[var(--glass-bg-elevated)] transition-colors"
                >
                  {title}
                </button>
              ))}
              <button
                onClick={() => setTitleSuggestions([])}
                className="w-full border-t border-[var(--glass-border)] px-3 py-1.5 text-left text-xs text-fg-muted hover:bg-[var(--glass-bg-elevated)] transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
        {loadingSuggestions && (
          <span className="text-xs text-fg-muted animate-pulse">Loading titles...</span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <IconButton
          onClick={() => setSearchOpen(true)}
          aria-label="Search"
          tooltip="Search (Ctrl+K)"
        >
          <Search size={16} />
        </IconButton>
        {activeConversationId && (
          <>
            <IconButton
              onClick={() => useUIStore.getState().setAnalyticsOpen(true)}
              aria-label="Conversation analytics"
              tooltip="Analytics"
            >
              <Brain size={16} />
            </IconButton>
            <IconButton
              onClick={() => setExportOpen(true)}
              aria-label="Export conversation"
              tooltip="Export"
            >
              <Download size={16} />
            </IconButton>
          </>
        )}
        {/* Separator between conversation-scoped and global actions */}
        <div className="mx-2 h-6 w-px bg-[var(--glass-border)]" />
        <IconButton
          onClick={() => useActivityStore.getState().toggleOpen()}
          aria-label="Activity feed"
          tooltip="Activity Feed"
        >
          <Clock size={16} />
        </IconButton>
        <IconButton
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          tooltip={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </IconButton>
        <IconButton
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
          tooltip="Settings (Ctrl+,)"
        >
          <Settings size={16} />
        </IconButton>
      </div>
      {exportOpen && <ExportDialog onClose={() => setExportOpen(false)} />}
    </header>
  )
}
