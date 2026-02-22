import ELK from 'elkjs/lib/elk.bundled.js'
import type { Node as FlowNode, Edge } from '@xyflow/react'
import type { LayoutDirection, LayoutAlgorithm } from '../stores/uiStore'

export const NODE_WIDTH = 200
export const NODE_HEIGHT = 60

const elk = new ELK()

interface LayoutOptions {
  direction?: LayoutDirection
  algorithm?: LayoutAlgorithm
  nodeSizes?: Map<string, { width: number; height: number }>
}

function getElkOptions(
  algorithm: LayoutAlgorithm,
  direction: LayoutDirection,
): Record<string, string> {
  const isHorizontal = direction === 'LR'

  switch (algorithm) {
    case 'layered':
      return {
        'elk.algorithm': 'layered',
        'elk.direction': isHorizontal ? 'RIGHT' : 'DOWN',
        'elk.layered.spacing.nodeNodeBetweenLayers': isHorizontal ? '100' : '80',
        'elk.spacing.nodeNode': isHorizontal ? '30' : '50',
        'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
        'elk.edgeRouting': 'SPLINES',
      }
    case 'mrtree':
      return {
        'elk.algorithm': 'mrtree',
        'elk.direction': isHorizontal ? 'RIGHT' : 'DOWN',
        'elk.spacing.nodeNode': '40',
        'elk.mrtree.weighting': 'CONSTRAINT',
      }
    case 'force':
      return {
        'elk.algorithm': 'force',
        'elk.spacing.nodeNode': '80',
        'elk.force.iterations': '300',
      }
    case 'radial':
      return {
        'elk.algorithm': 'radial',
        'elk.spacing.nodeNode': '60',
        'elk.radial.orderId': 'TREE',
      }
    default:
      return {
        'elk.algorithm': 'layered',
        'elk.direction': isHorizontal ? 'RIGHT' : 'DOWN',
        'elk.spacing.nodeNode': '50',
      }
  }
}

export async function computeLayout(
  nodes: FlowNode[],
  edges: Edge[],
  options?: LayoutOptions,
): Promise<FlowNode[]> {
  if (nodes.length === 0) return nodes

  const direction = options?.direction ?? 'TB'
  const algorithm = options?.algorithm ?? 'layered'
  const nodeSizes = options?.nodeSizes

  const graph = {
    id: 'root',
    layoutOptions: getElkOptions(algorithm, direction),
    children: nodes.map((node) => {
      const size = nodeSizes?.get(node.id)
      return {
        id: node.id,
        width: size?.width ?? NODE_WIDTH,
        height: size?.height ?? NODE_HEIGHT,
      }
    }),
    edges: edges
      .filter((e) => !e.id.startsWith('merge-'))
      .map((edge) => ({
        id: edge.id,
        sources: [edge.source],
        targets: [edge.target],
      })),
  }

  const layout = await elk.layout(graph)

  const positionMap = new Map<string, { x: number; y: number }>()
  for (const child of layout.children ?? []) {
    positionMap.set(child.id, { x: child.x ?? 0, y: child.y ?? 0 })
  }

  return nodes.map((node) => {
    const pos = positionMap.get(node.id)
    return {
      ...node,
      position: pos ?? { x: 0, y: 0 },
    }
  })
}

export function applyFisheye(
  nodes: FlowNode[],
  focusId: string | null,
  magnification: number = 1.8,
  radius: number = 400,
): FlowNode[] {
  if (!focusId || magnification <= 1) return nodes

  const focus = nodes.find((n) => n.id === focusId)
  if (!focus) return nodes

  const fx = focus.position.x + NODE_WIDTH / 2
  const fy = focus.position.y + NODE_HEIGHT / 2

  return nodes.map((node) => {
    if (node.id === focusId) return node

    const nx = node.position.x + NODE_WIDTH / 2
    const ny = node.position.y + NODE_HEIGHT / 2
    const dx = nx - fx
    const dy = ny - fy
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist === 0) return node

    let scaledDist: number
    if (dist <= radius) {
      // Within radius: magnify (push outward from focus)
      scaledDist = dist * magnification
    } else {
      // Outside radius: compress gently
      const overflow = dist - radius
      scaledDist = radius * magnification + overflow * 0.6
    }

    const factor = scaledDist / dist
    return {
      ...node,
      position: {
        x: fx + dx * factor - NODE_WIDTH / 2,
        y: fy + dy * factor - NODE_HEIGHT / 2,
      },
    }
  })
}
