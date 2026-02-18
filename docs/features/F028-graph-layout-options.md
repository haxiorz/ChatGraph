# F028 — Graph Layout Options

## Status: Implemented

## Summary

Toggle between vertical (top-to-bottom) and horizontal (left-to-right) dagre graph layout. The selected direction persists in localStorage across sessions.

## User Flow

1. Open a conversation with nodes in the graph panel
2. Click the layout toggle button in the graph toolbar (top-right)
   - Arrow icon shows the alternative direction
3. Graph re-layouts with the new direction
4. Handle positions on nodes swap accordingly (Top/Bottom ↔ Left/Right)
5. Preference is persisted in `localStorage` under key `chatgraph-layout-direction`

## Implementation

### Files Modified

| File | Changes |
|------|---------|
| `packages/client/src/stores/uiStore.ts` | Added `layoutDirection: 'TB' \| 'LR'` state, `setLayoutDirection` action, localStorage persistence |
| `packages/client/src/utils/layout.ts` | `computeLayout()` accepts `{ direction }` options param, adjusts `rankdir`/`nodesep`/`ranksep`. Exports `NODE_WIDTH`/`NODE_HEIGHT` constants |
| `packages/client/src/components/graph/ConversationNode.tsx` | Reads `layoutDirection` from store, dynamically sets Handle `position` (Top/Bottom vs Left/Right) |
| `packages/client/src/components/graph/GraphPanel.tsx` | Passes direction to `computeLayout()`, renders toggle button with ArrowDownUp/ArrowLeftRight icons |

### State Shape

```ts
// uiStore
layoutDirection: 'TB' | 'LR'  // default: 'TB'
```

### Layout Parameters

| Direction | rankdir | nodesep | ranksep |
|-----------|---------|---------|---------|
| TB (vertical) | `'TB'` | 50 | 80 |
| LR (horizontal) | `'LR'` | 30 | 100 |

## Keyboard Shortcut

None currently. Could be added as `Ctrl+Shift+L` in the future.
