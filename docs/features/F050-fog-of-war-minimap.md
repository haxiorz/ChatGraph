# F050 — Fog-of-War Minimap

## Overview
Enhances the React Flow minimap to create a "fog-of-war" effect that visually distinguishes explored (active path) branches from unexplored ones. Nodes on the active path appear bright and color-coded, while off-path nodes are dimmed to a translucent gray, making it easy to see which parts of the conversation tree are currently relevant.

## Implementation

### Modified Files
- `packages/client/src/components/graph/GraphPanel.tsx` — Enhanced the `<MiniMap>` component with custom `nodeColor`, `nodeStrokeColor`, and `nodeStrokeWidth` props.

### Visual Behavior

| Node State | Minimap Color | Stroke |
|---|---|---|
| Active (selected) node | Amber (#f59e0b) | Amber, 2px |
| On active path — user | Indigo (accent) | Indigo 60%, 2px |
| On active path — assistant | Green (#22c55e) | Indigo 60%, 2px |
| On active path — system | Gray (muted) | Indigo 60%, 2px |
| On active path — merge | Purple | Indigo 60%, 2px |
| Off active path (any role) | Gray 30% opacity | Transparent |

### Data Flow
The `isOnActivePath` and `isActive` flags are already computed and passed to each flow node's `data` object. The minimap's `nodeColor` callback reads these flags to determine the appropriate color.

### No New Dependencies
Uses only existing React Flow `<MiniMap>` props — no additional packages required.
