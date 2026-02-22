import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Plus,
  Upload,
  MessageCircle,
  ChevronRight,
  Trash2,
  Lightbulb,
  Code2,
  PenLine,
} from 'lucide-react'
import { useConversationStore } from '../../stores/conversationStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useUIStore } from '../../stores/uiStore'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { PromptLibrary } from '../shared/PromptLibrary'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { Card } from '../ui/Card'
import { listItem, EASE_OUT_FAST } from '../../utils/animations'
import * as api from '../../services/api'
import { toast } from '../../stores/toastStore'
import { clearSavedViewport } from '../graph/GraphPanel'

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

const ACCENT_COLORS = [
  { bar: 'bg-indigo-500', barHover: 'group-hover:bg-indigo-400' },
  { bar: 'bg-emerald-500', barHover: 'group-hover:bg-emerald-400' },
  { bar: 'bg-amber-500', barHover: 'group-hover:bg-amber-400' },
  { bar: 'bg-rose-500', barHover: 'group-hover:bg-rose-400' },
  { bar: 'bg-sky-500', barHover: 'group-hover:bg-sky-400' },
  { bar: 'bg-violet-500', barHover: 'group-hover:bg-violet-400' },
]

function getTitleColor(title: string): (typeof ACCENT_COLORS)[number] {
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = ((hash << 5) - hash + title.charCodeAt(i)) | 0
  }
  return ACCENT_COLORS[Math.abs(hash) % ACCENT_COLORS.length]
}

const SUGGESTIONS = [
  { icon: Lightbulb, label: 'Brainstorm ideas' },
  { icon: Code2, label: 'Analyze code' },
  { icon: PenLine, label: 'Creative writing' },
] as const

