# F034 — Time-Travel / Conversation Replay

## Summary

Replay mode that lets users scrub through the chronological build-up of a conversation graph. A slider controls which nodes are visible, and the graph animates as nodes appear one by one.

## Motivation

- Understand how a conversation evolved over time
- Identify the point where a discussion went off track
- Fork from any historical point to explore alternatives
- Useful for teaching, demos, and debugging prompt strategies

## UI Components

### Replay Toolbar Button
- **Location**: Graph toolbar (History icon), between heatmap and layout buttons
- **Disabled**: When streaming, already replaying, or fewer than 2 nodes
- **Active state**: Blue accent background when replay is active

### ReplayControls Bar
- **Location**: Bottom-center of graph panel, floating above the graph
- **Components**: SkipBack | Play/Pause | SkipForward | Slider | Counter (N/M) | Fork Here | Exit (X)

## Behavior

1. **Start Replay**: Click History icon → nodes sorted by `createdAt` → slider starts at position 1 (first node visible)
2. **Scrub**: Drag slider to show nodes up to that position. Graph re-layouts with only visible nodes.
3. **Play/Pause**: Auto-advance at 600ms intervals (adjustable by playback speed). Stops at end.
4. **Step**: SkipBack/SkipForward move one node at a time, pausing auto-play.
5. **Fork Here**: Sets active node to the last visible node, exits replay mode. User can then continue the conversation from that point.
6. **Exit**: Press X button or Escape key to exit replay and show all nodes.
7. **Auto-exit**: Switching conversations automatically exits replay.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Toggle play/pause |
| ArrowLeft | Step back |
| ArrowRight | Step forward |
| Escape | Exit replay |

## State (uiStore)

```typescript
interface ReplayState {
  isReplaying: boolean
  replayIndex: number   // 1-based, how many nodes to show
  maxIndex: number      // total nodes
  isPlaying: boolean
  playbackSpeed: number // multiplier (1 = normal)
}
```

## Implementation Details

- Nodes sorted by `createdAt` timestamp
- `replayVisibleIds` is a Set derived from `sortedNodeIds.slice(0, replayIndex)`
- flowNodes/flowEdges memo filters out nodes not in the visible set
- Merge edges also filtered
- Auto-pan to active node is suppressed during replay
- Collapsed nodes are cleared when entering replay

## Files Modified

- `packages/client/src/stores/uiStore.ts` — ReplayState + actions
- `packages/client/src/components/graph/GraphPanel.tsx` — toolbar button, node filtering, replay integration
- `packages/client/src/components/graph/ReplayControls.tsx` — new component
