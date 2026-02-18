import { useState, useEffect, useRef } from 'react'
import { Search, Swords } from 'lucide-react'
import { useSettingsStore } from '../../stores/settingsStore'
import { useUIStore } from '../../stores/uiStore'
import { Button } from '../ui/Button'

interface TournamentModelPickerProps {
  onStart: (models: string[]) => void
  onClose: () => void
}

export function TournamentModelPicker({
  onStart,
  onClose,
}: TournamentModelPickerProps) {
  const models = useSettingsStore((s) => s.models)
  const loadModels = useSettingsStore((s) => s.loadModels)
  const selectedModel = useUIStore((s) => s.selectedModel)

  const [selected, setSelected] = useState<Set<string>>(
    new Set([selectedModel]),
  )
  const [search, setSearch] = useState('')
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (models.length === 0) loadModels()
  }, [models.length, loadModels])

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const filtered = models.filter(
    (m) =>
      m.id.toLowerCase().includes(search.toLowerCase()) ||
      m.name.toLowerCase().includes(search.toLowerCase()),
  )

  const toggleModel = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) {
      next.delete(id)
    } else if (next.size < 4) {
      next.add(id)
    }
    setSelected(next)
  }

  const handleStart = () => {
    if (selected.size < 2) return
    onStart([...selected])
  }

  return (
    <div
      ref={popoverRef}
      className="absolute bottom-full right-0 mb-2 w-80 rounded-xl border border-border bg-surface shadow-lg"
    >
      <div className="border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <Swords size={14} className="text-amber-500" />
          <span className="text-xs font-semibold text-fg-primary">
            Tournament Mode
          </span>
          <span className="ml-auto rounded bg-elevated px-1.5 py-0.5 text-[10px] text-fg-muted">
            {selected.size}/4 models
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="border-b border-border px-3 py-1.5">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-elevated px-2 py-1">
          <Search size={12} className="text-fg-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search models..."
            className="flex-1 bg-transparent text-xs text-fg-primary placeholder:text-fg-muted outline-none"
          />
        </div>
      </div>

      {/* Model list */}
      <div className="max-h-60 overflow-y-auto px-1 py-1">
        {filtered.length === 0 ? (
          <p className="px-2 py-3 text-center text-xs text-fg-muted">
            No models found
          </p>
        ) : (
          filtered.map((m) => {
            const isSelected = selected.has(m.id)
            const disabled = !isSelected && selected.size >= 4
            return (
              <button
                key={m.id}
                onClick={() => !disabled && toggleModel(m.id)}
                disabled={disabled}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
                  isSelected
                    ? 'bg-accent/10 text-accent'
                    : disabled
                      ? 'cursor-not-allowed opacity-40'
                      : 'text-fg-secondary hover:bg-elevated'
                }`}
              >
                <div
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                    isSelected
                      ? 'border-accent bg-accent text-accent-text'
                      : 'border-border'
                  }`}
                >
                  {isSelected && '\u2713'}
                </div>
                <span className="truncate text-xs">{m.id}</span>
              </button>
            )
          })
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-border px-3 py-2">
        <Button
          onClick={handleStart}
          disabled={selected.size < 2}
          className="w-full"
          size="sm"
        >
          <Swords size={12} className="mr-1.5" />
          Start Tournament ({selected.size} models)
        </Button>
      </div>
    </div>
  )
}
