# F020 — Token & Cost Tracking

## Priority: P1 (Leverages existing data, high visibility)

## Status: PLANNED

## Summary

Display token usage and estimated cost per message, per conversation, and globally. OpenRouter already returns token counts, and the model pricing data is available from the `/models` endpoint. This feature surfaces that data in the UI.

## Acceptance Criteria

- [ ] Each assistant message shows token count (prompt + completion tokens)
- [ ] Each assistant message shows estimated cost based on model pricing
- [ ] Conversation header shows total tokens and cost for the conversation
- [ ] Global usage dashboard shows total across all conversations
- [ ] Token data stored in node metadata (already spec'd in F007)
- [ ] Context window usage indicator shows % of model's context used
- [ ] Cost calculation uses pricing from the model list (cached)

## Data Source

### Per-Message Token Data

OpenRouter returns usage in the final SSE chunk:

```json
{
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 89,
    "total_tokens": 239
  }
}
```

This is already saved in `node.metadata.usage` (per F007). The frontend just needs to display it.

### Model Pricing

From `GET /api/v1/models`, each model has:

```json
{
  "id": "openai/gpt-4o",
  "pricing": {
    "prompt": 2.5,      // $ per million prompt tokens
    "completion": 10.0   // $ per million completion tokens
  }
}
```

**Cost formula:**
```
cost = (prompt_tokens * pricing.prompt / 1_000_000)
     + (completion_tokens * pricing.completion / 1_000_000)
```

## UI Design

### Per-Message Display

Shown below each assistant message (subtle, secondary text):

```
┌──────────────────────────────────────────┐
│  gpt-4o                                  │
│  Recursion is when a function calls      │
│  itself with a modified input...         │
│                                          │
│  150 + 89 tokens · $0.0013               │  ← prompt + completion · cost
└──────────────────────────────────────────┘
```

Format: `{prompt_tokens} + {completion_tokens} tokens · ${cost}`

For costs < $0.01, show with 4 decimal places: `$0.0013`
For costs ≥ $0.01, show with 2 decimal places: `$0.15`

### Context Window Indicator

A progress bar in the chat input area showing how much of the model's context window is used:

```
┌──────────────────────────────────────────┐
│  ████████░░░░░░░░░░░░  4,200 / 128,000  │  ← 3.3% used
│  ┌──────────────────────────────────┐    │
│  │ Type a message...        [Send]  │    │
│  └──────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

Color coding:
- Green (0-50%): Plenty of space
- Yellow (50-80%): Getting full
- Orange (80-95%): Almost full
- Red (95-100%): At limit — warn before sending

### Conversation Cost Summary

In the conversation header:

```
┌───────────────────────────────────────────────────────┐
│  Quantum Computing Discussion    12 msgs · $0.042     │
└───────────────────────────────────────────────────────┘
```

Hover to see breakdown:
```
┌───────────────────────────────┐
│  Total tokens: 4,850          │
│  Prompt tokens: 3,200         │
│  Completion tokens: 1,650     │
│  Estimated cost: $0.042       │
│  Models used: gpt-4o, claude  │
└───────────────────────────────┘
```

### Usage Dashboard (Settings → Usage)

```
┌─────────────────────────────────────────────────┐
│  Usage Overview                                  │
│─────────────────────────────────────────────────│
│                                                  │
│  Today        $0.42    │  This Month    $12.30   │
│  This Week    $3.15    │  All Time      $47.80   │
│                                                  │
│  ─────────────────────────────────────────────── │
│                                                  │
│  By Model                                        │
│  ┌────────────────────────────────────────────┐  │
│  │ gpt-4o          ████████████   $28.50      │  │
│  │ claude-sonnet   ██████         $14.20      │  │
│  │ llama-3.1-70b   ██             $5.10       │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  By Conversation (top 5)                         │
│  ┌────────────────────────────────────────────┐  │
│  │ Research Project    ████████   $8.40       │  │
│  │ Code Review         █████     $5.20       │  │
│  │ Writing Help        ████      $4.10       │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  Daily Usage (last 30 days)                      │
│  ┌────────────────────────────────────────────┐  │
│  │  $                                         │  │
│  │  2 ┤        ▄                              │  │
│  │  1 ┤  ▄ ▄▄ ██ ▄   ▄                       │  │
│  │  0 ┤▄██▄████████▄▄██▄▄▄▄▄                 │  │
│  │    └─────────────────────────              │  │
│  └────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## API

### `GET /api/v1/usage`

**Query params:**
- `period`: `"day"` | `"week"` | `"month"` | `"all"` (default: `"all"`)

**Response:** `200`
```json
{
  "totalTokens": 485000,
  "promptTokens": 320000,
  "completionTokens": 165000,
  "estimatedCost": 47.80,
  "byModel": [
    {
      "model": "openai/gpt-4o",
      "totalTokens": 280000,
      "estimatedCost": 28.50
    }
  ],
  "byConversation": [
    {
      "conversationId": "uuid",
      "title": "Research Project",
      "totalTokens": 84000,
      "estimatedCost": 8.40
    }
  ],
  "daily": [
    { "date": "2026-02-17", "tokens": 12000, "cost": 1.20 }
  ]
}
```

## Implementation

### Backend: `usageService.ts`

Aggregates token data from node metadata across the database:

```typescript
export async function getUsageStats(period: string) {
  const since = getDateForPeriod(period)

  const stats = await prisma.$queryRaw`
    SELECT
      n.model,
      SUM((n.metadata->'usage'->>'prompt_tokens')::int) as prompt_tokens,
      SUM((n.metadata->'usage'->>'completion_tokens')::int) as completion_tokens
    FROM "Node" n
    WHERE n.role = 'assistant'
      AND n.metadata->'usage' IS NOT NULL
      AND n."createdAt" >= ${since}
    GROUP BY n.model
  `

  // Calculate costs using cached model pricing
  // ...
}
```

### Frontend: Token Count Calculation

To show the context window indicator, the frontend needs to estimate tokens for the current path. Options:
1. **Simple estimate**: `characters / 4` (rough approximation)
2. **Accurate count**: Use `tiktoken` (heavy, ~1MB WASM) or a server-side endpoint
3. **Hybrid**: Use the rough estimate for the indicator, show the exact count from the last API response

Recommendation: Use the simple estimate for the real-time indicator, and the exact count from `metadata.usage.prompt_tokens` on the last message for accuracy.

## Edge Cases

- **Missing usage data**: Some OpenRouter models don't return usage. Show "—" for unknown.
- **Pricing changes**: Model prices can change. Cost calculation uses the price at query time, not at generation time. Historical costs may be slightly inaccurate.
- **Free models**: Some OpenRouter models are free. Show "$0.00" — don't hide the cost display.
- **Very high costs**: If a single message costs > $1, show a subtle warning color
- **Context window overflow**: When the estimated tokens exceed the model's context length, show a red indicator and warn before sending
