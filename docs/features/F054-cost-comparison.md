# F054 — Cost Comparison

## Overview

A new section in the Usage Dashboard shows estimated costs if the same token volume had been processed by different models. This helps users identify potential savings by switching models.

## How It Works

### Frontend Only

- New `CostComparison` component added at the bottom of `UsageDashboard`.
- Uses `stats.totalPromptTokens` and `stats.totalCompletionTokens` from the usage API.
- Reads model pricing data from `settingsStore.models` (populated from OpenRouter).
- For each priced model: `estimatedCost = promptTokens * pricing.prompt + completionTokens * pricing.completion`.
- Results sorted by estimated cost (cheapest first), showing top 15 models.
- Displays: model name, estimated cost, and percentage difference vs actual spending.

## Files Modified

| File | Change |
|------|--------|
| `packages/client/src/components/shared/UsageDashboard.tsx` | New `CostComparison` component rendered after Top Conversations |

## UI

- **Section header**: "Cost Comparison"
- **Description**: "Estimated cost if all N tokens were processed by each model"
- **Table rows**: Model name | Estimated cost | +/-% vs actual
- **Cheapest badge**: Green "Cheapest" badge on the lowest-cost model
- **Color coding**: Green for savings, red for more expensive than actual
- **Hidden when**: No tokens recorded or no models with pricing data available

## Notes

- This is a frontend-only feature — no new API endpoints needed.
- The comparison uses aggregate token totals, so it's an estimate (different models may tokenize text differently).
- Requires models to be loaded in settingsStore (which happens when the API key is configured).
