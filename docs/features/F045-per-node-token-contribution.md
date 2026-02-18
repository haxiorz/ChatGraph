# F045 — Per-Node Token Contribution

## Overview

Enhances the ContextBar with a segmented progress bar and expandable per-message token breakdown, showing how many tokens each message in the active path contributes.

## Feature

### Segmented Progress Bar

- Replaces the single-color bar with color-coded segments:
  - **Gray** — system messages
  - **Blue (accent)** — user messages
  - **Green** — assistant messages
- Each segment width is proportional to that node's token contribution relative to the full context window

### Token Estimation

- **Assistant nodes**: Uses actual `completion_tokens` from metadata when available
- **User/system nodes**: Estimates via `Math.ceil(content.length / 4)`
- All estimates are scaled proportionally to match the actual `prompt_tokens` total from the last assistant response

### Expandable Breakdown

- Clicking the context bar toggles an expanded panel
- Chevron icon indicates expand/collapse state
- Panel shows:
  - **Legend** with role color indicators (SYS, USR, AI)
  - **Per-message rows** with:
    - Role badge (colored)
    - Mini progress bar (proportional to total)
    - Token count
    - Content preview (truncated to 80 chars)
- Scrollable list (max-height 192px) for long conversations

## Files Modified

| File | Change |
|------|--------|
| `packages/client/src/components/chat/ContextBar.tsx` | Full rewrite with segmented bar + expandable breakdown |
