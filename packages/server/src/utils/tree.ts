import type { OpenRouterMessage } from '../types/index.js'
import type { Prisma } from '@prisma/client'

interface TreeNode {
  id: string
  parentId: string | null
  role: 'system' | 'user' | 'assistant'
  content: string
  metadata?: Prisma.JsonValue | null
}

export function buildPath(nodes: TreeNode[], targetNodeId: string): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>()
  for (const node of nodes) {
    nodeMap.set(node.id, node)
  }

  const path: TreeNode[] = []
  let current: TreeNode | undefined = nodeMap.get(targetNodeId)

  while (current) {
    path.unshift(current)
    current = current.parentId ? nodeMap.get(current.parentId) : undefined
  }

  return path
}

export function pathToMessages(path: TreeNode[]): OpenRouterMessage[] {
  return path
    .filter((node) => {
      // Never exclude the system prompt (root) or the latest user message (last in path)
      if (node.role === 'system') return true
      if (node === path[path.length - 1]) return true

      const meta = node.metadata as Record<string, unknown> | null
      return meta?.excludeFromContext !== true
    })
    .map((node) => ({
      role: node.role,
      content: node.content,
    }))
}
