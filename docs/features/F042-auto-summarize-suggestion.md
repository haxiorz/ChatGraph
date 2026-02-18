# F042: Auto-Summarize Suggestion

## Overview

Proactively suggests summarization when the context window exceeds 80% usage. Uses an actionable toast with a "Summarize" button that triggers the existing smart summarization feature (F030).

## Behavior

1. After each AI completion, the system checks the prompt token count from the response metadata against the model's context length
2. If usage exceeds 80%, an actionable toast is shown: "Context X% full — consider summarizing"
3. The toast has a "Summarize" button that triggers summarization of the current node
4. The suggestion is dismissed per-conversation per-session (won't show again until page reload)
5. Clicking "Summarize" dispatches a `chatgraph:summarize` custom event, caught by ChatPanel

## Implementation

### Toast Action System (`toastStore.ts`, `Toast.tsx`)

Extended the toast system with action button support:

- `Toast` interface now has optional `action: { label: string; onClick: () => void }`
- `toast.withAction(message, action, type, duration)` imperative helper
- Toast component renders action button between message and dismiss button

### Context Check (`useCompletion.ts`)

`checkContextAndSuggestSummarize(node)` — called from `onCompletionDone`:

- Reads `node.metadata.usage.prompt_tokens` from the response
- Looks up model's `context_length` from the settings store's model list
- If ratio > 0.8 and conversation not dismissed, shows actionable toast
- Marks conversation as dismissed in UI store

### Dismissed Tracking (`uiStore.ts`)

- `summarizeDismissed: Set<string>` — ephemeral per-session tracking
- `dismissSummarize(conversationId)` — adds to the set
- Resets on page reload (not persisted)

### Event Wiring (`ChatPanel.tsx`)

- `useEffect` listens for `chatgraph:summarize` custom event on `window`
- Calls `summarize(nodeId)` from the existing `useCompletion` hook (F030)

### Applies To

- `sendMessage` onDone
- `regenerate` onDone

## Files Modified

| File | Changes |
|------|---------|
| `packages/client/src/stores/toastStore.ts` | Added `ToastAction` interface, `withAction` helper |
| `packages/client/src/components/ui/Toast.tsx` | Render action button |
| `packages/client/src/stores/uiStore.ts` | Added `summarizeDismissed` + `dismissSummarize` |
| `packages/client/src/hooks/useCompletion.ts` | Added `checkContextAndSuggestSummarize` helper |
| `packages/client/src/components/chat/ChatPanel.tsx` | Added `chatgraph:summarize` event listener |

## Dependencies

- Smart Summarization (F030) — reuses the existing `summarize()` function
- Context Window Visualizer (F022) — uses same token/context data
- Toast System (F025) — extended with action buttons
- Model list from settings store
