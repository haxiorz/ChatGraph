# F043 — Historical Spending Charts

## Overview

Adds a CSS bar chart to the Usage Dashboard showing daily spending over the last 7 or 30 days, giving users a visual history of their API costs.

## Backend

### `GET /api/v1/usage/daily?days=7|30`

- `days` query param (clamped 1–90, default 7)
- Groups assistant node usage by `DATE(createdAt)` and model
- Applies model pricing from OpenRouter to compute daily cost
- Fills missing dates with zeros so chart has no gaps
- Returns `DailySpendingPoint[]`

### `DailySpendingPoint`

```ts
interface DailySpendingPoint {
  date: string          // YYYY-MM-DD
  cost: number          // total cost for the day
  promptTokens: number
  completionTokens: number
}
```

## Frontend

### Spending Chart

- Appears in UsageDashboard when period is "7 days" or "30 days"
- CSS flexbox bar chart (no external charting library)
- Bar height proportional to max daily cost
- Bars colored red when exceeding daily budget (if set)
- Hover tooltip shows date, cost, and token count
- Dashed budget line indicator below chart

### Integration

- `api.getDailySpending(days)` fetches data
- Fetched in a separate `useEffect` based on period selection
- Data also included in CSV export (see F044)

## Files Modified

| File | Change |
|------|--------|
| `packages/server/src/services/usageService.ts` | `getDailySpending()` function |
| `packages/server/src/routes/usage.ts` | `GET /usage/daily` route |
| `packages/client/src/types/index.ts` | `DailySpendingPoint` type |
| `packages/client/src/services/api.ts` | `getDailySpending()` API call |
| `packages/client/src/components/shared/UsageDashboard.tsx` | `SpendingChart` component |
