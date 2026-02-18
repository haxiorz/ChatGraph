import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { scaleIn, EASE_OUT_FAST } from '../../utils/animations'

export function ModelSelector() {
  const selectedModel = useUIStore((s) => s.selectedModel)
  const setSelectedModel = useUIStore((s) => s.setSelectedModel)
  const models = useSettingsStore((s) => s.models)
  const loadModels = useSettingsStore((s) => s.loadModels)

  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (models.length === 0) {
      loadModels()
    }
  }, [models.length, loadModels])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open) {
      searchRef.current?.focus()
      setHighlightIndex(-1)
    }
  }, [open])

  const filtered = models.filter(
    (m) =>
      m.id.toLowerCase().includes(search.toLowerCase()) ||
      m.name.toLowerCase().includes(search.toLowerCase()),
  )

  const handleSelect = useCallback(
    (modelId: string) => {
      setSelectedModel(modelId)
      setOpen(false)
      setSearch('')
    },
    [setSelectedModel],
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered[highlightIndex]) {
      e.preventDefault()
      handleSelect(filtered[highlightIndex].id)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightIndex] as HTMLElement | undefined
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightIndex])

  const displayName = selectedModel.split('/').pop() ?? selectedModel

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 rounded-lg border border-border bg-elevated px-3 py-1.5 text-xs text-fg-secondary hover:bg-subtle transition-colors"
      >
        <span className="max-w-[200px] truncate">{displayName}</span>
        <ChevronDown
          size={12}
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute bottom-full left-0 z-50 mb-1 w-80 rounded-lg border border-border bg-surface shadow-md"
            variants={scaleIn}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={EASE_OUT_FAST}
          >
            <div className="p-2">
              <input
                ref={searchRef}
                type="text"
                placeholder="Search models..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setHighlightIndex(-1)
                }}
                onKeyDown={handleKeyDown}
                className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-fg-primary placeholder:text-fg-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <div ref={listRef} className="max-h-64 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-3 py-2 text-sm text-fg-muted">
                  {models.length === 0
                    ? 'Add an API key to load models'
                    : 'No models found'}
                </div>
              ) : (
                filtered.map((model, idx) => (
                  <button
                    key={model.id}
                    onClick={() => handleSelect(model.id)}
                    className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                      idx === highlightIndex
                        ? 'bg-accent-muted text-accent'
                        : model.id === selectedModel
                          ? 'bg-accent-muted text-accent'
                          : 'text-fg-secondary hover:bg-elevated'
                    }`}
                  >
                    <div className="font-medium">{model.name || model.id}</div>
                    {model.pricing && (
                      <div className="text-xs text-fg-muted">
                        ${model.pricing.prompt}/tok in | $
                        {model.pricing.completion}/tok out
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
