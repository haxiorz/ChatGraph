import { useState, useRef, useEffect } from 'react'
import { Filter } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'

const LABEL_COLORS = [
  { name: 'red', bg: 'bg-red-500', ring: 'ring-red-500' },
  { name: 'orange', bg: 'bg-orange-500', ring: 'ring-orange-500' },
  { name: 'yellow', bg: 'bg-yellow-500', ring: 'ring-yellow-500' },
  { name: 'green', bg: 'bg-green-500', ring: 'ring-green-500' },
  { name: 'blue', bg: 'bg-blue-500', ring: 'ring-blue-500' },
  { name: 'purple', bg: 'bg-purple-500', ring: 'ring-purple-500' },
]

export function LabelFilter() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const labelFilter = useUIStore((s) => s.labelFilter)
  const toggleLabelFilter = useUIStore((s) => s.toggleLabelFilter)
  const setShowUnlabeled = useUIStore((s) => s.setShowUnlabeled)
  const clearLabelFilters = useUIStore((s) => s.clearLabelFilters)

  const isFiltering = labelFilter.activeFilters.size > 0 || !labelFilter.showUnlabeled

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
          isFiltering
            ? 'bg-accent/20 text-accent'
            : 'text-fg-muted hover:bg-elevated hover:text-fg-primary'
        }`}
        title="Filter by label"
      >
        <Filter size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-border bg-surface p-2 shadow-md">
          <div className="mb-1.5 text-[11px] font-medium text-fg-muted">
            Filter by label
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {LABEL_COLORS.map((c) => (
              <button
                key={c.name}
                onClick={() => toggleLabelFilter(c.name)}
                className={`h-6 w-6 rounded-full ${c.bg} transition-all ${
                  labelFilter.activeFilters.has(c.name)
                    ? `ring-2 ${c.ring} ring-offset-2 ring-offset-surface scale-110`
                    : 'opacity-50 hover:opacity-80'
                }`}
                title={c.name}
              />
            ))}
          </div>
          <label className="flex items-center gap-2 py-1 text-xs text-fg-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={labelFilter.showUnlabeled}
              onChange={(e) => setShowUnlabeled(e.target.checked)}
              className="rounded accent-accent"
            />
            Show unlabeled nodes
          </label>
          {isFiltering && (
            <button
              onClick={() => {
                clearLabelFilters()
                setOpen(false)
              }}
              className="mt-1.5 w-full rounded-md bg-elevated px-2 py-1 text-xs text-fg-secondary hover:text-fg-primary transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}
