# F037 — Mermaid Diagram Rendering

**Status**: Implemented
**Priority**: P1 (Parity — Artifacts)

## Overview

When an assistant message contains a ` ```mermaid ` fenced code block, the content is rendered as an SVG diagram inline in the chat, instead of displaying raw text.

## Behavior

- Mermaid syntax is parsed and rendered to SVG using the `mermaid` library's async `render()` API
- Each diagram gets a unique ID via React's `useId()` hook
- A toolbar above the diagram provides:
  - **Copy** button to copy raw mermaid source
  - **Code/Image toggle** to switch between rendered SVG and raw source
- **Theme-aware**: detects dark/light mode from `document.documentElement.classList` and re-renders when theme changes
- **Error handling**: on parse failure, shows raw source code with an inline red error banner
- **Streaming**: incomplete mermaid blocks during streaming show as raw code (graceful degradation)

## Files

| File | Change |
|------|--------|
| `packages/client/src/components/chat/MermaidDiagram.tsx` | New component |
| `packages/client/src/components/chat/CodeBlock.tsx` | Routes `language-mermaid` to MermaidDiagram |
| `packages/client/src/index.css` | `.mermaid-container svg` max-width rule |
| `packages/client/package.json` | Added `mermaid` dependency |

## Security

- Mermaid is initialized with `securityLevel: 'strict'` (no script execution in diagrams)
- SVG output is rendered via `dangerouslySetInnerHTML` but the strict security level prevents XSS

## Dependencies

- `mermaid` ~v11 (npm package)
