# F003 — Chat Interface

## Priority: P0 (Core UI)

## Status: DONE

## Summary

The left panel displays the active conversation path as a linear chat. Users type messages at the bottom and see responses stream in. The chat always shows the messages from root to the currently active node.

## Acceptance Criteria

- [x] Chat panel takes up the left portion of the screen (default 50%)
- [x] Displays messages from root to active node in chronological order
- [x] System messages shown in a distinct compact style
- [x] User messages styled differently from assistant messages
- [x] Message input at the bottom with a send button
- [x] Enter sends the message; Shift+Enter adds a newline
- [x] Sending a message creates a user node and triggers a completion
- [x] During streaming, the assistant response appears token by token
- [x] Chat auto-scrolls to the bottom when new content arrives
- [x] Empty state when no conversation is selected

## Implementation Notes

- `ChatPanel.tsx` — uses `useActivePath()` hook to derive message list from nodes Map + activeNodeId
- `MessageBubble.tsx` — system (gray compact), user (right-aligned blue), assistant (left-aligned gray with model badge)
- `MessageInput.tsx` — auto-resizing textarea, model selector inline, Stop/Send button
- `StreamingMessage.tsx` — renders accumulated content with a blinking cursor animation
- Messages are plain text with `whitespace-pre-wrap`. Markdown rendering (F011) not yet implemented.
- Empty assistant responses show "Empty response" in italic

## UI Components

### ChatPanel
Container component. Subscribes to `conversationStore.activeNodeId`, computes the path, and renders messages.

### MessageBubble
Renders a single message.
- **System**: Small gray banner at the top
- **User**: Right-aligned, blue background
- **Assistant**: Left-aligned, light background, shows model badge (e.g., "gpt-4o")

### MessageInput
- Textarea that grows with content (max 6 lines)
- Send button (disabled when empty or streaming)
- Shows the currently selected model name
- Keyboard: Enter = send, Shift+Enter = newline

### StreamingMessage
- Renders during active streaming
- Shows a blinking cursor at the end
- Content updates in real-time

## Behavior

### Sending a Message
1. User types text and presses Enter / clicks Send
2. Input is disabled; streaming state begins
3. `POST /api/v1/conversations/:id/complete` is called with:
   - `parentNodeId`: current active node ID
   - `content`: user's message
   - `model`: currently selected model
4. User message node appears immediately in chat
5. Assistant message streams in below it
6. On completion, both nodes are persisted and graph updates

### Active Path Display
When the user clicks a node in the graph, the chat re-renders to show the path from root to that node. This may be a completely different branch than what was previously shown.

## Wireframe

```
┌──────────────────────────────────┐
│  ┌────────────────────────────┐  │
│  │ 🔧 You are a helpful...   │  │  ← system message (collapsed by default)
│  └────────────────────────────┘  │
│                                  │
│         ┌─────────────────────┐  │
│         │ Explain recursion   │  │  ← user message (right-aligned)
│         └─────────────────────┘  │
│  ┌─────────────────────┐        │
│  │ gpt-4o              │        │  ← model badge
│  │ Recursion is when   │        │  ← assistant message (left-aligned)
│  │ a function calls    │        │
│  │ itself...           │        │
│  └─────────────────────┘        │
│                                  │
│  ┌────────────────────────────┐  │
│  │ Type a message...   [Send] │  │  ← input area
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

## Markdown Rendering

All assistant messages are rendered as Markdown. See **F011** for full details. Key requirements:
- Code blocks with syntax highlighting and "Copy code" button
- Inline code, bold, italic, strikethrough
- Tables, ordered/unordered lists
- LaTeX math (inline `$...$` and block `$$...$$`)
- Links (open in new tab)

User messages are rendered as plain text with basic newline handling.

## Edge Cases

- **Very long messages**: Render full content with a "collapse" toggle for messages > 500 chars
- **Empty assistant response**: Show "Empty response" in italic
- **Streaming interrupted**: Show partial content with an error indicator
- **Rapid node switching**: Cancel any in-flight stream when user switches active node
