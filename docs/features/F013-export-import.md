# F013 — Export & Import

## Priority: P1 (Users need to extract value from conversations)

## Status: PLANNED

## Summary

Export conversations in multiple formats (Markdown, JSON, PNG) and import conversations from external sources (ChatGPT JSON exports). Export can target the full tree or just the active path.

## Acceptance Criteria

### Export
- [ ] Export button accessible from conversation header or context menu
- [ ] Export active path as Markdown (linear chat format)
- [ ] Export full tree as JSON (preserves all branches and metadata)
- [ ] Export graph as PNG image (screenshot of the React Flow canvas)
- [ ] Exported Markdown preserves code blocks, math, and formatting
- [ ] Each message in Markdown export includes role and model label
- [ ] JSON export includes all node data, relationships, and metadata

### Import
- [ ] Import button in conversation list / sidebar
- [ ] Import ChatGPT JSON export format (creates a new conversation)
- [ ] Import ChatGraph JSON format (restore a previously exported conversation)
- [ ] Validation and error handling for malformed imports
- [ ] Progress indicator for large imports

## Export Formats

### Markdown (Active Path)

Exports the current root→active node path as a readable Markdown document:

```markdown
# Quantum Computing Discussion

**System:** You are a helpful physics tutor.

---

**User:**
Explain quantum computing in simple terms.

---

**Assistant** *(gpt-4o · 245 tokens)*:
Quantum computing uses quantum mechanical phenomena like superposition
and entanglement to process information...

---

**User:**
How is it different from classical computing?

---

**Assistant** *(claude-sonnet-4-5-20250929 · 312 tokens)*:
Classical computers use bits that are either 0 or 1...
```

### JSON (Full Tree)

Exports the entire conversation tree with all metadata:

```json
{
  "format": "chatgraph-v1",
  "exportedAt": "2026-02-17T12:00:00Z",
  "conversation": {
    "id": "uuid",
    "title": "Quantum Computing Discussion",
    "createdAt": "...",
    "updatedAt": "..."
  },
  "nodes": [
    {
      "id": "uuid",
      "parentId": null,
      "role": "system",
      "content": "You are a helpful physics tutor.",
      "model": null,
      "metadata": {},
      "createdAt": "..."
    }
  ]
}
```

### PNG (Graph Image)

Uses React Flow's `toObject()` and a canvas export library (e.g., `html-to-image`) to capture the graph panel as an image.

## API Endpoints

### `GET /api/v1/conversations/:id/export`

**Query params:**
- `format`: `"markdown"` | `"json"` (default: `"json"`)
- `path`: `"active"` | `"full"` (default: `"full"`)
- `activeNodeId`: required when `path=active`, specifies the leaf node

**Response (JSON format):** `200` — returns the JSON structure above

**Response (Markdown format):** `200`
```
Content-Type: text/markdown
Content-Disposition: attachment; filename="quantum-computing-discussion.md"
```

### `POST /api/v1/conversations/import`

**Request:** `multipart/form-data` with a JSON file

**Response:** `201`
```json
{
  "id": "new-conversation-uuid",
  "title": "Imported: Quantum Computing Discussion",
  "nodeCount": 15
}
```

## Import: ChatGPT Format

ChatGPT exports produce a `conversations.json` with this structure:

```json
[
  {
    "title": "Chat Title",
    "mapping": {
      "node-id": {
        "id": "node-id",
        "parent": "parent-id",
        "message": {
          "author": { "role": "user" },
          "content": { "parts": ["message text"] }
        }
      }
    }
  }
]
```

The importer maps this to ChatGraph's format:
1. Parse the `mapping` object into a tree
2. Map `author.role` → ChatGraph `role` enum
3. Concatenate `content.parts` into a single `content` string
4. Preserve parent-child relationships
5. Create a new Conversation + Nodes in a single transaction

## UI Design

### Export Dialog

Triggered from a menu on the conversation header:

```
┌─────────────────────────────────────┐
│  Export Conversation           [X]  │
│─────────────────────────────────────│
│                                     │
│  Format:                            │
│  ● Markdown (.md)                   │
│  ○ JSON (.json)                     │
│  ○ Graph Image (.png)               │
│                                     │
│  Scope:                             │
│  ● Active path only                 │
│  ○ Full tree (all branches)         │
│                                     │
│  [Cancel]              [Export]      │
└─────────────────────────────────────┘
```

### Import Button

In the sidebar, next to "+ New Conversation":

```
┌────────────────────────┐
│  + New Conversation    │
│  ↑ Import              │
│────────────────────────│
```

Accepts `.json` files via file picker. Shows a preview before importing.

## Edge Cases

- **Large conversations (1000+ nodes)**: JSON export may be large; consider streaming the response or chunking
- **Circular references in import**: Validate that the tree structure is acyclic before importing
- **Duplicate import**: Check if a conversation with the same original ID already exists; offer to skip or create a copy
- **Special characters in filenames**: Sanitize the conversation title for use as filename
- **Markdown export with images**: If future image support is added, embed as base64 or reference URLs
