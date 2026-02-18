import { useState, useCallback, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp, Square, Swords } from 'lucide-react'
import { useCompletion } from '../../hooks/useCompletion'
import { useConversationStore } from '../../stores/conversationStore'
import { useUIStore } from '../../stores/uiStore'
import { useTournamentStore } from '../../stores/tournamentStore'
import { ModelSelector } from '../shared/ModelSelector'
import { TournamentModelPicker } from './TournamentModelPicker'
import { EASE_OUT_FAST } from '../../utils/animations'

export function MessageInput() {
  const [content, setContent] = useState('')
  const [tournamentPickerOpen, setTournamentPickerOpen] = useState(false)
  const { sendMessage, sendTournament, abort } = useCompletion()
  const streamState = useUIStore((s) => s.streamState)
  const tournamentActive = useTournamentStore((s) => s.active)
  const activeNodeId = useConversationStore((s) => s.activeNodeId)
  const nodes = useConversationStore((s) => s.nodes)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isStreaming = streamState.status === 'streaming'
  const activeNode = activeNodeId ? nodes.get(activeNodeId) : null
  const isActiveNodeUser = activeNode?.role === 'user'

  const handleSend = useCallback(() => {
    const trimmed = content.trim()
    if (!trimmed || isStreaming || tournamentActive || isActiveNodeUser) return
    setContent('')
    sendMessage(trimmed)
  }, [content, isStreaming, tournamentActive, isActiveNodeUser, sendMessage])

  const handleTournamentStart = useCallback(
    (models: string[]) => {
      const trimmed = content.trim()
      if (!trimmed || isStreaming || tournamentActive) return
      setTournamentPickerOpen(false)
      setContent('')
      sendTournament(trimmed, models)
    },
    [content, isStreaming, tournamentActive, sendTournament],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 150) + 'px'
    }
  }, [content])

  return (
    <div className="border-t border-border bg-surface px-4 py-3">
      <div className="mx-auto max-w-3xl">
        <div className="mb-2 flex items-center gap-2">
          <ModelSelector />
        </div>
        {isActiveNodeUser && (
          <p className="mb-1 text-xs text-fg-muted">
            Select an assistant response to continue the conversation
          </p>
        )}
        <div className="relative flex items-end gap-2">
          <textarea
            id="chat-input"
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isActiveNodeUser ? 'Cannot send from a user node...' : 'Type a message...'}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-fg-primary placeholder:text-fg-muted transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
            disabled={isStreaming || tournamentActive || isActiveNodeUser}
          />
          {/* Tournament button */}
          <motion.button
            onClick={() => setTournamentPickerOpen(!tournamentPickerOpen)}
            disabled={!content.trim() || isStreaming || tournamentActive || isActiveNodeUser}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-fg-muted transition-colors hover:border-amber-500 hover:text-amber-500 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Tournament Mode"
          >
            <Swords size={16} />
          </motion.button>
          <AnimatePresence mode="wait">
            {isStreaming ? (
              <motion.button
                key="stop"
                onClick={abort}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-fg-muted transition-colors hover:border-destructive hover:text-destructive"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={EASE_OUT_FAST}
              >
                <Square size={16} />
              </motion.button>
            ) : (
              <motion.button
                key="send"
                onClick={handleSend}
                disabled={!content.trim() || tournamentActive || isActiveNodeUser}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-text transition-colors hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={EASE_OUT_FAST}
              >
                <ArrowUp size={18} />
              </motion.button>
            )}
          </AnimatePresence>
          {/* Tournament model picker popover */}
          {tournamentPickerOpen && (
            <TournamentModelPicker
              onStart={handleTournamentStart}
              onClose={() => setTournamentPickerOpen(false)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
