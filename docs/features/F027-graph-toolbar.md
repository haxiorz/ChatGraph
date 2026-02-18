# F027 — Graph Toolbar (Zoom-to-Fit & Reset View)

## Summary

A floating toolbar in the graph panel providing "Fit View" and "Reset Zoom" buttons with keyboard shortcuts for quick viewport control.

## Motivation

React Flow's built-in `<Controls>` component provides zoom in/out and fit-view, but its styling doesn't match the app's design system. A custom toolbar adds reset-view functionality and keyboard shortcuts not available in the default controls.

## Architecture

### Toolbar: `GraphPanel.tsx`

A floating `div` positioned `absolute right-3 top-3 z-10` with glass-morphism styling (`bg-surface/80 backdrop-blur-sm`).

Two buttons:
1. **Fit View** (`Maximize2` icon) — calls `reactFlow.fitView({ duration: 300 })`
2. **Reset View** (`RotateCcw` icon) — calls `reactFlow.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 300 })`

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+F` | Fit view |
| `Ctrl+0` | Reset zoom to 1x |

Registered via `keydown` event listener in a `useEffect` inside `GraphPanelInner`.

### Visibility

The toolbar only renders when the graph has nodes (it's inside the return path after the empty-state guard).

## Files Changed

- **Modified**: `GraphPanel.tsx`
