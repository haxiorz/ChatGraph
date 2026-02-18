# F008 — Streaming Responses

## Priority: P0 (Core UX)

## Status: DONE

## Summary

Responses from OpenRouter stream token by token to the UI. The server proxies the OpenRouter SSE stream to the client via its own SSE connection, while accumulating the full response for database storage.

## Acceptance Criteria

- [x] Assistant responses appear token-by-token in the chat panel
- [x] Streaming indicator (blinking cursor or typing animation) shows during generation
- [x] User can cancel/abort an in-progress stream
- [x] On completion, the streamed content matches the saved database node
- [x] Graph updates after stream completes (new node appears)
- [ ] Token usage is displayed after completion — not yet implemented
- [x] No content is lost if the client briefly disconnects (server saves partial content)

## Implementation Notes

- `services/stream.ts` — SSE consumer using `fetch` + `ReadableStream`, parses `event:` and `data:` lines
- `useCompletion` hook — creates AbortController per request, cancels previous stream, manages stream state
- `StreamingMessage.tsx` — renders accumulated content with CSS `animate-pulse` blinking cursor
- Stop button in `MessageInput.tsx` calls `abort()` which triggers AbortController
- Graph waits for `done` event before adding the assistant node (no flickering during stream)
- `requestAnimationFrame` batching not yet implemented — direct Zustand state updates on each token

## Frontend Streaming

### Stream Consumer (`services/stream.ts`)

```typescript
export async function consumeStream(
  url: string,
  body: object,
  callbacks: {
    onUserNode: (node: Node) => void
    onToken: (content: string) => void
    onDone: (node: Node) => void
    onError: (message: string) => void
  },
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()

  // Parse SSE events from the byte stream
  // Call appropriate callback for each event type
}
```

### Abort Controller

Each completion request creates an `AbortController`. Cancellation happens when:
- User clicks a "Stop" button
- User navigates to a different node mid-stream
- User starts a new completion (previous one is cancelled)

```typescript
const abortController = useRef<AbortController | null>(null)

function startCompletion() {
  // Cancel any existing stream
  abortController.current?.abort()
  abortController.current = new AbortController()

  consumeStream(url, body, callbacks, abortController.current.signal)
}
```

## Backend Streaming

### SSE Protocol

The server sends these event types:

| Event      | Data                                       | When                      |
| ---------- | ------------------------------------------ | ------------------------- |
| `userNode` | Full user node JSON                        | After saving user node    |
| `token`    | `{ "content": "..." }`                     | Each token from OpenRouter|
| `done`     | `{ "node": {...} }`                        | Stream complete           |
| `error`    | `{ "message": "..." }`                     | On error                  |

### Client Disconnection Handling

If the client disconnects mid-stream:
1. Server detects `req.on('close', ...)` event
2. Server aborts the OpenRouter request
3. Server saves partial content as the assistant node (with `metadata.partial = true`)
4. On next client load, the partial node is visible with a "partial response" indicator

## UI States

### During Streaming
```
┌──────────────────────────────┐
│  User: Tell me about X       │
├──────────────────────────────┤
│  gpt-4o                      │
│  X is a fascinating topic    │
│  that involves█              │  ← blinking cursor
│                              │
│  [■ Stop generating]         │  ← stop button appears during streaming
└──────────────────────────────┘
```

### After Completion
```
┌──────────────────────────────┐
│  gpt-4o • 150 tokens         │
│  X is a fascinating topic    │
│  that involves many...       │
└──────────────────────────────┘
```

## Performance

- Use `requestAnimationFrame` to batch DOM updates during fast token delivery
- Don't re-render the entire chat on each token — only update the streaming message component
- The graph does NOT update during streaming (waits for `done` event to add the new node)
