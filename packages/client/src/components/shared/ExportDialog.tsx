import { useState } from 'react'
import { toPng } from 'html-to-image'
import { useConversationStore } from '../../stores/conversationStore'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import * as api from '../../services/api'

interface ExportDialogProps {
  onClose: () => void
}

type ExportFormat = 'json' | 'markdown' | 'png'

export function ExportDialog({ onClose }: ExportDialogProps) {
  const activeConversationId = useConversationStore(
    (s) => s.activeConversationId,
  )
  const activeNodeId = useConversationStore((s) => s.activeNodeId)
  const [format, setFormat] = useState<ExportFormat>('json')
  const [scope, setScope] = useState<'full' | 'active'>('full')
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    if (!activeConversationId) return
    setExporting(true)

    try {
      if (format === 'png') {
        const graphEl = document.querySelector('.react-flow') as HTMLElement
        if (graphEl) {
          const dataUrl = await toPng(graphEl, { backgroundColor: '#ffffff' })
          downloadUrl(dataUrl, 'graph.png')
        }
      } else if (format === 'markdown') {
        const data = await api.exportConversation(
          activeConversationId,
          'markdown',
          scope === 'active' ? activeNodeId ?? undefined : undefined,
        )
        downloadText(data as string, 'conversation.md', 'text/markdown')
      } else {
        const data = await api.exportConversation(activeConversationId, 'json')
        downloadText(
          JSON.stringify(data, null, 2),
          'conversation.json',
          'application/json',
        )
      }
    } catch {
      // Export failed
    }

    setExporting(false)
    onClose()
  }

  const FORMAT_OPTIONS = [
    { value: 'json' as const, label: 'JSON' },
    { value: 'markdown' as const, label: 'Markdown' },
    { value: 'png' as const, label: 'PNG' },
  ]

  return (
    <Modal open onClose={onClose} className="max-w-sm p-6">
      <h3 className="mb-4 text-lg font-semibold text-fg-primary">
        Export Conversation
      </h3>

      <div className="mb-4 space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-fg-secondary">
            Format
          </label>
          <div className="flex gap-2">
            {FORMAT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFormat(opt.value)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  format === opt.value
                    ? 'border-accent bg-accent-muted text-accent'
                    : 'border-border text-fg-muted hover:border-border-strong'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {format !== 'png' && (
          <div>
            <label className="mb-1 block text-sm font-medium text-fg-secondary">
              Scope
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setScope('full')}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  scope === 'full'
                    ? 'border-accent bg-accent-muted text-accent'
                    : 'border-border text-fg-muted hover:border-border-strong'
                }`}
              >
                Full Tree
              </button>
              <button
                onClick={() => setScope('active')}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  scope === 'active'
                    ? 'border-accent bg-accent-muted text-accent'
                    : 'border-border text-fg-muted hover:border-border-strong'
                }`}
              >
                Active Path
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleExport} disabled={exporting}>
          {exporting ? 'Exporting...' : 'Export'}
        </Button>
      </div>
    </Modal>
  )
}

function downloadText(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  downloadUrl(url, filename)
  URL.revokeObjectURL(url)
}

function downloadUrl(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
