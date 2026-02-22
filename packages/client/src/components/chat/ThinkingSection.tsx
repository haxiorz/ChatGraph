import { useState } from 'react'
import { Brain, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react'
import type { ThinkingData, ThinkingStep } from '../../types/index'

interface ThinkingSectionProps {
  thinking: ThinkingData
}

export function ThinkingSection({ thinking }: ThinkingSectionProps) {
  const [expanded, setExpanded] = useState(false)
  const stepCount = thinking.steps.length

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-purple-500 hover:text-purple-400 transition-colors"
      >
        <Brain size={12} />
        <span className="font-medium">
          Thinking ({stepCount} step{stepCount !== 1 ? 's' : ''})
        </span>
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {expanded && (
        <div className="mt-1.5 border-l-2 border-purple-400/30 pl-3 space-y-1">
          {thinking.steps.length > 0 ? (
            <StepTree steps={thinking.steps} />
          ) : (
            <div className="text-xs italic text-fg-muted whitespace-pre-wrap max-h-60 overflow-y-auto">
              {thinking.content}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StepTree({ steps }: { steps: ThinkingStep[] }) {
  // Group by depth for rendering
  const topLevel = steps.filter((s) => s.parentStepId === null)

  return (
    <div className="space-y-0.5">
      {topLevel.map((step) => (
        <StepNode key={step.id} step={step} allSteps={steps} />
      ))}
    </div>
  )
}

function StepNode({ step, allSteps }: { step: ThinkingStep; allSteps: ThinkingStep[] }) {
  const [open, setOpen] = useState(step.content.length <= 200)
  const children = allSteps.filter((s) => s.parentStepId === step.id)
  const isLong = step.content.length > 200

  return (
    <div style={{ paddingLeft: step.depth * 12 }}>
      <div className="flex items-start gap-1">
        {(children.length > 0 || isLong) && (
          <button
            onClick={() => setOpen(!open)}
            className="mt-0.5 shrink-0 text-purple-400 hover:text-purple-300"
          >
            {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          </button>
        )}
        <div className={`text-xs text-fg-muted ${isLong && !open ? 'line-clamp-2' : ''}`}>
          {step.content}
        </div>
      </div>
      {open && children.length > 0 && (
        <div className="mt-0.5 space-y-0.5">
          {children.map((child) => (
            <StepNode key={child.id} step={child} allSteps={allSteps} />
          ))}
        </div>
      )}
    </div>
  )
}
