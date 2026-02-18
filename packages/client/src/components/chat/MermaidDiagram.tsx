import { useState, useEffect, useId } from 'react'
import mermaid from 'mermaid'
import { Code, Image, Copy, Check } from 'lucide-react'

let mermaidInitialized = false

function initMermaid() {
  if (mermaidInitialized) return
  const isDark = document.documentElement.classList.contains('dark')
  mermaid.initialize({
    startOnLoad: false,
    theme: isDark ? 'dark' : 'default',
    securityLevel: 'strict',
    fontFamily: 'inherit',
  })
  mermaidInitialized = true
}

// Re-initialize when theme changes
function reinitMermaid() {
  mermaidInitialized = false
  initMermaid()
}

interface MermaidDiagramProps {
  chart: string
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const uniqueId = useId()
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showSource, setShowSource] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    const diagramId = `mermaid-${uniqueId.replace(/:/g, '')}`

    async function render() {
      try {
        initMermaid()
        const { svg: rendered } = await mermaid.render(diagramId, chart)
        if (!cancelled) {
          setSvg(rendered)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setSvg(null)
          setError(err instanceof Error ? err.message : 'Failed to render diagram')
        }
        // Clean up any leftover element mermaid may have created
        const el = document.getElementById(diagramId)
        if (el) el.remove()
      }
    }

    render()
    return () => { cancelled = true }
  }, [chart, uniqueId])

  // Listen for theme changes to re-render
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === 'class') {
          reinitMermaid()
          // Re-trigger render by forcing a state update
          setSvg(null)
          setError(null)
          const diagramId = `mermaid-${uniqueId.replace(/:/g, '')}-theme`
          mermaid.render(diagramId, chart).then(({ svg: rendered }) => {
            setSvg(rendered)
          }).catch((err) => {
            setError(err instanceof Error ? err.message : 'Failed to render')
            const el = document.getElementById(diagramId)
            if (el) el.remove()
          })
        }
      }
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [chart, uniqueId])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(chart)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="group relative my-2 rounded-md border border-border bg-elevated/50">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="text-[10px] font-medium text-fg-muted">mermaid</span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="rounded p-1 text-fg-muted hover:text-fg-primary transition-colors"
            title="Copy source"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
          <button
            onClick={() => setShowSource(!showSource)}
            className="rounded p-1 text-fg-muted hover:text-fg-primary transition-colors"
            title={showSource ? 'Show diagram' : 'Show source'}
          >
            {showSource ? <Image size={13} /> : <Code size={13} />}
          </button>
        </div>
      </div>

      {/* Content */}
      {showSource ? (
        <pre className="!m-0 overflow-x-auto p-3">
          <code className="text-sm">{chart}</code>
        </pre>
      ) : error ? (
        <div className="p-3">
          <div className="mb-2 rounded bg-destructive/10 px-2 py-1 text-xs text-destructive">
            {error}
          </div>
          <pre className="!m-0 overflow-x-auto">
            <code className="text-sm">{chart}</code>
          </pre>
        </div>
      ) : svg ? (
        <div
          className="mermaid-container flex justify-center overflow-x-auto p-3"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="flex items-center justify-center p-6 text-fg-muted text-sm">
          Rendering diagram...
        </div>
      )}
    </div>
  )
}
