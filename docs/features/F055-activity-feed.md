# F055 — Activity Feed

## Overview

A persistent event log panel that tracks all notable actions during a session: completions, errors, tournaments, summarizations, and regenerations. Accessible via a Clock icon in the header.

## How It Works

### Activity Store

- `activityStore.ts` — Zustand store with `events` array (capped at 100), `isOpen` toggle, `addEvent()`, `clearEvents()`.
- Imperative `activity.log(type, message, model?)` helper callable from anywhere without hooks.
- Event types: `completion`, `error`, `tournament`, `summarize`, `regenerate`, `title`, `info`.

### Activity Feed Panel

- `ActivityFeed.tsx` — Right-side drawer panel (following AnalyticsPanel pattern) with framer-motion animations.
- Each event shows: type-specific icon (color-coded), message, relative timestamp, and optional model badge.
- Header with event count badge, clear button, and close button.
- Empty state with prompt "No activity yet — Events will appear as you chat".

### Integration

- `useCompletion.ts` logs events at key moments:
  - `onCompletionDone` — logs completion with token count and model
  - Regenerate done — logs regeneration
  - Summarize done — logs summarization
  - Tournament done — logs tournament completion with model count
  - All error callbacks — logs errors with failure reason

### Header Button

- Clock icon button added before the theme toggle in `Header.tsx`.
- Toggles the activity panel open/closed.

## Files Created

| File | Purpose |
|------|---------|
| `packages/client/src/stores/activityStore.ts` | Zustand store for activity events |
| `packages/client/src/components/shared/ActivityFeed.tsx` | Right-side drawer panel |

## Files Modified

| File | Change |
|------|--------|
| `packages/client/src/components/layout/Header.tsx` | Clock icon button to toggle activity panel |
| `packages/client/src/components/layout/AppLayout.tsx` | Render ActivityFeed in AnimatePresence |
| `packages/client/src/hooks/useCompletion.ts` | Log events via `activity.log()` |

## Event Type Icons

| Type | Icon | Color |
|------|------|-------|
| completion | Zap | Green |
| error | AlertCircle | Red |
| tournament | Swords | Amber |
| summarize | ScrollText | Cyan |
| regenerate | RefreshCw | Blue |
| title | Type | Purple |
| info | Info | Muted |

## Notes

- Events are session-only (not persisted to database). They reset on page refresh.
- The 100-event cap prevents memory growth during long sessions.
- The activity panel uses the same drawer pattern as AnalyticsPanel for UI consistency.
