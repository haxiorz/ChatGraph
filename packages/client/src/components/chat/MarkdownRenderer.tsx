import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import { CodeBlock } from './CodeBlock'

function closeUnclosedFences(text: string): string {
  const fenceCount = (text.match(/^```/gm) ?? []).length
  if (fenceCount % 2 !== 0) {
    return text + '\n```'
  }
  return text
}

interface MarkdownRendererProps {
  content: string
  isStreaming?: boolean
}

export function MarkdownRenderer({ content, isStreaming }: MarkdownRendererProps) {
  const processed = useMemo(
    () => (isStreaming ? closeUnclosedFences(content) : content),
    [content, isStreaming],
  )

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[
        [rehypeKatex, { throwOnError: false, strict: false }],
        rehypeHighlight,
      ]}
      components={{
        code({ className, children, ...rest }) {
          const isInline = !className && typeof children === 'string' && !children.includes('\n')
          return (
            <CodeBlock className={className} inline={isInline} {...rest}>
              {children}
            </CodeBlock>
          )
        },
        a({ href, children }) {
          return (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          )
        },
      }}
    >
      {processed}
    </ReactMarkdown>
  )
}
