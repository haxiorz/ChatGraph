# F022 — Context Window Visualizer

## Status: Implemented (basic)

## Summary

A compact token count progress bar displayed above the message input, showing how much of the selected model's context window is in use for the active path.

## How It Works

1. **`ContextBar` component** reads the active path via `useActivePath()`.
2. Finds the last assistant node's `metadata.usage.prompt_tokens + completion_tokens`.
3. Looks up the selected model's `context_length` from the settings store's model list.
4. Renders a color-coded progress bar:
   - **Green** (< 50% usage)
   - **Yellow** (50-80% usage)
   - **Red** (> 80% usage)
5. Shows `{used} / {total}` token counts as text.
6. Returns `null` when no usage data is available (e.g., no assistant messages yet).

## Files

- `packages/client/src/components/chat/ContextBar.tsx` — New component
- `packages/client/src/components/chat/ChatPanel.tsx` — Inserts `<ContextBar />` between scroll area and `<MessageInput />`

## Future Enhancements

- Per-node token contribution breakdown
- Color-coded segments (system prompt, early context, recent context)
- Context limit warnings with actionable suggestions
- Context pruning controls
