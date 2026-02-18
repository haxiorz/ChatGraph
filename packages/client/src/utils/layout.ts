import dagre from 'dagre'
import type { Node as FlowNode, Edge } from '@xyflow/react'
import type { LayoutDirection } from '../stores/uiStore'

export const NODE_WIDTH = 200
export const NODE_HEIGHT = 60

interface LayoutOptions {
  direction?: LayoutDirection
}

export function computeLayout(
  nodes: FlowNode[],
  edges: Edge[],
  options?: LayoutOptions,
): FlowNode[] {
  const direction = options?.direction ?? 'TB'
  const g = new dagre.graphlib.Graph()
  g.setGraph({
    rankdir: direction,
    nodesep: direction === 'LR' ? 30 : 50,
    ranksep: direction === 'LR' ? 100 : 80,
  })
  g.setDefaultEdgeLabel(() => ({}))

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target)
  }

  dagre.layout(g)

  return nodes.map((node) => {
    const pos = g.node(node.id)
    return {
      ...node,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    }
  })
}
