# F036 — Saved Viewport Positions

## Summary

Automatically saves zoom level and pan position per conversation to localStorage. When re-opening a conversation, the graph restores the previous viewport instead of doing a fitView.

## Motivation

- Users who carefully position their graph view shouldn't lose it when switching conversations
- Large conversation trees benefit from remembering where the user was focused
- Reduces friction when working across multiple conversations

## Behavior

1. **Auto-save**: Every time the user pans or zooms, the viewport is debounce-saved (300ms) to localStorage
2. **Restore**: When opening a conversation, if a saved viewport exists, it's restored with a 300ms animation. Otherwise, falls back to fitView.
3. **Reset View**: The Reset View button (Ctrl+0) clears the saved viewport and resets to origin
4. **Fit View**: The Fit View button (Ctrl+Shift+F) saves the new fitted viewport after animation
5. **Delete cleanup**: Deleting a conversation also removes its saved viewport from localStorage

## Storage

- **Key**: `chatgraph-viewport-{conversationId}`
- **Value**: JSON-serialized `{ x: number, y: number, zoom: number }`

## Files Modified

- `packages/client/src/components/graph/GraphPanel.tsx` — saveViewport/loadViewport/clearSavedViewport helpers, onMoveEnd handler, viewport restore logic, updated Reset/Fit handlers
- `packages/client/src/components/chat/ConversationList.tsx` — clearSavedViewport on conversation delete
