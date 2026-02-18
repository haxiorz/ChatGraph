# F011 — Markdown Rendering & Code Blocks

## Priority: P0 (Table stakes — unusable without it)

## Status: PLANNED

## Summary

Render assistant responses as rich Markdown with syntax-highlighted code blocks, LaTeX math, tables, and a "Copy code" button. This is the most fundamental missing feature — every AI chat interface renders Markdown.

## Acceptance Criteria

- [ ] Assistant messages render full GitHub-flavored Markdown (GFM)
- [ ] Fenced code blocks render with syntax highlighting (language auto-detected or specified)
- [ ] Each code block has a "Copy" button in the top-right corner
- [ ] Inline code renders with monospace background
- [ ] LaTeX math renders correctly (inline `$...$` and block `$$...$$`)
- [ ] Tables render as styled HTML tables
- [ ] Links open in a new tab (`target="_blank"`)
- [ ] Lists (ordered, unordered, nested) render correctly
- [ ] Bold, italic, strikethrough all render
- [ ] Headings render with appropriate sizing
- [ ] Blockquotes render with a left border style
- [ ] Horizontal rules render as dividers
- [ ] Images referenced in Markdown render inline
- [ ] User messages render as plain text (with newline preservation), NOT Markdown
- [ ] System messages render as plain text
- [ ] Streaming messages render Markdown progressively (no flicker on each token)

## Dependencies

### npm packages

```
react-markdown          # Core Markdown renderer
remark-gfm              # GitHub-flavored Markdown (tables, strikethrough, autolinks)
remark-math             # Parse LaTeX math syntax
rehype-katex            # Render LaTeX math via KaTeX
rehype-highlight        # Syntax highlighting for code blocks (uses highlight.js)
katex                   # KaTeX CSS for math rendering
```

## Component Design

### `MarkdownRenderer`

A shared component that wraps `react-markdown` with all plugins configured:

```typescript
interface MarkdownRendererProps {
  content: string
  isStreaming?: boolean
}

export function MarkdownRenderer({ content, isStreaming }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex, rehypeHighlight]}
      components={{
        code: CodeBlock,
        a: ExternalLink,
        // ... other overrides
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
```

### `CodeBlock`

Custom renderer for fenced code blocks:

```
┌─ python ──────────────────────── [Copy] ─┐
│ def fibonacci(n):                         │
│     if n <= 1:                            │
│         return n                          │
│     return fibonacci(n-1) + fibonacci(n-2)│
└───────────────────────────────────────────┘
```

Features:
- Language label in top-left (from the fence info string)
- "Copy" button in top-right → copies raw code to clipboard
- "Copied!" feedback for 2 seconds after click
- Dark background regardless of theme (code blocks always use a dark theme)
- Line numbers for blocks > 5 lines (optional, off by default)

### `ExternalLink`

All links in Markdown open in a new tab with `rel="noopener noreferrer"`.

## Streaming Considerations

During streaming, Markdown is rendered on every token update. This can cause:
- **Flicker**: If the parser re-creates the DOM on every update
- **Incomplete syntax**: Mid-stream, a code block may be open but not closed yet

Mitigations:
- Memoize the `ReactMarkdown` component and use `useMemo` for the content prop
- During streaming, append a closing fence (` ``` `) if an unclosed fence is detected, so partial code blocks still render
- Use `requestAnimationFrame` batching from F008 to limit re-renders to ~60fps

## Tailwind Styling

Create a `prose` wrapper using Tailwind's typography plugin or manual styles:

```typescript
<div className="prose prose-sm dark:prose-invert max-w-none">
  <MarkdownRenderer content={message.content} />
</div>
```

Key style overrides:
- Code blocks: `bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto`
- Inline code: `bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm`
- Tables: `border-collapse` with alternating row colors
- Blockquotes: `border-l-4 border-blue-400 pl-4 italic`

## Highlight.js Theme

Use a single dark theme for code blocks (e.g., `github-dark` or `atom-one-dark`). Import the CSS in `main.tsx`:

```typescript
import 'highlight.js/styles/github-dark.css'
import 'katex/dist/katex.min.css'
```

## Testing

- Unit tests for `MarkdownRenderer` with various Markdown inputs
- Visual tests for code blocks, math, tables
- Streaming test: render partial Markdown with unclosed fences
- Copy button: verify clipboard interaction

## Edge Cases

- **Empty code blocks**: Render empty block with just the language label
- **Very long lines in code**: Horizontal scroll, no wrapping
- **Nested Markdown in blockquotes**: Should render correctly
- **HTML in Markdown**: Sanitize — do not render raw HTML from AI responses (XSS risk)
- **Extremely large responses**: Virtualize or lazy-render messages > 10,000 chars
