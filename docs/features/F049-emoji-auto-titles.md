# F049 — Emoji Prefix for Auto-Titles

## Overview
Enhances the AI-generated conversation titles (F021) to include a topic-relevant emoji prefix. When a new conversation's first exchange triggers auto-titling, the AI now prepends a single emoji that represents the conversation topic, making the conversation list more visually scannable.

## Implementation

### Modified Files
- `packages/server/src/services/completionService.ts` — Updated the `generateTitle` system prompt to instruct the model to start the title with a single relevant emoji. Includes examples for guidance.

### How It Works
The `generateTitle` function sends a prompt to `openai/gpt-4o-mini` asking for a 3-7 word title. The updated system prompt now instructs:

> "Start the title with a single relevant emoji that represents the topic."

Examples provided to the model:
- "Python Snake Game Tutorial"
- "Sales Data Analysis"
- "Fix Login Authentication Bug"

### Fallback
If the model fails or times out (5s), the fallback remains the truncated user message (no emoji added to fallback).

### UI Impact
Emojis appear naturally in:
- Conversation list sidebar
- Header title (editable)
- Analytics and usage dashboards referencing conversation titles
