# F053 — Re-title Suggestions

## Overview

As conversations evolve, the original auto-generated title may no longer reflect the discussion. After every 10th assistant response, a toast notification suggests updating the title. Users can then choose from 3 AI-generated title suggestions.

## How It Works

### Backend

- New `suggestTitles(conversationId)` function in `completionService.ts` fetches the latest 20 nodes and sends them to `gpt-4o-mini` asking for 3 emoji-prefixed title suggestions as a JSON array.
- New route `POST /api/v1/conversations/:id/suggest-titles` exposes this as an API endpoint.

### Frontend

- `useCompletion.ts` tracks a `completionCounter`. Every 10th completion triggers a toast: "Conversation has evolved — update title?" with a "Suggest titles" action button.
- Clicking the action dispatches a `chatgraph:suggest-retitle` custom event.
- `Header.tsx` listens for this event, calls the suggest-titles API, and shows a dropdown with 3 title suggestions.
- Picking a title renames the conversation via the existing rename API. A "Dismiss" button closes the dropdown.

## Files Modified

| File | Change |
|------|--------|
| `packages/server/src/services/completionService.ts` | New `suggestTitles()` function |
| `packages/server/src/routes/conversations.ts` | New `POST /:id/suggest-titles` route |
| `packages/client/src/services/api.ts` | New `suggestTitles()` API function |
| `packages/client/src/hooks/useCompletion.ts` | Counter-based retitle check in `onCompletionDone` |
| `packages/client/src/components/layout/Header.tsx` | Custom event listener + title suggestions dropdown |

## API

### `POST /api/v1/conversations/:id/suggest-titles`

**Response:**
```json
{
  "titles": [
    "🐍 Python Snake Game Tutorial",
    "📊 Sales Data Analysis",
    "🔧 Fix Login Authentication Bug"
  ]
}
```

## Notes

- The re-title toast only fires once per conversation (tracked in a `retitleDismissed` Set).
- Uses `gpt-4o-mini` for title generation (same as auto-title) with an 8-second timeout.
- Title suggestions are emoji-prefixed, matching the F049 emoji auto-title convention.
