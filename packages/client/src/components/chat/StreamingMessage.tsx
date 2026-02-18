import { MarkdownRenderer } from './MarkdownRenderer'
import { CostTicker } from './CostTicker'

interface StreamingMessageProps {
  content: string
}

export function StreamingMessage({ content }: StreamingMessageProps) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%]">
        <div className="border-l-2 border-accent/30 pl-4 text-sm text-fg-primary">
          {content ? (
            <div className="markdown-body">
              <MarkdownRenderer content={content} isStreaming />
            </div>
          ) : (
            <div className="thinking-dots py-2">
              <span />
              <span />
              <span />
            </div>
          )}
          {content && (
            <div className="flex items-center gap-2">
              <span className="streaming-cursor" />
              <CostTicker />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
