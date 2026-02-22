import { useState, useCallback, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp, Sparkles, Square, Swords, Undo2, Loader2, Paperclip, X, FileText, Code, Image, FileIcon } from 'lucide-react'
import { useCompletion } from '../../hooks/useCompletion'
import { useConversationStore } from '../../stores/conversationStore'
import { useUIStore } from '../../stores/uiStore'
import { useTournamentStore } from '../../stores/tournamentStore'
import { ModelSelector } from '../shared/ModelSelector'
import { ThinkingLevelToggle } from '../shared/ThinkingLevelToggle'
import { TournamentModelPicker } from './TournamentModelPicker'
import { EASE_OUT_FAST } from '../../utils/animations'
import * as api from '../../services/api'
import { toast } from '../../stores/toastStore'
import type { UploadedFileInfo } from '../../types/index'
import { formatFileSize } from '../../utils/format'

interface PendingFile {
  file: File
  preview?: string
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_FILES = 10

const FILE_CATEGORY_ICONS = {
  image: Image,
  code: Code,
  text: FileText,
  pdf: FileIcon,
}

function getFileCategory(file: File): 'image' | 'code' | 'text' | 'pdf' {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type === 'application/pdf') return 'pdf'
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const codeExts = ['ts', 'tsx', 'js', 'jsx', 'py', 'rs', 'go', 'java', 'kt', 'swift', 'c', 'cpp', 'h', 'cs', 'rb', 'php', 'sql', 'sh', 'yml', 'yaml', 'json', 'html', 'css', 'vue', 'svelte']
  if (codeExts.includes(ext)) return 'code'
  return 'text'
}

