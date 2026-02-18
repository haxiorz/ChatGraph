import { useMemo, useState } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'

function buildDocument(code: string, language: string): string {
  // Full HTML document — pass through as-is
  const trimmed = code.trimStart().toLowerCase()
  if (trimmed.startsWith('<!doctype') || trimmed.startsWith('<html')) {
    return code
  }

  // HTML snippet
  if (language === 'html' || language === 'htm') {
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;margin:16px;color:#1a1a1a;}</style></head>
<body>${code}</body></html>`
  }

  // CSS snippet
  if (language === 'css') {
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>${code}</style></head>
<body>
<div class="preview">
  <h1>Heading 1</h1>
  <h2>Heading 2</h2>
  <p>A sample paragraph to demonstrate styling.</p>
  <button>Button</button>
  <a href="#">Link</a>
  <ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>
</div>
</body></html>`
  }

  // JS snippet
  if (language === 'js' || language === 'javascript') {
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;margin:16px;color:#1a1a1a;}pre{background:#f5f5f5;padding:12px;border-radius:6px;overflow-x:auto;}</style></head>
<body>
<pre id="output"></pre>
<script>
const _origLog = console.log;
const _output = document.getElementById('output');
console.log = (...args) => {
  _output.textContent += args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ') + '\\n';
  _origLog.apply(console, args);
};
${code}
</script>
</body></html>`
  }

  return code
}

interface HTMLPreviewProps {
  code: string
  language: string
}

export function HTMLPreview({ code, language }: HTMLPreviewProps) {
  const [expanded, setExpanded] = useState(false)
  const srcdoc = useMemo(() => buildDocument(code, language), [code, language])

  return (
    <div
      className={
        expanded
          ? 'fixed inset-4 z-50 flex flex-col rounded-lg border border-border bg-surface shadow-lg'
          : 'mt-2 overflow-hidden rounded-md border border-border'
      }
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-elevated/50 px-3 py-1.5">
        <span className="text-[10px] font-medium text-fg-muted">Preview</span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="rounded p-1 text-fg-muted hover:text-fg-primary transition-colors"
          title={expanded ? 'Minimize' : 'Maximize'}
        >
          {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
      </div>

      {/* Iframe */}
      <iframe
        srcDoc={srcdoc}
        sandbox="allow-scripts"
        className={`w-full border-0 bg-white ${expanded ? 'flex-1' : 'h-64'}`}
        title="Code preview"
      />
    </div>
  )
}
