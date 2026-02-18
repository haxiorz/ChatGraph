import type { HeatmapMetric } from '../../stores/uiStore'

const METRIC_LABELS: Record<HeatmapMetric, { low: string; high: string }> = {
  tokens: { low: 'Few tokens', high: 'Many tokens' },
  branches: { low: 'No branches', high: 'Many branches' },
  recency: { low: 'Oldest', high: 'Newest' },
}

interface HeatmapLegendProps {
  metric: HeatmapMetric
}

export function HeatmapLegend({ metric }: HeatmapLegendProps) {
  const labels = METRIC_LABELS[metric]

  return (
    <div className="absolute bottom-14 left-3 z-10 rounded-lg border border-border bg-surface/90 px-3 py-2 shadow-sm backdrop-blur-sm">
      <div className="mb-1 text-[10px] font-medium text-fg-secondary">
        Heatmap: {metric}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[9px] text-fg-muted">{labels.low}</span>
        <div
          className="h-2 w-24 rounded-full"
          style={{
            background: 'linear-gradient(to right, hsl(240, 70%, 50%), hsl(120, 70%, 50%), hsl(0, 70%, 50%))',
          }}
        />
        <span className="text-[9px] text-fg-muted">{labels.high}</span>
      </div>
    </div>
  )
}
