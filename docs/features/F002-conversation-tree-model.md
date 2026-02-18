# F002 — Conversation Tree Data Model

## Priority: P0 (Foundation for everything)

## Status: DONE

## Summary

Implement the database layer and service functions for the conversation tree structure. This is the core data model that everything else builds on.

## Acceptance Criteria

- [x] Create a conversation with a title
- [x] Create nodes with parent-child relationships
- [x] Fetch a full conversation with all its nodes in a single query
- [x] Build the message path from root to any given node
- [x] Delete a node and its entire subtree
- [x] Edit a node's content
- [x] Each node stores its `role`, `content`, `model` (nullable), and `metadata` (JSONB)
- [x] Root nodes (first message) have `parentId = null`

## Implementation Notes

- `conversationService.ts` — CRUD for conversations (list with pagination, getById with nodes, create, rename, delete)
- `nodeService.ts` — create, updateContent, deleteSubtree (BFS traversal + deleteMany), getByConversation
- `utils/tree.ts` — `buildPath()` walks parent chain from target to root, `pathToMessages()` maps to OpenRouter format
- List response is simplified (no `nodeCount`/`preview` computed fields yet — returns first node ID only)
- Subtree deletion uses application-level BFS to collect all descendant IDs, then `deleteMany`

## API Endpoints

### `POST /api/v1/conversations`
Create a new conversation.

**Request:**
```json
{ "title": "New Chat" }
```

**Response:** `201`
```json
{
  "id": "uuid",
  "title": "New Chat",
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:00:00Z"
}
```

### `GET /api/v1/conversations`
List conversations (newest first, paginated).

**Query params:** `?page=1&limit=20`

**Response:** `200`
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "New Chat",
      "createdAt": "...",
      "updatedAt": "...",
      "nodeCount": 5,
      "preview": "First user message truncated..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

> **Note:** `nodeCount` and `preview` are computed fields — derived via Prisma aggregation and a subquery on the first user-role node, not stored columns.

### `PATCH /api/v1/conversations/:id`
Rename a conversation.

**Request:**
```json
{ "title": "New name" }
```

**Response:** `200`
```json
{
  "id": "uuid",
  "title": "New name",
  "updatedAt": "..."
}
```

### `GET /api/v1/conversations/:id`
Get a conversation with all its nodes.

**Response:** `200`
```json
{
  "id": "uuid",
  "title": "New Chat",
  "createdAt": "...",
  "updatedAt": "...",
  "nodes": [
    {
      "id": "uuid",
      "parentId": null,
      "role": "system",
      "content": "You are a helpful assistant.",
      "model": null,
      "metadata": {},
      "createdAt": "..."
    },
    {
      "id": "uuid",
      "parentId": "parent-uuid",
      "role": "user",
      "content": "Hello",
      "model": null,
      "metadata": {},
      "createdAt": "..."
    }
  ]
}
```

### `PATCH /api/v1/nodes/:id`
Edit a node's content.

**Request:**
```json
{ "content": "Updated message" }
```

### `DELETE /api/v1/nodes/:id`
Delete a node and its entire subtree.

**Response:** `204`

## Service Functions

### `nodeService.buildPath(nodeId: string): Message[]`

The most critical function. Walks up the parent chain from the given node to the root, reverses the path, and returns an ordered array of messages ready to send to OpenRouter.

```typescript
// Given this tree:
//   A (system) → B (user) → C (assistant) → D (user)
//
// buildPath("D") returns:
// [
//   { role: "system", content: "..." },      // A
//   { role: "user", content: "..." },         // B
//   { role: "assistant", content: "..." },    // C
//   { role: "user", content: "..." },         // D
// ]
```

### `nodeService.deleteSubtree(nodeId: string)`

Deletes the node and all descendants. Uses a recursive CTE or application-level traversal.

## Technical Notes

- Use Prisma's `include` to fetch conversation with nodes in one query
- The `buildPath` function should work entirely in-memory after fetching all nodes for the conversation (avoid N+1 queries)
- Tree traversal utility lives in `utils/tree.ts` and is shared with the frontend (consider a shared types package later if needed)
- **Subtree deletion**: Use application-level BFS/DFS traversal to collect all descendant IDs, then delete in a single `deleteMany` call wrapped in a transaction. Prisma's self-referential relations don't support `onDelete: Cascade` on the parent relation, so this must be handled in code.
- **Standalone node creation** (`POST /conversations/:id/nodes`): Used for creating system prompt nodes on conversation creation or manually adding nodes. The `/complete` endpoint handles the standard user+assistant pair creation during chat flow.
- Add `@@index([conversationId, createdAt])` to the Node model for efficient ordered queries