export function ConversationList() {
  const conversations = useConversationStore((s) => s.conversations)
  const loadConversations = useConversationStore((s) => s.loadConversations)
  const hasApiKey = useSettingsStore((s) => s.hasApiKey)
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen)
  const navigate = useNavigate()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [showPromptPicker, setShowPromptPicker] = useState(false)
  const [selectedPromptContent, setSelectedPromptContent] = useState(
    'You are a helpful assistant.',
  )
  const importRef = useRef<HTMLInputElement>(null)

  const handleNew = async (systemPrompt?: string) => {
    const conversation = await api.createConversation()
    await api.createNode(conversation.id, {
      parentId: null,
      role: 'system',
      content: systemPrompt ?? selectedPromptContent,
    })
    await loadConversations()
    navigate(`/c/${conversation.id}`)
    setShowPromptPicker(false)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.deleteConversation(deleteTarget)
      clearSavedViewport(deleteTarget)
      setDeleteTarget(null)
      await loadConversations()
      toast.success('Conversation deleted')
    } catch {
      toast.error('Failed to delete conversation')
      setDeleteTarget(null)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      await api.importConversation(data)
      await loadConversations()
      toast.success('Conversation imported')
    } catch {
      toast.error('Failed to import conversation')
    }
    if (importRef.current) importRef.current.value = ''
  }

  const fewConversations = conversations.length > 0 && conversations.length < 5

  return (
    <div
      className={`ambient-bg flex flex-1 flex-col items-center ${
        conversations.length === 0 || fewConversations
          ? 'justify-center'
          : 'justify-start'
      } p-12`}
    >
      <div className="relative z-10 w-full max-w-2xl">
        {conversations.length === 0 ? (
          /* ── Empty State ── */
          <div className="flex flex-col items-center text-center">
            {!hasApiKey && (
              <div className="mb-6 w-full rounded-lg border border-warning/30 bg-warning/5 p-4">
                <p className="text-sm text-fg-secondary">
                  No API key configured.{' '}
                  <button
                    onClick={() => setSettingsOpen(true)}
                    className="font-medium text-accent underline hover:text-accent-hover"
                  >
                    Open Settings
                  </button>{' '}
                  to add your OpenRouter API key.
                </p>
              </div>
            )}

            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="mb-6"
            >
              <div className="relative flex h-20 w-20 items-center justify-center rounded-xl shadow-accent-lg" style={{ backgroundImage: 'var(--gradient-accent)' }}>
                <div className="absolute inset-0 animate-pulse rounded-xl bg-accent/20 blur-xl" />
                <MessageCircle
                  size={36}
                  strokeWidth={1.5}
                  className="relative text-white"
                />
              </div>
            </motion.div>

            <h1 className="text-3xl font-bold tracking-tight text-fg-primary">
              {getGreeting()}
            </h1>
            <p className="mt-2 text-base text-fg-muted">
              What would you like to explore?
            </p>

            <Button
              className="mt-6"
              onClick={() => setShowPromptPicker(true)}
            >
              <Plus size={14} className="mr-1.5" />
              New Conversation
            </Button>

            <div className="mt-10 flex gap-3">
              {SUGGESTIONS.map(({ icon: Icon, label }, idx) => (
                <motion.button
                  key={label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.3 + idx * 0.1,
                    duration: 0.4,
                    ease: 'easeOut',
                  }}
                  onClick={() => setShowPromptPicker(true)}
                  className="glass flex items-center gap-2 rounded-lg border border-[var(--glass-border)] px-4 py-2.5 text-sm text-fg-secondary transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:bg-[var(--glass-bg-elevated)] hover:text-fg-primary hover:shadow-md"
                >
                  <Icon size={15} strokeWidth={1.5} />
                  {label}
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          /* ── With Conversations ── */
          <>
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-fg-primary">
                  {getGreeting()}
                </h2>
                <p className="mt-0.5 text-sm text-fg-muted">
                  Pick up where you left off
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => importRef.current?.click()}
                >
                  <Upload size={14} className="mr-1.5" />
                  Import
                </Button>
                <input
                  ref={importRef}
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
                <Button
                  size="sm"
                  onClick={() => setShowPromptPicker(true)}
                >
                  <Plus size={14} className="mr-1.5" />
                  New Conversation
                </Button>
              </div>
            </div>

            {!hasApiKey && (
              <div className="mb-4 rounded-lg border border-warning/30 bg-warning/5 p-4">
                <p className="text-sm text-fg-secondary">
                  No API key configured.{' '}
                  <button
                    onClick={() => setSettingsOpen(true)}
                    className="font-medium text-accent underline hover:text-accent-hover"
                  >
                    Open Settings
                  </button>{' '}
                  to add your OpenRouter API key.
                </p>
              </div>
            )}

            <div className="space-y-3">
              {conversations.map((conv, idx) => {
                const color = getTitleColor(conv.title)
                const createdStr = formatRelativeTime(conv.createdAt)
                const updatedStr = formatRelativeTime(conv.updatedAt)
                const showBoth = createdStr !== updatedStr

                return (
                  <motion.div
                    key={conv.id}
                    variants={listItem}
                    initial="initial"
                    animate="animate"
                    transition={{ ...EASE_OUT_FAST, delay: idx * 0.03 }}
                  >
                    <Card
                      interactive
                      onClick={() => navigate(`/c/${conv.id}`)}
                      className="group flex items-center justify-between overflow-hidden p-0"
                    >
                      <div
                        className={`w-[3px] self-stretch ${color.bar} transition-all duration-200 ${color.barHover}`}
                      />
                      <div className="min-w-0 flex-1 px-5 py-4">
                        <h3 className="font-medium text-fg-primary">
                          {conv.title}
                        </h3>
                        <p className="mt-0.5 text-xs text-fg-muted">
                          {showBoth
                            ? `Created ${createdStr} · Updated ${updatedStr}`
                            : `Updated ${updatedStr}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 pr-4">
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteTarget(conv.id)
                          }}
                          aria-label="Delete"
                          variant="danger"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </IconButton>
                        <ChevronRight
                          size={16}
                          className="text-fg-muted opacity-0 transition-opacity group-hover:opacity-100"
                        />
                      </div>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title="Delete conversation"
          message="This will permanently delete this conversation and all its messages. This action cannot be undone."
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <Modal
        open={showPromptPicker}
        onClose={() => setShowPromptPicker(false)}
        className="max-w-md p-6"
      >
        <h3 className="mb-3 text-lg font-semibold text-fg-primary">
          Choose a System Prompt
        </h3>
        <PromptLibrary
          mode="selector"
          onSelect={setSelectedPromptContent}
          selectedContent={selectedPromptContent}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => setShowPromptPicker(false)}
          >
            Cancel
          </Button>
          <Button onClick={() => handleNew()}>
            Create
          </Button>
        </div>
      </Modal>
    </div>
  )
}
