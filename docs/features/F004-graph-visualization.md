# F004 — Graph Visualization

## Priority: P0 (Core UI)

## Status: DONE

## Summary

The right panel renders the conversation tree as an interactive node graph using React Flow. Each database node becomes a visual node. Users click nodes to navigate and see the conversation branch.

## Acceptance Criteria

- [x] Graph panel takes up the right portion of the screen (default 50%)
- [x] Every `Node` in the conversation is rendered as a React Flow node
- [x] Edges connect parent → child
- [x] Tree is laid out top-to-bottom using dagre auto-layout
- [x] Nodes are color-coded by role (system, user, assistant)
- [x] Active node has a highlighted border/glow
- [x] Active path (root → active node) edges are highlighted
- [x] Click a node to make it the active node (updates chat panel)
- [x] Zoom, pan, and fit-view controls
- [x] Graph updates in real-time when new nodes are added (during completion)
- [x] Nodes show truncated content (first ~50 chars) + role icon

## Implementation Notes

- `GraphPanel.tsx` — builds React Flow nodes/edges from store, computes dagre layout via `utils/layout.ts`
- `ConversationNode.tsx` — memoized custom node component with role colors, emoji icons, model badge, active state
- Uses React Flow's built-in `<Controls />`, `<MiniMap />`, `<Background />` components
- Active path edges are blue (2.5px), inactive edges are gray (1.5px)
- MiniMap node colors: gray=system, blue=user, green=assistant
- Node dragging and connecting are disabled (`nodesDraggable={false}`, `nodesConnectable={false}`)
- Hover tooltip not yet implemented

## Node Design

### System Node
- Color: Gray (#6B7280)
- Icon: Gear/cog
- Small size
- Content: "System prompt" (no content preview)

### User Node
- Color: Blue (#3B82F6)
- Icon: User silhouette
- Content: First 50 chars of message

### Assistant Node
- Color: Green (#10B981)
- Icon: Sparkles/robot
- Content: First 50 chars of response
- Badge: Model name (e.g., "gpt-4o")

### Active Node Indicator
- Thicker border (3px)
- Subtle glow/shadow effect
- Distinct from hover state

## Layout Algorithm

Use the `dagre` library to compute node positions:

```typescript
import dagre from 'dagre'

function layoutGraph(nodes: Node[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'TB', nodesep: 50, ranksep: 80 })
  g.setDefaultEdgeLabel(() => ({}))

  nodes.forEach(node => g.setNode(node.id, { width: 200, height: 60 }))
  edges.forEach(edge => g.setEdge(edge.source, edge.target))

  dagre.layout(g)

  return nodes.map(node => {
    const pos = g.node(node.id)
    return { ...node, position: { x: pos.x - 100, y: pos.y - 30 } }
  })
}
```

## Interactions

| Action              | Behavior                                                    |
| ------------------- | ----------------------------------------------------------- |
| Click node          | Set as active node → chat shows path to this node           |
| Hover node          | Show tooltip with full content preview (max 200 chars)      |
| Scroll wheel        | Zoom in/out                                                 |
| Drag background     | Pan the graph                                               |
| Drag node           | Not allowed (positions are auto-calculated)                 |
| Fit view button     | Zoom to show entire graph                                   |
| Minimap             | Small overview in bottom-right corner                       |

## Edge Styling

- **Default edges**: Thin gray line, smooth step connector
- **Active path edges**: Thicker, colored to match the active node's color
- **Branch point**: Node with 2+ children shows a subtle fork indicator

## React Flow Configuration

```typescript
<ReactFlow
  nodes={flowNodes}
  edges={flowEdges}
  nodeTypes={customNodeTypes}
  nodesDraggable={false}
  nodesConnectable={false}
  fitView
  minZoom={0.1}
  maxZoom={2}
>
  <Background />
  <Controls />
  <MiniMap />
</ReactFlow>
```

## Performance Considerations

- Memoize node components with `React.memo` — only re-render when node data changes
- Debounce layout recalculation during streaming (new nodes arrive rapidly)
- For conversations > 200 nodes, consider lazy rendering (React Flow supports virtualization)
- Recalculate layout only when nodes are added/removed, not on every render

## Edge Cases

- **Single node** (just system prompt): Show one node centered
- **Deep linear chain**: Layout stays readable; auto-zoom to fit
- **Wide branching**: Horizontal space grows; minimap helps navigate
- **Node deletion**: Animate removed nodes fading out, recalculate layout
