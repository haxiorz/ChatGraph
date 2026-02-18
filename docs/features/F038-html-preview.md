# F038 — HTML/CSS/JS Live Preview

**Status**: Implemented
**Priority**: P1 (Parity — Artifacts)

## Overview

Code blocks with language `html`, `htm`, `css`, `js`, or `javascript` display a "Preview" button. Clicking it renders the code in a sandboxed iframe below the code block.

## Behavior

- **Preview toggle**: Eye icon appears on hover for previewable code blocks. Clicking toggles an inline iframe preview below the code.
- **Smart document assembly**:
  - Full HTML documents (`<!DOCTYPE>` or `<html>`) pass through unchanged
  - HTML snippets get wrapped in a basic document with system font styling
  - CSS snippets get wrapped in a `<style>` tag with sample HTML elements to demonstrate styling
  - JS snippets get wrapped with a `console.log` override that outputs to a `<pre>` element
- **Expand/collapse**: Maximize button expands the preview to near-fullscreen (`fixed inset-4 z-50`). Minimize returns to inline.
- **Default height**: 256px (`h-64`), expandable to fill viewport.

## Files

| File | Change |
|------|--------|
| `packages/client/src/components/chat/HTMLPreview.tsx` | New component |
| `packages/client/src/components/chat/CodeBlock.tsx` | Added preview button + toggle for previewable languages |

## Security

- `sandbox="allow-scripts"` only — no `allow-same-origin`, no popups, no forms, no navigation
- Uses `srcdoc` attribute for content injection (no blob URLs)
- Infinite loops in user JS only affect the iframe process, not the parent app
- No access to ChatGraph's DOM, state, cookies, or localStorage

## Dependencies

None (pure HTML iframe API).
