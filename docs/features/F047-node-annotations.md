# F047 — Node Annotations

## Overview
Allows users to attach freeform text notes to any node via the right-click context menu. Annotations are stored in node metadata and displayed both in the chat (as amber-themed note blocks) and on the graph (as a StickyNote indicator badge).

## Implementation

### New Files
- `packages/client/src/components/graph/AnnotationPopover.tsx` — Fixed-position popover with textarea, save/remove buttons

### Modified Files
- `packages/client/src/components/graph/NodeContextMenu.tsx` — Added "Add note" / "Edit note" menu item with `StickyNote` icon; accepts `onAnnotate` callback prop
- `packages/client/src/components/graph/GraphPanel.tsx` — Manages `annotationPopover` state; passes `onAnnotate` to context menu; renders `<AnnotationPopover />`; adds `hasAnnotation` to flow node data
- `packages/client/src/components/graph/ConversationNode.tsx` — Added `hasAnnotation` to `ConversationNodeData`; renders amber StickyNote badge at bottom-right corner
- `packages/client/src/components/chat/MessageBubble.tsx` — Added `AnnotationBlock` component; shows amber-bordered note block below user and assistant messages when annotation exists

### Data Model
Annotations are stored in node metadata as `{ annotation: string }`. No database migration needed — uses existing `metadata` JSON field.

### UI
- **Context menu**: "Add note" (no existing annotation) / "Edit note" (has annotation)
- **Popover**: 280px wide, textarea (3 rows, max 500 chars), Save + Remove buttons, Ctrl+Enter to save, Escape to close
- **Graph node**: Small amber StickyNote icon at bottom-right when annotated
- **Chat bubble**: Amber-themed block with StickyNote icon + "Note" label below message content
