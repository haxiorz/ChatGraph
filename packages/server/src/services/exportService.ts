import { prisma } from '../prisma.js'
import { AppError } from '../types/index.js'
import { buildPath, pathToMessages } from '../utils/tree.js'

export async function exportAsJson(conversationId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { nodes: { orderBy: { createdAt: 'asc' } } },
  })

  if (!conversation) {
    throw new AppError('Conversation not found', 404, 'NOT_FOUND')
  }

  return {
    format: 'chatgraph-v1',
    exportedAt: new Date().toISOString(),
    conversation: {
      title: conversation.title,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    },
    nodes: conversation.nodes.map((n) => ({
      id: n.id,
      parentId: n.parentId,
      role: n.role,
      content: n.content,
      model: n.model,
      metadata: n.metadata,
      createdAt: n.createdAt.toISOString(),
    })),
  }
}

export async function exportAsMarkdown(
  conversationId: string,
  activeNodeId?: string,
) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { nodes: { orderBy: { createdAt: 'asc' } } },
  })

  if (!conversation) {
    throw new AppError('Conversation not found', 404, 'NOT_FOUND')
  }

  let nodesToExport = conversation.nodes

  // If activeNodeId specified, export only the active path
  if (activeNodeId) {
    const path = buildPath(conversation.nodes, activeNodeId)
    const nodeMap = new Map(conversation.nodes.map((n) => [n.id, n]))
    nodesToExport = path.map((p) => nodeMap.get(p.id)!).filter(Boolean)
  }

  const lines: string[] = [
    `# ${conversation.title}`,
    '',
    `*Exported on ${new Date().toISOString()}*`,
    '',
    '---',
    '',
  ]

  for (const node of nodesToExport) {
    if (node.role === 'system') {
      lines.push(`> **System**: ${node.content}`)
      lines.push('')
    } else if (node.role === 'user') {
      lines.push(`**User**:`)
      lines.push('')
      lines.push(node.content)
      lines.push('')
    } else {
      const modelTag = node.model ? ` *(${node.model})*` : ''
      lines.push(`**Assistant**${modelTag}:`)
      lines.push('')
      lines.push(node.content)
      lines.push('')
    }
    lines.push('---')
    lines.push('')
  }

  return lines.join('\n')
}
