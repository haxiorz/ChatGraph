# F035 — Conversation Heatmap

## Summary

Toggle-able color overlay on graph nodes that visualizes metrics like token usage, branch activity, or recency. Uses a blue-to-red gradient (cold-to-hot) to highlight patterns in the conversation tree.

## Motivation

- Quickly identify token-heavy nodes that dominate context windows
- Spot branching hotspots where the conversation diverged most
- See which parts of the tree were worked on recently vs. abandoned

## UI Components

### Heatmap Toolbar Button
- **Location**: Graph toolbar (Flame icon), leftmost position
- **Active state**: Blue accent background when enabled
- **Metric selector**: Dropdown appears when enabled (Tokens / Branches / Recency)

### HeatmapLegend
- **Location**: Bottom-left of graph panel, above PinnedNodesPanel
- **Content**: Gradient bar (blue → green → red) with low/high labels per metric

## Metrics

| Metric | Raw Value | Low (Blue) | High (Red) |
|--------|-----------|------------|------------|
| Tokens | `metadata.usage.total_tokens` (or prompt + completion) | Few tokens | Many tokens |
| Branches | Child count per node | No branches | Many branches |
| Recency | `createdAt` timestamp | Oldest | Newest |

## Color Mapping

- HSL interpolation: `hsl(240 * (1 - intensity), 70%, 50%)`
  - intensity 0 → hue 240 (blue)
  - intensity 0.5 → hue 120 (green)
  - intensity 1 → hue 0 (red)
- Overlay opacity: 0.15 + intensity * 0.15 (subtle for cold, more visible for hot)
- Applied as a semi-transparent div over the node content

## Normalization

- Min-max normalization across all nodes: `(value - min) / (max - min)`
- If all values are equal, all nodes get intensity 0

## State (uiStore)

```typescript
type HeatmapMetric = 'tokens' | 'branches' | 'recency'

interface HeatmapState {
  enabled: boolean
  metric: HeatmapMetric
}
```

## Files Modified

- `packages/client/src/stores/uiStore.ts` — HeatmapState + toggleHeatmap, setHeatmapMetric
- `packages/client/src/components/graph/GraphPanel.tsx` — toolbar button, heatmapValues memo, pass intensity to nodes
- `packages/client/src/components/graph/ConversationNode.tsx` — heatmapIntensity prop, overlay div
- `packages/client/src/components/graph/HeatmapLegend.tsx` — new component
