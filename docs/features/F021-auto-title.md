# F021 — Auto-Title with AI

## Status: Implemented

## Summary

Replaces the previous "first 60 characters" truncation approach with an AI-generated conversation title. On the first user-assistant exchange, a non-streaming call to `openai/gpt-4o-mini` generates a concise 3-7 word title.

## How It Works

1. **Server** (`completionService.ts`): After the first assistant response is saved, `generateTitle()` makes a non-streaming OpenRouter call to `gpt-4o-mini` with both the user message and assistant reply.
2. A 5-second `Promise.race` timeout ensures the title generation never blocks the completion response.
3. The generated title is saved to the database and sent as an `event: title` SSE event before `event: done`.
4. If the title call fails or times out, the original truncation fallback is used.
5. **Client** (`stream.ts`): The `onTitle` callback in `StreamCallbacks` handles the new event type.
6. **Client** (`useCompletion.ts`): Passes `onTitle` to `consumeStream`, which calls `updateConversationTitle` on the store.
7. **Client** (`conversationStore.ts`): `updateConversationTitle(id, title)` updates the sidebar conversation list in-place.

## Files Modified

- `packages/server/src/services/completionService.ts` — Added `generateTitle()` helper, replaced truncation block
- `packages/client/src/services/stream.ts` — Added `onTitle` to `StreamCallbacks`, `case 'title'` in switch
- `packages/client/src/hooks/useCompletion.ts` — Added `onTitle` callback in `sendMessage`
- `packages/client/src/stores/conversationStore.ts` — Added `updateConversationTitle` action

## Future Enhancements

- Re-title when conversation direction changes significantly
- Offer multiple title suggestions for user to pick
- Configurable emoji prefix based on topic
