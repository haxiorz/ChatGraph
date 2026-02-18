# F009 — Conversation Management

## Priority: P1 (Essential but after core flow)

## Status: DONE (partial)

## Summary

Users can create, rename, delete, and switch between conversations. A sidebar or header provides conversation navigation.

## Acceptance Criteria

- [x] Create a new conversation (with default system prompt)
- [x] List existing conversations (sorted by last updated)
- [x] Switch between conversations
- [ ] Rename a conversation — API exists but no UI for inline rename yet
- [x] Delete a conversation (delete button visible on hover)
- [x] Auto-generate conversation title from first user message
- [ ] Conversation list shows preview (first user message, truncated) — not yet implemented

## Implementation Notes

- `ConversationList.tsx` — home screen at `/` showing all conversations with "New Conversation" button
- Creating a conversation automatically creates a system node with "You are a helpful assistant."
- No confirmation dialog for deletion yet — deletes immediately on click
- Auto-titling done server-side in `completionService.ts` (truncates first user message to 60 chars)
- Navigation via React Router: `/` for list, `/c/:id` for conversation view
- `localStorage` persistence for last conversation not yet implemented

## UI

### Conversation List

Located in a collapsible sidebar or header dropdown:

```
┌────────────────────────┐
│  + New Conversation    │
│────────────────────────│
│  ● Quantum Computing   │  ← active (highlighted)
│    "Explain quantum..."│
│    2 min ago           │
│────────────────────────│
│  ○ Python Help         │
│    "How do I parse..." │
│    1 hour ago          │
│────────────────────────│
│  ○ Recipe Ideas        │
│    "Give me a recipe..." │
│    Yesterday           │
└────────────────────────┘
```

### New Conversation Dialog

```
┌─────────────────────────────────┐
│  New Conversation               │
│                                 │
│  System Prompt (optional):      │
│  ┌───────────────────────────┐  │
│  │ You are a helpful...      │  │
│  └───────────────────────────┘  │
│                                 │
│  [Cancel]  [Create]             │
└─────────────────────────────────┘
```

## Auto-Title Generation

When a conversation's first user message is sent:
1. Take the first 50 characters of the user message
2. Set it as the conversation title
3. Optionally: Use the AI to generate a short title (via a cheap model call)

## API Endpoints

All defined in F002. Key behaviors:
- `DELETE /conversations/:id` cascades to all nodes (Prisma `onDelete: Cascade`)
- `GET /conversations` returns conversations with node count and preview

## Technical Notes

- Active conversation ID stored in URL: `/conversation/:id` (React Router)
- Also persisted in `localStorage` so the app reopens to the last conversation
- Creating a conversation automatically creates a system node if a system prompt is provided
