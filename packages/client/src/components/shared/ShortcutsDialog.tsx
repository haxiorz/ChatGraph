import { X } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { Modal } from '../ui/Modal'
import { IconButton } from '../ui/IconButton'
import { Kbd } from '../ui/Kbd'

const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.userAgent)
const MOD = isMac ? '\u2318' : 'Ctrl'

interface ShortcutEntry {
  keys: string
  description: string
}

const SECTIONS: Array<{ title: string; shortcuts: ShortcutEntry[] }> = [
  {
    title: 'General',
    shortcuts: [
      { keys: `${MOD}+K`, description: 'Open search' },
      { keys: `${MOD}+N`, description: 'New conversation' },
      { keys: `${MOD}+,`, description: 'Open settings' },
      { keys: `${MOD}+D`, description: 'Toggle dark mode' },
      { keys: '?', description: 'Show this help' },
      { keys: '/', description: 'Focus chat input' },
      { keys: 'Esc', description: 'Close dialog / modal' },
    ],
  },
  {
    title: 'Chat',
    shortcuts: [
      { keys: 'Enter', description: 'Send message' },
      { keys: 'Shift+Enter', description: 'New line' },
      { keys: `${MOD}+Shift+S`, description: 'Stop streaming' },
      { keys: `Ctrl+Enter`, description: 'Submit edit' },
    ],
  },
  {
    title: 'Graph Navigation',
    shortcuts: [
      { keys: '\u2191', description: 'Go to parent node' },
      { keys: '\u2193', description: 'Go to first child' },
      { keys: '\u2190', description: 'Previous sibling' },
      { keys: '\u2192', description: 'Next sibling' },
      { keys: 'Home', description: 'Go to root node' },
      { keys: 'End', description: 'Go to deepest leaf' },
      { keys: `${MOD}+Shift+F`, description: 'Fit graph to view' },
      { keys: `${MOD}+0`, description: 'Reset zoom' },
    ],
  },
]

export function ShortcutsDialog() {
  const setOpen = useUIStore((s) => s.setShortcutsHelpOpen)

  return (
    <Modal open onClose={() => setOpen(false)} className="max-w-lg p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-fg-primary">
          Keyboard Shortcuts
        </h2>
        <IconButton onClick={() => setOpen(false)} aria-label="Close">
          <X size={18} />
        </IconButton>
      </div>
      <div className="max-h-[60vh] space-y-5 overflow-y-auto">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-muted">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.shortcuts.map((s) => (
                <div
                  key={s.keys}
                  className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-elevated"
                >
                  <span className="text-sm text-fg-secondary">
                    {s.description}
                  </span>
                  <Kbd>{s.keys}</Kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
