# F051 — Context Pruning Controls

## Overview
Allows users to manually exclude specific nodes from the AI context window. When a node is excluded, it remains visible in the conversation tree and chat panel but is not sent to the AI model as part of the message history. This enables users to manage token usage by removing irrelevant or low-value messages from the context without deleting them.

## Implementation

### Modified Files

**Server:**
- `packages/server/src/utils/tree.ts` — Updated `TreeNode` interface to include optional `metadata` field. Modified `pathToMessages` to filter out nodes with `excludeFromContext: true` in their metadata. System prompts and the latest user message are never excluded to preserve conversation integrity.

**Client:**
- `packages/client/src/components/graph/NodeContextMenu.tsx` — Added "Exclude from context" / "Include in context" toggle menu item with `EyeOff`/`Eye` icons. Updates node metadata via API.
- `packages/client/src/components/graph/ConversationNode.tsx` — Added `excludedFromContext` to `ConversationNodeData` interface. Excluded nodes render at 50% opacity with a red `EyeOff` badge at bottom-right.
- `packages/client/src/components/graph/GraphPanel.tsx` — Passes `excludedFromContext` flag from node metadata to flow node data.
- `packages/client/src/components/chat/MessageBubble.tsx` — Shows "excluded" badge on user messages (red text with EyeOff icon) and assistant messages (red outline badge).
- `packages/client/src/components/chat/ContextBar.tsx` — Excluded nodes shown at 40% opacity with red mini-bars, strikethrough token counts, and "[excluded]" prefix in content preview. Segmented progress bar shows excluded segments in faded red.

### Data Model
Uses existing `metadata` JSON field on the Node model. The exclusion flag is stored as `{ excludeFromContext: true }`. No database migration needed.

### Safety Guards
- **System prompt (root node)** is never excluded regardless of metadata — it's essential for the conversation.
- **Latest user message** (last node in path) is never excluded — the AI needs it to generate a response.
- Root nodes cannot be excluded via the context menu (no "Exclude" option shown).

### UI Indicators

| Location | Excluded Appearance |
|---|---|
| Graph node | 50% opacity, red EyeOff badge |
| Chat (user) | Red "excluded" text with EyeOff icon |
| Chat (assistant) | Red outline "excluded" badge |
| Context bar (progress) | Faded red segment |
| Context bar (breakdown) | 40% opacity, strikethrough tokens, "[excluded]" prefix |
| Minimap | Dimmed (inherits fog-of-war behavior) |

### Context Menu
- Right-click any non-root node to see "Exclude from context" or "Include in context"
- Toast notification confirms the action
- Changes take effect on the next AI completion
