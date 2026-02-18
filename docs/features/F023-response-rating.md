# F023 — Response Quality Tracking

## Status: Implemented (basic)

## Summary

Thumbs up/down rating buttons on assistant messages. Ratings are stored in `node.metadata.rating` and persist across sessions.

## How It Works

1. **Server** (`nodeService.ts`): New `updateNode(id, { content?, metadata? })` function that merges metadata (preserves existing fields like `usage` when adding `rating`).
2. **Server** (`nodes.ts`): `UpdateNodeSchema` now accepts optional `content` and/or `metadata` with a refinement requiring at least one.
3. **Client** (`api.ts`): `updateNode` signature updated to accept `{ content?, metadata? }`.
4. **Client** (`conversationStore.ts`): New `updateNodeData` async action that calls the API and updates the local node map.
5. **Client** (`MessageBubble.tsx`): `AssistantBubble` renders ThumbsUp/ThumbsDown icons (from lucide-react) in the hover footer. Clicking toggles the rating. Active ratings show filled + colored icons (green for up, red for down).
6. **Client** (`ChatPanel.tsx`): `handleRate` callback calls `store.updateNodeData(nodeId, { metadata: { rating } })`.

## Data Format

```json
{
  "usage": { "prompt_tokens": 100, "completion_tokens": 50 },
  "rating": "up"  // or "down" or null
}
```

The metadata merge ensures `usage` is preserved when `rating` is added/changed.

## Files Modified

- `packages/server/src/routes/nodes.ts` — Extended `UpdateNodeSchema`
- `packages/server/src/services/nodeService.ts` — Added `updateNode` with metadata merging
- `packages/client/src/services/api.ts` — Updated `updateNode` signature
- `packages/client/src/stores/conversationStore.ts` — Added `updateNodeData` action
- `packages/client/src/components/chat/MessageBubble.tsx` — Added thumbs UI to `AssistantBubble`
- `packages/client/src/components/chat/ChatPanel.tsx` — Added `handleRate` callback

## Future Enhancements

- Quality scores per model over time
- "Best model for me" recommendations
- Quality vs. cost analytics
