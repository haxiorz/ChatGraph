import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Upload, MessageCircle, ChevronRight, Trash2 } from 'lucide-react'
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
import type { Prompt } from '../../types/index'
import * as api from '../../services/api'
import { toast } from '../../stores/toastStore'
import { clearSavedViewport } from '../graph/GraphPanel'

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

  return (
    <div className="flex flex-1 flex-col items-center justify-start p-8">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight text-fg-primary">
            Conversations
          </h2>
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

        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-12 text-center">
            <MessageCircle size={40} strokeWidth={1.5} className="text-fg-muted" />
            <div>
              <p className="text-sm font-medium text-fg-secondary">No conversations yet</p>
              <p className="mt-1 text-xs text-fg-muted">
                Click &quot;New Conversation&quot; to get started.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv, idx) => (
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
                  className="group flex items-center justify-between p-4"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-fg-primary">
                      {conv.title}
                    </h3>
                    <p className="text-xs text-fg-muted">
                      {new Date(conv.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
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
                    <ChevronRight size={16} className="text-fg-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
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
