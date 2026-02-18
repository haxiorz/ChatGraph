# F048 — Tournament Comparison Table

## Overview
After a tournament completes, shows a metrics comparison table below the tournament columns grid. Compares models on speed, cost, tokens, and throughput with sortable columns and best-in-class highlighting.

## Implementation

### New Files
- `packages/client/src/components/chat/TournamentComparison.tsx` — Comparison table component

### Modified Files
- `packages/client/src/components/chat/TournamentPanel.tsx` — Renders `<TournamentComparison />` when all models are done; uses shared `formatDuration` from `utils/cost.ts`

### Metrics Displayed
| Column | Description | Best Highlight |
|--------|-------------|----------------|
| TTFT | Time to first token | Lowest (green) |
| Total | Total response duration | — |
| Tokens | Completion token count | — |
| Cost | Estimated dollar cost | Lowest (green) |
| tok/s | Tokens per second throughput | Highest (green) |

### Features
- **Sortable columns**: Click any column header to sort; click again to toggle direction
- **Best-in-column highlighting**: Green text + semibold for best values
- **Error handling**: Error models shown with "Error" text, pushed to bottom of sort order
- **Quick insight line**: Summary of fastest TTFT, cheapest, and best throughput models
- **Model name shortening**: Strips provider prefix (e.g., `openai/gpt-4o` → `gpt-4o`)

### Data Sources
- Token counts from node metadata `usage.completion_tokens` (falls back to character estimate)
- Cost computed from `settingsStore.models` pricing data
- Timing from `tournamentStore` model timing data
