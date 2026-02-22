import { memo, useMemo } from 'react'
import type { Node as FlowNode } from '@xyflow/react'
import { NODE_WIDTH, NODE_HEIGHT } from '../../utils/layout'

export const TOPIC_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'Architecture': { bg: 'rgba(99, 102, 241, 0.08)', border: 'rgba(99, 102, 241, 0.25)', text: '#6366f1' },
  'Frontend': { bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.25)', text: '#3b82f6' },
  'Backend': { bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.25)', text: '#10b981' },
  'Database': { bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.25)', text: '#f59e0b' },
  'Security': { bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.25)', text: '#ef4444' },
  'Testing': { bg: 'rgba(168, 85, 247, 0.08)', border: 'rgba(168, 85, 247, 0.25)', text: '#a855f7' },
  'DevOps': { bg: 'rgba(236, 72, 153, 0.08)', border: 'rgba(236, 72, 153, 0.25)', text: '#ec4899' },
  'Design': { bg: 'rgba(20, 184, 166, 0.08)', border: 'rgba(20, 184, 166, 0.25)', text: '#14b8a6' },
}

export const TOPIC_NAMES = Object.keys(TOPIC_COLORS)

interface TopicClusterRegion {
  topic: string
  x: number
  y: number
  width: number
  height: number
  nodeCount: number
}

export function computeTopicClusters(
  flowNodes: FlowNode[],
  nodeTopics: Map<string, string>,
): TopicClusterRegion[] {
  const clusters = new Map<string, { minX: number; minY: number; maxX: number; maxY: number; count: number }>()

  for (const node of flowNodes) {
    const topic = nodeTopics.get(node.id)
    if (!topic) continue

    const x = node.position.x
    const y = node.position.y
    const right = x + NODE_WIDTH
    const bottom = y + NODE_HEIGHT

    const existing = clusters.get(topic)
    if (existing) {
      existing.minX = Math.min(existing.minX, x)
      existing.minY = Math.min(existing.minY, y)
      existing.maxX = Math.max(existing.maxX, right)
      existing.maxY = Math.max(existing.maxY, bottom)
      existing.count++
    } else {
      clusters.set(topic, { minX: x, minY: y, maxX: right, maxY: bottom, count: 1 })
    }
  }

  const padding = 20
  const regions: TopicClusterRegion[] = []

  for (const [topic, bounds] of clusters) {
    if (bounds.count < 1) continue
    regions.push({
      topic,
      x: bounds.minX - padding,
      y: bounds.minY - padding - 18,
      width: bounds.maxX - bounds.minX + padding * 2,
      height: bounds.maxY - bounds.minY + padding * 2 + 18,
      nodeCount: bounds.count,
    })
  }

  return regions
}

interface TopicClusterOverlayProps {
  clusters: TopicClusterRegion[]
}

function TopicClusterOverlayComponent({ clusters }: TopicClusterOverlayProps) {
  const regions = useMemo(() => clusters, [clusters])

  if (regions.length === 0) return null

  return (
    <g className="topic-clusters">
      {regions.map((region) => {
        const colors = TOPIC_COLORS[region.topic] ?? {
          bg: 'rgba(120, 120, 130, 0.06)',
          border: 'rgba(120, 120, 130, 0.2)',
          text: '#888',
        }
        return (
          <g key={region.topic}>
            <rect
              x={region.x}
              y={region.y}
              width={region.width}
              height={region.height}
              rx={12}
              ry={12}
              fill={colors.bg}
              stroke={colors.border}
              strokeWidth={1}
              strokeDasharray="6,3"
            />
            <text
              x={region.x + 10}
              y={region.y + 14}
              fontSize={11}
              fontWeight={600}
              fill={colors.text}
              opacity={0.8}
            >
              {region.topic}
            </text>
          </g>
        )
      })}
    </g>
  )
}

export const TopicClusterOverlay = memo(TopicClusterOverlayComponent)

interface TopicLegendProps {
  topics: string[]
}

export function TopicLegend({ topics }: TopicLegendProps) {
  if (topics.length === 0) return null

  return (
    <div className="glass absolute left-3 bottom-3 z-10 flex flex-col gap-1 rounded-lg border border-[var(--glass-border)] p-2 shadow-sm">
      <span className="text-[10px] font-semibold text-fg-muted uppercase tracking-wider mb-0.5">Topics</span>
      {topics.map((topic) => {
        const colors = TOPIC_COLORS[topic]
        return (
          <div key={topic} className="flex items-center gap-1.5">
            <div
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: colors?.text ?? '#888' }}
            />
            <span className="text-[10px] text-fg-secondary">{topic}</span>
          </div>
        )
      })}
    </div>
  )
}
