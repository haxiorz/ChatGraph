# F033 - Token & Cost Dashboard

## Overview

Replace placeholder `cost: 0` values with real dollar amounts calculated from OpenRouter model pricing data.

## Changes

### Backend - `usageService.ts`

- Imports `modelService.listModels()` to get pricing data from OpenRouter
- Builds a `pricingMap: Map<modelId, { prompt, completion }>` from model pricing strings
- Calculates per-model cost: `promptTokens * pricing.prompt + completionTokens * pricing.completion`
- Updated `topConversations` query: groups by `(conversationId, model)` to compute per-conversation cost correctly across multiple models
- Returns real `totalCost`, per-model `cost`, and per-conversation `cost`

### Frontend - `UsageDashboard.tsx`

- Added 4th card in totals grid: "Total Cost" with orange styling
- Shows cost per model next to token count (orange text)
- Shows cost per conversation next to token count
- Uses `formatCost()` helper with adaptive precision ($0.0001 for tiny, $0.01 for larger)

### Frontend - `MessageBubble.tsx`

- `TokenInfo` component now accepts `model` prop
- Looks up pricing from `useSettingsStore.getState().models`
- Calculates and displays per-message cost inline (orange text)
- Uses same `formatCost()` adaptive precision helper

## Files

| File | Action |
|------|--------|
| `server/src/services/usageService.ts` | Modified - real cost calculation |
| `client/src/components/chat/MessageBubble.tsx` | Modified - cost in TokenInfo |
| `client/src/components/shared/UsageDashboard.tsx` | Modified - cost display |
