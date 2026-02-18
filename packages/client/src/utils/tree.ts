import type { ConversationNode } from '../types/index'

export function buildPath(
  nodes: Map<string, ConversationNode>,
  targetNodeId: string,
): ConversationNode[] {
  const path: ConversationNode[] = []
  let current = nodes.get(targetNodeId)

  while (current) {
    path.unshift(current)
    current = current.parentId ? nodes.get(current.parentId) : undefined
  }

  return path
}

export function getChildren(
  nodes: Map<string, ConversationNode>,
  parentId: string,
): ConversationNode[] {
  const children: ConversationNode[] = []
  for (const node of nodes.values()) {
    if (node.parentId === parentId) {
      children.push(node)
    }
  }
  return children.sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
}

export function getRootNodes(
  nodes: Map<string, ConversationNode>,
): ConversationNode[] {
  const roots: ConversationNode[] = []
  for (const node of nodes.values()) {
    if (node.parentId === null) {
      roots.push(node)
    }
  }
  return roots
}

export function getSiblings(
  nodes: Map<string, ConversationNode>,
  nodeId: string,
): ConversationNode[] {
  const node = nodes.get(nodeId)
  if (!node) return []

  const siblings: ConversationNode[] = []
  for (const n of nodes.values()) {
    if (n.parentId === node.parentId && n.role === node.role) {
      siblings.push(n)
    }
  }
  return siblings.sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
}

export function getDeepestLeaf(
  nodes: Map<string, ConversationNode>,
  startId: string,
): string {
  let currentId = startId
  while (true) {
    const children = getChildren(nodes, currentId)
    if (children.length === 0) return currentId
    currentId = children[children.length - 1]!.id
  }
}
