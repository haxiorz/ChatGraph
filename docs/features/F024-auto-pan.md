# F024 — Auto-Pan Graph to Active Node

## Status: Implemented

## Summary

The graph viewport smoothly pans to center on the active node whenever it changes, keeping the user's focus on the relevant part of the conversation tree.

## How It Works

1. A `useEffect` in `GraphPanelInner` watches `activeNodeId`.
2. Guards: skips if `activeNodeId` is null or initial `fitView` hasn't fired yet (`hasFitRef.current`).
3. Finds the active node in `flowNodes` by ID.
4. Computes the node center: `position.x + 100` (half of 200px width), `position.y + 30` (half of 60px height).
5. Calls `reactFlow.setCenter(x, y, { zoom: currentZoom, duration: 400 })` for a smooth animated pan.
6. The current zoom level is preserved — only the viewport position changes.

## Files Modified

- `packages/client/src/components/graph/GraphPanel.tsx` — Added `useEffect` after existing fitView effects

## Future Enhancements

- Toggle to disable auto-pan (for users who prefer manual navigation)
- Different layout modes (radial, horizontal, force-directed)
- Collapse/expand subtrees
- Saved viewport positions per conversation
