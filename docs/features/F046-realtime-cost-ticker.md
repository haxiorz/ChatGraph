# F046 — Real-time Cost Ticker

## Overview
Shows an estimated cost accumulating in real-time as tokens stream in during a completion. The cost badge appears next to the streaming cursor and disappears when streaming ends (the final cost is already shown per-message via the existing TokenInfo component).

## Implementation

### New Files
- `packages/client/src/utils/cost.ts` — Shared utilities: `formatCost()`, `estimateTokens()`, `formatDuration()`
- `packages/client/src/components/chat/CostTicker.tsx` — Inline cost badge component

### Modified Files
- `packages/client/src/components/chat/StreamingMessage.tsx` — Renders `<CostTicker />` next to streaming cursor
- `packages/client/src/components/chat/MessageBubble.tsx` — Uses shared `formatCost` from `utils/cost.ts`

### How It Works
1. `CostTicker` reads `streamState.content` from `uiStore` and `selectedModel` from `uiStore`
2. Estimates completion tokens from `content.length / 4` (same heuristic as ContextBar)
3. Looks up model pricing from `settingsStore.models`
4. Computes `estimatedTokens * completionPrice` and formats as `~$0.0012`
5. Returns null when not streaming or when no pricing data is available

### UI
- Small rounded badge: orange background tint, `DollarSign` icon, prefixed with `~`
- Positioned inline after the streaming cursor
- Uses `tabular-nums` for stable digit width
