import { Zap, Brain, Flame } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import type { ThinkingLevel } from '../../types/index'

const LEVELS: Array<{ value: ThinkingLevel; label: string; Icon: typeof Zap }> = [
  { value: 'fast', label: 'Fast', Icon: Zap },
  { value: 'thinking', label: 'Think', Icon: Brain },
  { value: 'deep', label: 'Deep', Icon: Flame },
]

export function ThinkingLevelToggle() {
  const thinkingLevel = useUIStore((s) => s.thinkingLevel)
  const setThinkingLevel = useUIStore((s) => s.setThinkingLevel)

  return (
    <div className="flex items-center rounded-lg border border-[var(--glass-border)] overflow-hidden">
      {LEVELS.map(({ value, label, Icon }) => {
        const active = thinkingLevel === value
        return (
          <button
            key={value}
            onClick={() => setThinkingLevel(value)}
            className={`flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium transition-colors ${
              active
                ? value === 'deep'
                  ? 'bg-orange-500/20 text-orange-500'
                  : value === 'thinking'
                    ? 'bg-purple-500/20 text-purple-500'
                    : 'bg-accent/20 text-accent'
                : 'text-fg-muted hover:bg-[var(--glass-bg-elevated)] hover:text-fg-primary'
            }`}
            title={`${label} mode`}
          >
            <Icon size={12} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
