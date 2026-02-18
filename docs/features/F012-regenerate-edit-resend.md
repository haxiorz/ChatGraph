# F012 — Regenerate & Edit+Resend

## Priority: P0 (Expected in every AI chat)

## Status: PLANNED

## Summary

Two essential conversation actions: (1) **Regenerate** — re-run a completion to get a different assistant response (creates a sibling branch), and (2) **Edit+Resend** — edit a previous user message and resend it (creates a new branch from the parent). Both leverage ChatGraph's branching model naturally.

## Acceptance Criteria

### Regenerate
- [ ] "Regenerate" button visible on every assistant message (icon: refresh/↻)
- [ ] Clicking regenerate creates a new assistant node as a sibling (same parent as the original)
- [ ] Uses the currently selected model (may differ from the original)
- [ ] The new response streams in, replacing the current view
- [ ] The original response is preserved as a branch (visible in graph)
- [ ] Branch navigator shows "1/2", "2/3" etc. to cycle between regenerations

### Edit+Resend
- [ ] "Edit" button visible on every user message (icon: pencil/✏️)
- [ ] Clicking edit turns the message into an editable textarea (inline editing)
- [ ] "Save & Submit" sends the edited message as a new branch from the same parent
- [ ] "Cancel" reverts to the original text
- [ ] The original user message and its subtree are preserved
- [ ] The edited message triggers a completion with the currently selected model

## UI Design

### Regenerate Button

Appears on hover over an assistant message:

```
┌──────────────────────────────────────┐
│  gpt-4o                              │
│  Recursion is when a function calls  │
│  itself...                           │
│                          [↻] [📋]    │  ← Regenerate, Copy
└──────────────────────────────────────┘
```

When multiple regenerations exist, show a branch navigator:

```
┌──────────────────────────────────────┐
│  gpt-4o                    ← 1/3 →  │  ← cycle through siblings
│  Recursion is when a function calls  │
│  itself...                           │
│                          [↻] [📋]    │
└──────────────────────────────────────┘
```

The `← 1/3 →` arrows cycle through sibling assistant nodes under the same parent.

### Edit+Resend Button

Appears on hover over a user message:

```
         ┌──────────────────────────────┐
         │ Explain recursion     [✏️]   │
         └──────────────────────────────┘
```

After clicking Edit:

```
         ┌──────────────────────────────┐
         │ Explain recursion in Python  │  ← editable textarea
         │                              │
         │ [Cancel]    [Save & Submit]  │
         └──────────────────────────────┘
```

## How It Works

### Regenerate Flow

1. User clicks ↻ on an assistant message (node A, whose parent is user node U)
2. Frontend calls `POST /conversations/:id/complete` with:
   - `parentNodeId`: U.parentId (the user node's parent — the node above the user message)
   - `content`: U.content (same user message text)
   - `model`: currently selected model
3. Server creates a new user node U2 as sibling of U
4. Server streams a new assistant response A2 as child of U2
5. Frontend switches active path to the new branch
6. Graph shows the fork: two children from the same parent

> **Alternative approach**: For pure regeneration (same user text, just new assistant response), we could create only a new assistant node as sibling of A. This avoids duplicating the user node. The API would need a dedicated endpoint:
> `POST /conversations/:id/regenerate` with `{ nodeId: A.id, model }`
> This creates a new assistant node under the same parent user node.

### Edit+Resend Flow

1. User clicks ✏️ on a user message (node U, whose parent is node P)
2. Textarea appears with U's content, user edits it
3. User clicks "Save & Submit"
4. Frontend calls `POST /conversations/:id/complete` with:
   - `parentNodeId`: P (the parent of the original user message)
   - `content`: edited text
   - `model`: currently selected model
5. Server creates new user node U2 as child of P (sibling of U)
6. Server streams assistant response as child of U2
7. Frontend switches to the new branch

## API Changes

### New Endpoint: `POST /api/v1/conversations/:id/regenerate`

Regenerate without duplicating the user message.

**Request:**
```json
{
  "assistantNodeId": "uuid-of-assistant-node-to-regenerate",
  "model": "openai/gpt-4o"
}
```

**Behavior:**
1. Find the assistant node and its parent (user node)
2. Build path from root → user node
3. Call OpenRouter with the path
4. Create a new assistant node as sibling of the original (same parent)
5. Stream response via SSE

**Response:** SSE stream (same protocol as `/complete`)

## Branch Navigator Component

The `BranchNavigator` shows sibling count and allows cycling:

```typescript
interface BranchNavigatorProps {
  nodeId: string
  siblings: string[]    // IDs of sibling nodes (same parent, same role)
  currentIndex: number
  onNavigate: (nodeId: string) => void
}
```

This component appears in the chat panel whenever a node has siblings of the same role under the same parent.

## Keyboard Shortcuts

- `Ctrl+Shift+R` — Regenerate the last assistant response
- `Ctrl+E` on a focused message — Enter edit mode
- `Escape` — Cancel edit mode
- `Ctrl+Enter` — Submit edited message

## Edge Cases

- **Regenerate during streaming**: Disabled while a stream is in progress
- **Edit system prompt**: The system prompt can also be edited using the same mechanism, creating a whole new branch of the conversation
- **Multiple rapid regenerations**: Each creates a new sibling; branch navigator updates
- **Regenerate with different model**: The model badge on the new response reflects the new model
- **Edit to empty string**: Disabled — the submit button is inactive when the textarea is empty