export function MessageInput() {
  const [content, setContent] = useState('')
  const [tournamentPickerOpen, setTournamentPickerOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const [enhancing, setEnhancing] = useState(false)
  const [originalPrompt, setOriginalPrompt] = useState<string | null>(null)
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const { sendMessage, sendTournament, abort } = useCompletion()
  const streamState = useUIStore((s) => s.streamState)
  const tournamentActive = useTournamentStore((s) => s.active)
  const activeConversationId = useConversationStore((s) => s.activeConversationId)
  const activeNodeId = useConversationStore((s) => s.activeNodeId)
  const nodes = useConversationStore((s) => s.nodes)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isStreaming = streamState.status === 'streaming'
  const activeNode = activeNodeId ? nodes.get(activeNodeId) : null
  const isActiveNodeUser = activeNode?.role === 'user'

  const addFiles = useCallback((files: File[]) => {
    const valid = files.filter((f) => {
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`${f.name} exceeds 10MB limit`)
        return false
      }
      return true
    })

    setPendingFiles((prev) => {
      const total = prev.length + valid.length
      if (total > MAX_FILES) {
        toast.warning(`Maximum ${MAX_FILES} files allowed`)
        return prev
      }
      return [
        ...prev,
        ...valid.map((file) => {
          const pf: PendingFile = { file }
          if (file.type.startsWith('image/')) {
            pf.preview = URL.createObjectURL(file)
          }
          return pf
        }),
      ]
    })
  }, [])

  const removeFile = useCallback((index: number) => {
    setPendingFiles((prev) => {
      const removed = prev[index]
      if (removed?.preview) URL.revokeObjectURL(removed.preview)
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  const handleSend = useCallback(async () => {
    const trimmed = content.trim()
    if ((!trimmed && pendingFiles.length === 0) || isStreaming || tournamentActive || isActiveNodeUser) return

    const messageContent = trimmed || '(files attached)'
    setContent('')
    setOriginalPrompt(null)

    // Upload files first if any
    let uploadedFiles: UploadedFileInfo[] | undefined
    if (pendingFiles.length > 0 && activeConversationId) {
      setUploading(true)
      try {
        uploadedFiles = await api.uploadFiles(
          activeConversationId,
          pendingFiles.map((pf) => pf.file),
        )
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'File upload failed')
        setUploading(false)
        return
      }
      // Clean up previews
      for (const pf of pendingFiles) {
        if (pf.preview) URL.revokeObjectURL(pf.preview)
      }
      setPendingFiles([])
      setUploading(false)
    }

    sendMessage(messageContent, { files: uploadedFiles })
  }, [content, pendingFiles, isStreaming, tournamentActive, isActiveNodeUser, sendMessage, activeConversationId])

  const handleEnhance = useCallback(async () => {
    const trimmed = content.trim()
    if (!trimmed || isStreaming || tournamentActive || enhancing || isActiveNodeUser) return
    setOriginalPrompt(content)
    setEnhancing(true)
    try {
      const { enhanced } = await api.enhancePrompt(trimmed)
      setContent(enhanced)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to enhance prompt',
      )
      setOriginalPrompt(null)
    } finally {
      setEnhancing(false)
    }
  }, [content, isStreaming, tournamentActive, enhancing, isActiveNodeUser])

  const handleUndo = useCallback(() => {
    if (originalPrompt !== null) {
      setContent(originalPrompt)
      setOriginalPrompt(null)
    }
  }, [originalPrompt])

  const handleContentChange = useCallback((value: string) => {
    setContent(value)
    setOriginalPrompt(null)
  }, [])

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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) addFiles(files)
  }, [addFiles])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) addFiles(files)
    e.target.value = ''
  }, [addFiles])

  return (
    <div className="border-t border-[var(--glass-border)] bg-transparent px-4 py-4">
      <div className="mx-auto max-w-3xl">
        {isActiveNodeUser && (
          <p className="mb-2 text-xs text-fg-muted">
            Select an assistant response to continue the conversation
          </p>
        )}
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        {/* Unified input card — glass */}
        <div
          className={`glass rounded-xl border shadow-sm transition-all duration-200 ${
            isDragging
              ? 'border-accent border-dashed shadow-accent bg-accent/5'
              : focused ? 'border-accent/40 shadow-accent' : 'border-[var(--glass-border)]'
          }`}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isDragging && (
            <div className="flex items-center justify-center py-4 text-sm text-accent">
              Drop files here
            </div>
          )}
          <textarea
            id="chat-input"
            ref={textareaRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={isActiveNodeUser ? 'Cannot send from a user node...' : 'Type a message...'}
            rows={1}
            className="w-full resize-none rounded-t-xl border-none bg-transparent px-5 pt-3.5 pb-2 text-sm text-fg-primary placeholder:text-fg-muted focus:outline-none disabled:opacity-50"
            disabled={isStreaming || tournamentActive || isActiveNodeUser || enhancing || uploading}
            readOnly={enhancing}
          />
          {/* File chips */}
          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-4 pb-1">
              {pendingFiles.map((pf, i) => {
                const category = getFileCategory(pf.file)
                const Icon = FILE_CATEGORY_ICONS[category]
                return (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 rounded-md border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2 py-1 text-xs text-fg-secondary"
                  >
                    {pf.preview ? (
                      <img src={pf.preview} alt="" className="h-6 w-6 rounded object-cover" />
                    ) : (
                      <Icon size={14} className="text-fg-muted" />
                    )}
                    <span className="max-w-[120px] truncate">{pf.file.name}</span>
                    <span className="text-fg-muted text-[10px]">{formatFileSize(pf.file.size)}</span>
                    <button
                      onClick={() => removeFile(i)}
                      className="ml-0.5 rounded p-0.5 text-fg-muted hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
          {/* Bottom toolbar */}
          <div className="flex items-center justify-between px-4 pb-3">
            <div className="flex items-center gap-2">
              <ModelSelector />
              <ThinkingLevelToggle />
              {/* Enhance prompt button */}
              <motion.button
                onClick={handleEnhance}
                disabled={!content.trim() || isStreaming || tournamentActive || enhancing || isActiveNodeUser}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-muted transition-all hover:text-violet-500 hover:bg-violet-500/10 disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.9]"
                title="Enhance prompt"
              >
                {enhancing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Sparkles size={16} />
                )}
              </motion.button>
              {/* Undo enhancement */}
              {originalPrompt !== null && !enhancing && (
                <button
                  onClick={handleUndo}
                  className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-fg-muted transition-colors hover:text-fg-primary hover:bg-[var(--glass-bg)]"
                  title="Restore original prompt"
                >
                  <Undo2 size={12} />
                  Undo
                </button>
              )}
              {/* Tournament button */}
              <motion.button
                onClick={() => setTournamentPickerOpen(!tournamentPickerOpen)}
                disabled={!content.trim() || isStreaming || tournamentActive || isActiveNodeUser}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-muted transition-all hover:text-amber-500 hover:bg-amber-500/10 disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.9]"
                title="Tournament Mode"
              >
                <Swords size={16} />
              </motion.button>
              {/* File upload button */}
              <motion.button
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming || tournamentActive || isActiveNodeUser || uploading}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-muted transition-all hover:text-blue-500 hover:bg-blue-500/10 disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.9]"
                title="Attach files"
              >
                {uploading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Paperclip size={16} />
                )}
              </motion.button>
            </div>
            <AnimatePresence mode="wait">
              {isStreaming ? (
                <motion.button
                  key="stop"
                  onClick={abort}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-muted transition-all hover:text-destructive hover:bg-destructive/10 active:scale-[0.9]"
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
                  disabled={(!content.trim() && pendingFiles.length === 0) || tournamentActive || isActiveNodeUser || uploading}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white shadow-sm transition-all hover:shadow-accent active:scale-[0.9] disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
                  style={{ backgroundImage: 'var(--gradient-accent)' }}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={EASE_OUT_FAST}
                >
                  <ArrowUp size={16} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
        {/* Tournament model picker popover */}
        {tournamentPickerOpen && (
          <TournamentModelPicker
            onStart={handleTournamentStart}
            onClose={() => setTournamentPickerOpen(false)}
          />
        )}
      </div>
    </div>
  )
}
