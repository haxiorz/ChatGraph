# F029 — Node Annotations (Pinning & Color Labels)

## Status: Implemented

## Summary

Pin important nodes and apply color-coded labels to graph nodes. Pinned nodes appear in a floating panel for quick navigation. All annotation data is stored in the existing node `metadata` JSON field — no database migration required.

## User Flow

### Pinning
1. Right-click any node in the graph
2. Select "Pin node" from the context menu
3. A gold pin icon appears on the top-left of the node
4. The Pinned Nodes panel appears at the bottom-left of the graph, listing all pinned nodes
5. Click any pinned node in the panel to navigate to it
6. Right-click a pinned node and select "Unpin node" to remove the pin

### Color Labels
1. Right-click any node in the graph
2. In the context menu, click one of the 6 color dots (red, orange, yellow, green, blue, purple)
3. The node's left accent bar changes to the selected color
4. Click the "✕" button next to the colors to remove the label
5. Labels persist across page reloads (stored in node metadata)

## Implementation

### Files Modified

| File | Changes |
|------|---------|
| `packages/client/src/components/graph/NodeContextMenu.tsx` | Added pin toggle, color picker (6 inline dots + remove button), summarize option |
| `packages/client/src/components/graph/ConversationNode.tsx` | Pin icon display (top-left amber circle), label color override on accent bar |
| `packages/client/src/components/graph/GraphPanel.tsx` | Extracts `pinned`/`labelColor` from node metadata, passes as data props, renders PinnedNodesPanel |

### Files Created

| File | Purpose |
|------|---------|
| `packages/client/src/components/graph/PinnedNodesPanel.tsx` | Floating bottom-left panel listing pinned nodes with click-to-navigate |

### Metadata Shape

```json
{
  "pinned": true,
  "label": { "color": "red" }
}
```

### Available Colors

| Name | Tailwind Class |
|------|---------------|
| red | `bg-red-500` |
| orange | `bg-orange-500` |
| yellow | `bg-yellow-400` |
| green | `bg-green-500` |
| blue | `bg-blue-500` |
| purple | `bg-purple-500` |

## API

Uses the existing `PATCH /api/v1/nodes/:id` endpoint with `{ metadata: { ... } }` body. No new endpoints required.
