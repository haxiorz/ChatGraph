import { memo } from 'react'
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react'

interface StreamingEdgeData {
  isStreaming?: boolean
  isActivePath?: boolean
  tokenCount?: number
  showTokens?: boolean
  activeColor?: string
  inactiveColor?: string
  [key: string]: unknown
}

function StreamingEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
}: EdgeProps) {
  const edgeData = (data ?? {}) as StreamingEdgeData
  const isStreaming = edgeData.isStreaming ?? false
  const showTokens = edgeData.showTokens ?? false
  const tokenCount = edgeData.tokenCount ?? 0

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} />

      {/* Animated streaming particles */}
      {isStreaming && (
        <>
          <circle r="3" fill="var(--color-accent)" opacity="0.9">
            <animateMotion dur="1.2s" repeatCount="indefinite" path={edgePath} />
          </circle>
          <circle r="2.5" fill="var(--color-accent)" opacity="0.6">
            <animateMotion dur="1.2s" repeatCount="indefinite" path={edgePath} begin="0.3s" />
          </circle>
          <circle r="2" fill="var(--color-accent)" opacity="0.4">
            <animateMotion dur="1.2s" repeatCount="indefinite" path={edgePath} begin="0.6s" />
          </circle>
          {/* Glow effect on the edge itself */}
          <path
            d={edgePath}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="4"
            opacity="0.15"
            className="animate-pulse"
          />
        </>
      )}

      {/* Token count label on edge */}
      {showTokens && tokenCount > 0 && (
        <foreignObject
          x={labelX - 24}
          y={labelY - 10}
          width={48}
          height={20}
          className="pointer-events-none"
        >
          <div className="flex items-center justify-center rounded-md bg-[var(--glass-bg-elevated)] px-1.5 py-0.5 text-[9px] font-medium text-fg-muted border border-[var(--glass-border)] backdrop-blur-sm">
            {tokenCount >= 1000 ? `${(tokenCount / 1000).toFixed(1)}k` : tokenCount}
          </div>
        </foreignObject>
      )}
    </>
  )
}

export const StreamingEdgeMemo = memo(StreamingEdgeComponent)
