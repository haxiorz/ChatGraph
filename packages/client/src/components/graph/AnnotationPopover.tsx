import { useState, useRef, useEffect, useCallback } from 'react'
import { StickyNote, Save, Trash2 } from 'lucide-react'
import { useConversationStore } from '../../stores/conversationStore'
import { toast } from '../../stores/toastStore'

interface AnnotationPopoverProps {
  nodeId: string
  x: number
  y: number
  onClose: () => void
}

const MAX_ANNOTATION_LENGTH = 500

export function AnnotationPopover({ nodeId, x, y, onClose }: AnnotationPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const nodes = useConversationStore((s) => s.nodes)
  const updateNodeData = useConversationStore((s) => s.updateNodeData)

  const node = nodes.get(nodeId)
  const meta = (node?.metadata ?? {}) as Record<string, unknown>
  const existingAnnotation = (meta.annotation as string) ?? ''

  const [text, setText] = useState(existingAnnotation)
  const [saving, setSaving] = useState(false)

  const handleSave = useCallback(async () => {
    if (saving) return
    const trimmed = text.trim()
    if (trimmed === existingAnnotation) {
      onClose()
      return
    }
    setSaving(true)
    try {
      const newMeta = { ...meta, annotation: trimmed || undefined }
      if (!trimmed) delete newMeta.annotation
      await updateNodeData(nodeId, { metadata: newMeta })
      toast.success(trimmed ? 'Note saved' : 'Note removed')
      onClose()
    } catch {
      toast.error('Failed to save note')
    } finally {
      setSaving(false)
    }
  }, [text, existingAnnotation, meta, nodeId, updateNodeData, onClose, saving])

  const handleRemove = useCallback(async () => {
    if (saving) return
    setSaving(true)
    try {
      const newMeta = { ...meta }
      delete newMeta.annotation
      await updateNodeData(nodeId, { metadata: newMeta })
      toast.success('Note removed')
      onClose()
    } catch {
      toast.error('Failed to remove note')
    } finally {
      setSaving(false)
    }
  }, [meta, nodeId, updateNodeData, onClose, saving])

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!node) return null

  return (
    <div
      ref={popoverRef}
      style={{ position: 'fixed', left: x, top: y, zIndex: 50 }}
      className="w-[280px] rounded-lg border border-amber-400/40 bg-surface shadow-lg"
    >
      <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
        <StickyNote size={14} className="text-amber-500" />
        <span className="text-xs font-medium text-fg-secondary">
          {existingAnnotation ? 'Edit note' : 'Add note'}
        </span>
      </div>
      <div className="p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_ANNOTATION_LENGTH))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
              e.preventDefault()
              handleSave()
            }
          }}
          placeholder="Add a note to this node..."
          rows={3}
          autoFocus
          className="w-full resize-none rounded-md border border-border bg-elevated px-2.5 py-1.5 text-xs text-fg-primary placeholder:text-fg-muted outline-none focus:border-amber-400"
        />
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-[10px] text-fg-muted">
            {text.length}/{MAX_ANNOTATION_LENGTH}
          </span>
          <div className="flex items-center gap-1.5">
            {existingAnnotation && (
              <button
                onClick={handleRemove}
                disabled={saving}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
              >
                <Trash2 size={11} />
                Remove
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || text.trim() === existingAnnotation}
              className="flex items-center gap-1 rounded-md bg-amber-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              <Save size={11} />
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
