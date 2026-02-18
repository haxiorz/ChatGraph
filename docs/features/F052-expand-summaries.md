# F052 — Expand Summary Nodes

## Overview

When a summary node is created (via F030 Smart Summarization), users can now expand it to view the original messages that were summarized. This provides transparency into what the AI condensed and lets users verify nothing important was lost.

## How It Works

### Backend

- `completionService.streamSummarization()` now stores `summarizedNodeIds` (array of node IDs from the path that was summarized) in the summary node's metadata, alongside the existing `isSummary` and `summarizedMessageCount` fields.

### Frontend

- `MessageBubble` (`AssistantBubble`) reads `meta.summarizedNodeIds` from summary nodes.
- If `summarizedNodeIds` is present and non-empty, a "Show original N messages" button is rendered below the summary content.
- Clicking the button toggles a collapsible section that displays each original message (truncated to 300 chars), sourced from the conversation store's node map.
- The expand UI uses cyan-themed styling consistent with the summary badge.

## Files Modified

| File | Change |
|------|--------|
| `packages/server/src/services/completionService.ts` | Store `summarizedNodeIds` in metadata (both normal and partial save) |
| `packages/client/src/components/chat/MessageBubble.tsx` | Add expand/collapse UI to AssistantBubble for summary nodes |

## UI

- **Button**: "Show original N messages" / "Hide original N messages" with Expand icon
- **Collapsed list**: Each message shown as `Role: content (truncated)` in a bordered container
- **Styling**: Cyan-themed borders and backgrounds matching summary badge

## Notes

- Existing summary nodes (created before this feature) won't have `summarizedNodeIds` in their metadata, so the expand button simply won't appear for them.
- The original messages are read from the client-side node store, so they must still exist in the conversation.
