# F026 — Collapse/Expand Subtrees

## Summary

Users can collapse and expand subtrees in the graph panel, hiding all descendants of a collapsed node. This improves graph readability for complex, deeply branched conversations.

## Motivation

Large conversation trees with many branches become visually cluttered. Collapsing irrelevant branches lets users focus on the active area while maintaining full context of the tree structure.

## Architecture

### State: `uiStore.ts`

- **`collapsedNodeIds: Set<string>`** — set of node IDs whose subtrees are collapsed
- **`toggleCollapsed(nodeId)`** — adds/removes a node from the collapsed set
- **`clearCollapsed()`** — resets all collapsed state (called on conversation load/reset)

### Graph Filtering: `GraphPanel.tsx`

1. **`hiddenNodeIds` memo** — BFS from each collapsed node's children to build a set of all descendant IDs
2. **`flowNodes/flowEdges` memo** — skips any node or edge where either endpoint is in `hiddenNodeIds`
3. Passes `isCollapsed: boolean` in each node's data

### Visual: `ConversationNode.tsx`

- Nodes with children show a **toggle button** (top-right badge position):
  - **Collapsed**: `ChevronRight` icon
  - **Expanded, 2+ children**: child count number (preserving existing UX)
  - **Expanded, 1 child**: `ChevronDown` icon
- Collapsed nodes get a **dashed bottom border** indicator
- The "Compare" button is hidden when the node is collapsed

### Context Menu: `NodeContextMenu.tsx`

- New menu item: "Collapse subtree" / "Expand subtree" (only shown when node has children)
- Uses `ChevronsDownUp` / `ChevronsUpDown` icons

### Conversation Lifecycle

- `conversationStore.loadConversation()` calls `clearCollapsed()`
- `conversationStore.reset()` calls `clearCollapsed()`

## Interaction

- **Click toggle button** on node badge → collapse/expand
- **Right-click → Collapse/Expand subtree** → same effect from context menu
- Collapsing a node hides all descendants but keeps the collapsed node visible
- The active path is not special-cased — if the active node is hidden by a collapse, the user must expand to see it

## Files Changed

- **Modified**: `uiStore.ts`, `conversationStore.ts`, `GraphPanel.tsx`, `ConversationNode.tsx`, `NodeContextMenu.tsx`
