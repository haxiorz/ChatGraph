# F041: Budget Alerts

## Overview

Daily spending budget with toast warnings when approaching or exceeding the limit. Helps users stay within their OpenRouter spending comfort zone.

## Behavior

1. User sets a daily budget (USD) in Settings > General
2. After each AI completion finishes, the system fetches today's usage from the API
3. If spending >= 80% of budget, an info toast is shown
4. If spending >= 100% of budget, a warning toast is shown
5. The Usage Dashboard shows a color-coded progress bar when viewing "Today" period

## Settings

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `daily_budget` | `number \| null` | `null` | Daily spending limit in USD. Null = no limit |

Stored in the `Setting` database table via the existing settings API.

## Implementation

### Settings UI (`SettingsDialog.tsx`)

- Number input with step=0.01, placeholder "No limit"
- Helper text: "Get warned when daily spending approaches this amount"
- Saves as `null` when empty or zero (disables the feature)

### Budget Check (`useCompletion.ts`)

`checkBudget()` — called from `onCompletionDone`:

- Reads `settings.daily_budget` from settings store
- Fetches `api.getUsage('day')` for today's spending
- Compares `totalCost / budget` ratio:
  - >= 1.0: warning toast with exact amounts
  - >= 0.8: info toast with exact amounts
  - < 0.8: no toast
- Silently catches fetch errors

### Budget Progress Bar (`UsageDashboard.tsx`)

- Only visible when `period === 'day'` and `daily_budget` is set
- Shows cost / budget with percentage
- Color-coded: green (<80%), yellow (80-99%), red (>=100%)

### Applies To

- `sendMessage` onDone
- `regenerate` onDone
- `sendTournament` onTournamentDone

## Files Modified

| File | Changes |
|------|---------|
| `packages/client/src/types/index.ts` | Added `daily_budget` to `Settings` |
| `packages/client/src/hooks/useCompletion.ts` | Added `checkBudget` helper |
| `packages/client/src/components/settings/SettingsDialog.tsx` | Added budget input UI |
| `packages/client/src/components/shared/UsageDashboard.tsx` | Added budget progress bar |

## Dependencies

- Usage API endpoint (`/api/v1/usage?period=day`) (F033)
- Existing settings persistence (F010)
- Existing toast system (F025)
