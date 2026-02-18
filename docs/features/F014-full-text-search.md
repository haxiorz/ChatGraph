# F014 — Full-Text Search

## Priority: P1 (Essential for power users)

## Status: PLANNED

## Summary

Search across all conversations and nodes by content. Results show matching messages with highlighted snippets and allow navigating directly to the matched node in its conversation.

## Acceptance Criteria

- [ ] Search input accessible via keyboard shortcut (`Ctrl+K` or `Ctrl+F`)
- [ ] Search queries match against node content and conversation titles
- [ ] Results show conversation title, matching snippet with highlighted terms, and node role
- [ ] Clicking a result opens the conversation and navigates to the matched node
- [ ] Search is fast (<200ms for typical queries)
- [ ] Results are ranked by relevance (title matches first, then content)
- [ ] Empty state when no results found
- [ ] Debounced input (300ms) to avoid excessive queries
- [ ] Search works across all conversations, not just the active one

## API

### `GET /api/v1/search`

**Query params:**
- `q`: search query string (required, min 2 chars)
- `conversationId`: optional, scope search to a single conversation
- `limit`: max results (default: 20, max: 100)

**Response:** `200`
```json
{
  "results": [
    {
      "node": {
        "id": "node-uuid",
        "role": "assistant",
        "content": "...matching snippet with context...",
        "model": "openai/gpt-4o",
        "createdAt": "..."
      },
      "conversation": {
        "id": "conv-uuid",
        "title": "Quantum Computing Discussion"
      },
      "highlights": [
        { "start": 42, "end": 58 }
      ]
    }
  ],
  "total": 7
}
```

## Database Implementation

### Option A: PostgreSQL Full-Text Search (Recommended)

Use PostgreSQL's built-in `tsvector` and `tsquery` for efficient full-text search without external dependencies.

**Schema addition:**
```prisma
model Node {
  // ... existing fields
  searchVector Unsupported("tsvector")?

  @@index([searchVector], type: Gin)
}
```

**Migration:**
```sql
-- Add tsvector column
ALTER TABLE "Node" ADD COLUMN "search_vector" tsvector;

-- Populate it
UPDATE "Node" SET search_vector = to_tsvector('english', content);

-- Create GIN index
CREATE INDEX node_search_idx ON "Node" USING gin(search_vector);

-- Auto-update trigger
CREATE FUNCTION node_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', NEW.content);
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER node_search_trigger
  BEFORE INSERT OR UPDATE ON "Node"
  FOR EACH ROW EXECUTE FUNCTION node_search_update();
```

**Query:**
```sql
SELECT n.*, c.title as conversation_title,
       ts_headline('english', n.content, query, 'StartSel=<mark>, StopSel=</mark>, MaxFragments=2') as snippet
FROM "Node" n
JOIN "Conversation" c ON n."conversationId" = c.id,
     to_tsquery('english', 'quantum & computing') query
WHERE n.search_vector @@ query
ORDER BY ts_rank(n.search_vector, query) DESC
LIMIT 20;
```

### Option B: ILIKE Fallback

For simple substring search without full-text indexing:

```sql
SELECT * FROM "Node" WHERE content ILIKE '%search term%' LIMIT 20;
```

Use this as a fallback or for exact phrase searches.

## UI Design

### Search Modal (Command Palette Style)

Triggered by `Ctrl+K`:

```
┌──────────────────────────────────────────┐
│  🔍 Search conversations...              │
│──────────────────────────────────────────│
│                                          │
│  📄 Quantum Computing Discussion         │
│     "...quantum computing uses           │
│     [superposition] and entanglement..." │
│     Assistant · gpt-4o · 2 hours ago     │
│                                          │
│  📄 Python Help                          │
│     "...use [superposition] in           │
│     quantum circuits with Qiskit..."     │
│     User · 1 day ago                     │
│                                          │
│  📄 Physics Notes                        │
│     "...[superposition] principle        │
│     states that any two..."              │
│     Assistant · claude-sonnet · 3 days ago│
│                                          │
│  ─────────────────────────────────────── │
│  ↑↓ Navigate  ↵ Open  Esc Close         │
└──────────────────────────────────────────┘
```

### Keyboard Navigation

- `Ctrl+K` / `Ctrl+F` — Open search
- `↑` / `↓` — Navigate results
- `Enter` — Open selected result (navigate to conversation + node)
- `Esc` — Close search
- Type to search (debounced 300ms)

## Service Layer

### `searchService.ts`

```typescript
export async function searchNodes(
  query: string,
  options?: { conversationId?: string; limit?: number }
): Promise<SearchResult[]>
```

Uses raw Prisma query (`prisma.$queryRaw`) for full-text search since Prisma doesn't natively support `tsvector`.

## Performance

- GIN index on `search_vector` enables sub-100ms queries even with 100k+ nodes
- Debounce frontend input by 300ms
- Cache recent search results in memory (clear on node creation/edit/delete)
- Limit snippet length to 200 chars with context

## Edge Cases

- **Search in code blocks**: Should match code content too
- **Special characters**: Escape SQL special chars in search query
- **Multi-language content**: Use `'simple'` text search config instead of `'english'` if content is multilingual
- **Very short queries**: Minimum 2 characters before searching
- **No results**: Show helpful empty state: "No results for 'xyz'. Try different keywords."
