# F030 — Smart Summarization Nodes

## Status: Implemented

## Summary

Right-click any non-root node and select "Summarize above" to generate an AI-powered summary of the conversation path from root to that node. The summary streams as a new child node with distinct visual styling (dashed cyan border, ScrollText icon, "Summary" badge).

## User Flow

1. Right-click any non-root node in the graph
2. Select "Summarize above" from the context menu
3. The AI generates a streaming summary of all messages from root to the selected node
4. A new summary node appears as a child of the selected node
5. Summary nodes are visually distinct:
   - **Graph**: Dashed cyan border, cyan accent bar, ScrollText icon, "summary" role label
   - **Chat**: Cyan "Summary (N msgs)" badge, cyan left border

## Implementation

### Server

| File | Changes |
|------|---------|
| `packages/server/src/services/completionService.ts` | Added `streamSummarization()` — builds path, sends summarization prompt to OpenRouter, streams response, saves node with `metadata.isSummary: true` |
| `packages/server/src/routes/completions.ts` | Added `POST /conversations/:id/summarize` route with Zod schema `{ nodeId, model, temperature? }` |

### Client

| File | Changes |
|------|---------|
| `packages/client/src/hooks/useCompletion.ts` | Added `summarize(nodeId)` function using same SSE pattern as regenerate |
| `packages/client/src/components/graph/NodeContextMenu.tsx` | Added "Summarize above" menu item (visible on all non-root nodes) |
| `packages/client/src/components/graph/ConversationNode.tsx` | Dashed cyan border + ScrollText icon + "summary" label for summary nodes |
| `packages/client/src/components/graph/GraphPanel.tsx` | Extracts `isSummary` from node metadata, passes as data prop |
| `packages/client/src/components/chat/MessageBubble.tsx` | Cyan "Summary (N msgs)" badge + cyan left border for summary messages |

### API

```
POST /api/v1/conversations/:id/summarize
Content-Type: application/json

{
  "nodeId": "uuid",     // Node to summarize up to
  "model": "string",    // Model to use for summarization
  "temperature": 0.7    // Optional
}

Response: SSE stream
  event: token    → { content: "..." }
  event: done     → { node: { ... } }
  event: error    → { message: "..." }
```

### Metadata Shape

```json
{
  "isSummary": true,
  "summarizedMessageCount": 8,
  "usage": { "prompt_tokens": 1234, "completion_tokens": 256 }
}
```

### Summarization Prompt

The system prompt instructs the model to:
- Produce a concise summary preserving key decisions, facts, code snippets, and action items
- Use bullet points for clarity
- Be thorough but concise

The full conversation path is included as context, followed by a user message requesting the summary.
