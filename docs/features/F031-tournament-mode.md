# F031 - Multi-Model Tournament Mode

## Overview

Send the same prompt to 2-4 models simultaneously, see responses stream as sibling branches on the graph, compare side-by-side, and pick a winner.

## User Flow

1. Type a message in the chat input
2. Click the **Swords** icon button (next to Send)
3. A popover appears with model checkboxes (pre-selects current model)
4. Select 2-4 models, click "Start Tournament"
5. The chat panel switches to tournament view with side-by-side streaming columns
6. Each column shows: model name, streaming content, TTFT and total duration
7. When all models finish (or error), "Pick Winner" buttons appear
8. Clicking "Pick Winner" navigates to that branch and closes the tournament view

## Architecture

### Backend

**Endpoint:** `POST /api/v1/conversations/:id/tournament`

**Request body:**
```json
{
  "parentNodeId": "uuid",
  "content": "user message",
  "models": ["model-a", "model-b"],
  "temperature": 0.7
}
```

**SSE Event Protocol:**
- `userNode` - Single user node created (metadata: `isTournament: true`)
- `tournamentStart` - `{ models, userNodeId }`
- `token` - `{ modelIndex, content }` (per-model tokens)
- `modelDone` - `{ modelIndex, node, timing: { ttft, totalDuration } }`
- `modelError` - `{ modelIndex, message }`
- `title` - Auto-title for first exchange
- `tournamentDone` - All models finished

**Implementation:** `completionService.streamTournament()` creates one user node, then launches parallel OpenRouter streams via `Promise.allSettled`. Each model's response is saved as a sibling assistant node (all sharing `parentId = userNode.id`).

### Frontend

**Store:** `tournamentStore.ts` (Zustand) tracks active state, per-model streaming content, nodes, timing, and winner selection.

**Stream:** `tournamentStream.ts` handles tournament-specific SSE events with `modelIndex` routing.

**Components:**
- `TournamentPanel.tsx` - Side-by-side streaming columns with CSS grid
- `TournamentModelPicker.tsx` - Popover with model checkboxes and search

**Integration:**
- `useCompletion.ts` - `sendTournament(content, models)` method
- `conversationStore.ts` - `addNodeSilent(node)` adds nodes without changing active selection
- `ChatPanel.tsx` - Renders TournamentPanel when tournament is active
- `MessageInput.tsx` - Swords button triggers model picker
- `ConversationNode.tsx` - Tournament nodes get amber dashed border and Swords icon

## Graph Visualization

Tournament nodes are visually distinct on the graph:
- Amber dashed border
- Swords icon instead of role icon
- "tournament" label
- Multiple sibling assistant nodes branch from the same user node

## Files

| File | Action |
|------|--------|
| `server/src/routes/completions.ts` | Modified - tournament route |
| `server/src/services/completionService.ts` | Modified - `streamTournament()` |
| `client/src/stores/tournamentStore.ts` | Created |
| `client/src/services/tournamentStream.ts` | Created |
| `client/src/hooks/useCompletion.ts` | Modified - `sendTournament` |
| `client/src/stores/conversationStore.ts` | Modified - `addNodeSilent` |
| `client/src/components/chat/TournamentPanel.tsx` | Created |
| `client/src/components/chat/TournamentModelPicker.tsx` | Created |
| `client/src/components/chat/MessageInput.tsx` | Modified - tournament trigger |
| `client/src/components/chat/ChatPanel.tsx` | Modified - conditional render |
| `client/src/components/graph/ConversationNode.tsx` | Modified - tournament indicator |
| `client/src/components/graph/GraphPanel.tsx` | Modified - pass isTournament data |
