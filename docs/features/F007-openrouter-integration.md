# F007 — OpenRouter Integration

## Priority: P0 (Core dependency)

## Status: DONE

## Summary

The backend integrates with OpenRouter's API to send chat completions and receive streaming responses. This is the bridge between the conversation tree and the AI models.

## Acceptance Criteria

- [x] Server calls OpenRouter `/chat/completions` with correct auth and payload
- [x] Supports streaming responses (SSE)
- [x] Handles errors from OpenRouter gracefully (rate limits, auth failures, model errors)
- [x] API key stored server-side only, never exposed to the client
- [ ] Token usage tracked and stored in node metadata — not yet implemented
- [ ] Request timeout handling (configurable, default 60s) — not yet implemented

## Implementation Notes

- `completionService.streamCompletion()` handles the full flow: create user node, build path, call OpenRouter, stream tokens, save assistant node
- API key stored in `Setting` table (not env vars), fetched via `settingsService.get('openrouter_api_key')`
- Headers include `Authorization`, `HTTP-Referer`, `X-Title` as required by OpenRouter
- OpenRouter error responses (non-200) are forwarded to the client as SSE `error` events
- Client disconnect detected via `req.on('close')` with AbortController; partial content saved with `metadata.partial = true`
- Auto-titles conversation from first user message (truncated to 60 chars)

## OpenRouter API Details

### Endpoint
```
POST https://openrouter.ai/api/v1/chat/completions
```

### Headers
```
Authorization: Bearer sk-or-...
Content-Type: application/json
HTTP-Referer: http://localhost:5173
X-Title: ChatGraph
```

### Request Body
```json
{
  "model": "openai/gpt-4o",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi there!" },
    { "role": "user", "content": "Tell me more" }
  ],
  "stream": true,
  "temperature": 0.7
}
```

### Streaming Response
When `stream: true`, the response is SSE:
```
data: {"id":"gen-...","choices":[{"delta":{"content":"Hello"}}]}

data: {"id":"gen-...","choices":[{"delta":{"content":" world"}}]}

data: {"id":"gen-...","choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":50,"completion_tokens":10}}

data: [DONE]
```

## Backend Service: `completionService.ts`

```typescript
export async function streamCompletion(
  messages: Message[],
  model: string,
  onToken: (content: string) => void,
  onDone: (usage: Usage) => void,
  onError: (error: string) => void,
  signal?: AbortSignal,
): Promise<void>
```

### Implementation Steps

1. Build the fetch request with streaming enabled
2. Read the response body as a stream
3. Parse SSE lines (`data: {...}`)
4. Extract `choices[0].delta.content` from each chunk
5. Call `onToken(content)` for each token
6. On `[DONE]`, call `onDone(usage)` with token counts
7. On error, call `onError(message)`

### Error Handling

| OpenRouter Status | Meaning              | Our Response                          |
| ----------------- | -------------------- | ------------------------------------- |
| 401               | Invalid API key      | Return 401, "Invalid OpenRouter key"  |
| 402               | Insufficient credits | Return 402, "Out of credits"          |
| 429               | Rate limited         | Return 429, "Rate limited, retry in X"|
| 500+              | Provider error       | Return 502, "Model provider error"    |
| Timeout           | No response          | Return 504, "Request timed out"       |

## Completion Route: `POST /api/v1/conversations/:id/complete`

Full flow:

```typescript
router.post('/:id/complete', validate(CompleteSchema), async (req, res, next) => {
  const { parentNodeId, content, model } = req.body
  const conversationId = req.params.id

  // 1. Get all nodes for the conversation
  // 2. Build message path from root → parentNode
  // 3. Append user message to path
  // 4. Save user node to DB
  // 5. Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  // 6. Send user node event
  res.write(`event: userNode\ndata: ${JSON.stringify(userNode)}\n\n`)

  // 7. Stream completion
  let fullContent = ''
  await streamCompletion(
    messages,
    model,
    (token) => {
      fullContent += token
      res.write(`event: token\ndata: ${JSON.stringify({ content: token })}\n\n`)
    },
    async (usage) => {
      // 8. Save assistant node to DB
      const assistantNode = await nodeService.create({
        conversationId,
        parentId: userNode.id,
        role: 'assistant',
        content: fullContent,
        model,
        metadata: { usage },
      })
      res.write(`event: done\ndata: ${JSON.stringify({ node: assistantNode })}\n\n`)
      res.end()
    },
    (error) => {
      res.write(`event: error\ndata: ${JSON.stringify({ message: error })}\n\n`)
      res.end()
    },
  )
})
```

## Security

- **API key** is stored in the `Setting` table in the database (key: `openrouter_api_key`). Managed via `PUT /api/v1/settings`.
- The client hits our backend at `/api/v1/conversations/:id/complete`, which proxies to OpenRouter.
- No direct client → OpenRouter communication.
- **Note:** API key is not yet encrypted at rest or masked in GET responses. These are planned improvements.

## Configuration

Stored in `Settings` table:
- `openrouter_api_key`: The API key (stored as plain JSON value currently)
- `default_model`: Default model for new completions (planned)
- `default_temperature`: Default temperature (planned)
- `request_timeout`: Timeout in ms (planned)
