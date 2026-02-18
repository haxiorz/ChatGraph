# F039 — Graph Label Filtering

**Status**: Implemented
**Priority**: D7 (Differentiator — Annotations & Pins extension)

## Overview

Filter graph nodes by their color label (red, orange, yellow, green, blue, purple). A Filter button in the graph toolbar opens a dropdown to select which labels to show.

## Behavior

- **Filter dropdown**: Click the Filter icon in the graph toolbar to open a panel with 6 color circles and a "Show unlabeled nodes" checkbox.
- **When no filters are active** (default): all nodes are shown.
- **When filters are active**: only nodes with a matching label color are shown. Unlabeled nodes are shown/hidden based on the checkbox.
- **Visual indicator**: Filter icon turns accent-colored when filtering is active (same pattern as the Heatmap Flame button).
- **No matches overlay**: When all nodes are filtered out, a centered message with "Clear filter" link is shown over the graph.
- **Auto-reset**: Filters reset on conversation switch and on conversation reset.
- **Edge handling**: React Flow automatically hides edges when source/target nodes are missing from the graph.
- **In-memory only**: no localStorage persistence — filters are transient per session.

## State

In `uiStore`:
- `labelFilter.activeFilters: Set<string>` — set of active color names
- `labelFilter.showUnlabeled: boolean` — whether unlabeled nodes pass the filter
- `toggleLabelFilter(color)` — toggle a color in/out of the filter set
- `setShowUnlabeled(show)` — toggle unlabeled visibility
- `clearLabelFilters()` — reset to default (show all)

## Files

| File | Change |
|------|--------|
| `packages/client/src/components/graph/LabelFilter.tsx` | New component |
| `packages/client/src/stores/uiStore.ts` | Added `LabelFilterState`, filter actions |
| `packages/client/src/components/graph/GraphPanel.tsx` | Filter logic in node loop + LabelFilter in toolbar |
| `packages/client/src/stores/conversationStore.ts` | `clearLabelFilters()` on conversation switch/reset |

## Dependencies

None (uses existing label data from F029 node metadata).
