import { DollarSign } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { estimateTokens, formatCost } from '../../utils/cost'

export function CostTicker() {
  const streamState = useUIStore((s) => s.streamState)
  const selectedModel = useUIStore((s) => s.selectedModel)
  const models = useSettingsStore((s) => s.models)

  if (streamState.status !== 'streaming') return null

  const model = models.find((m) => m.id === selectedModel)
  if (!model?.pricing) return null

  const completionPrice = parseFloat(model.pricing.completion) || 0
  if (completionPrice === 0) return null

  const estimatedTokenCount = estimateTokens(streamState.content)
  const estimatedCost = estimatedTokenCount * completionPrice
  const costStr = formatCost(estimatedCost)

  if (!costStr) return null

  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-500/10 px-1.5 py-0.5 text-[10px] tabular-nums text-orange-500">
      <DollarSign size={9} />
      ~{costStr}
    </span>
  )
}
