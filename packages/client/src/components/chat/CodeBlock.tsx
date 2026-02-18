import { useState } from 'react'
import { Copy, Check, Eye, Code } from 'lucide-react'
import { MermaidDiagram } from './MermaidDiagram'
import { HTMLPreview } from './HTMLPreview'

function extractText(children: React.ReactNode): string {
  if (typeof children === 'string') return children
  if (Array.isArray(children)) return children.map(extractText).join('')
  if (children && typeof children === 'object' && 'props' in children) {
    return extractText((children as { props: { children?: React.ReactNode } }).props.children)
  }
  return String(children ?? '')
}

const PREVIEWABLE_LANGUAGES = new Set(['html', 'htm', 'css', 'js', 'javascript'])

interface CodeBlockProps {
  className?: string
  children?: React.ReactNode
  inline?: boolean
}

export function CodeBlock({ className, children, inline }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const match = /language-(\w+)/.exec(className ?? '')
  const language = match?.[1] ?? ''

  if (inline) {
    return (
      <code className="rounded bg-elevated px-1.5 py-0.5 text-sm">
        {children}
      </code>
    )
  }

  const text = extractText(children)

  // Mermaid: render as diagram
  if (language === 'mermaid') {
    return <MermaidDiagram chart={text} />
  }

  const isPreviewable = PREVIEWABLE_LANGUAGES.has(language)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="group relative">
      {language && (
        <div className="absolute left-3 top-0 rounded-b bg-elevated px-2 py-0.5 text-[10px] font-medium text-fg-muted">
          {language}
        </div>
      )}
      <div className="absolute right-2 top-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {isPreviewable && (
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="rounded-md bg-elevated p-1.5 text-fg-muted hover:text-fg-primary"
            title={showPreview ? 'Show code' : 'Preview'}
          >
            {showPreview ? <Code size={14} /> : <Eye size={14} />}
          </button>
        )}
        <button
          onClick={handleCopy}
          className="rounded-md bg-elevated p-1.5 text-fg-muted hover:text-fg-primary"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <pre className="!mt-0 !mb-0">
        <code className={className}>{children}</code>
      </pre>
      {showPreview && isPreviewable && (
        <HTMLPreview code={text} language={language} />
      )}
    </div>
  )
}
