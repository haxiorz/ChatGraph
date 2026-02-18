import type { Prisma } from '@prisma/client'
import { prisma } from '../prisma.js'
import { AppError } from '../types/index.js'
import type { CreateNodeInput } from '../types/index.js'

export async function create(conversationId: string, input: CreateNodeInput) {
  return prisma.node.create({
    data: {
      conversationId,
      parentId: input.parentId,
      role: input.role,
      content: input.content,
      model: input.model ?? null,
    },
  })
}

export async function updateNode(
  id: string,
  input: { content?: string; metadata?: Record<string, unknown> },
) {
  const existing = await prisma.node.findUnique({ where: { id } })
  if (!existing) {
    throw new AppError('Node not found', 404, 'NOT_FOUND')
  }

  const data: Prisma.NodeUpdateInput = {}
  if (input.content !== undefined) {
    data.content = input.content
  }
  if (input.metadata !== undefined) {
    // Merge with existing metadata to preserve fields like usage
    const existingMeta =
      (existing.metadata as Record<string, unknown> | null) ?? {}
    data.metadata = {
      ...existingMeta,
      ...input.metadata,
    } as Prisma.InputJsonValue
  }

  return prisma.node.update({ where: { id }, data })
}

export async function updateContent(id: string, content: string) {
  return updateNode(id, { content })
}

export async function deleteSubtree(id: string) {
  const node = await prisma.node.findUnique({ where: { id } })
  if (!node) {
    throw new AppError('Node not found', 404, 'NOT_FOUND')
  }

  // BFS to find all descendant IDs
  const allNodes = await prisma.node.findMany({
    where: { conversationId: node.conversationId },
    select: { id: true, parentId: true },
  })

  const childrenMap = new Map<string, string[]>()
  for (const n of allNodes) {
    if (n.parentId) {
      const children = childrenMap.get(n.parentId) ?? []
      children.push(n.id)
      childrenMap.set(n.parentId, children)
    }
  }

  const toDelete: string[] = []
  const queue = [id]

  while (queue.length > 0) {
    const current = queue.shift()!
    toDelete.push(current)
    const children = childrenMap.get(current) ?? []
    queue.push(...children)
  }

  // Delete from leaves up (reverse order) to avoid FK constraint issues
  // Or just delete all at once since we're deleting the whole subtree
  await prisma.node.deleteMany({
    where: { id: { in: toDelete } },
  })

  return toDelete.length
}

export async function getByConversation(conversationId: string) {
  return prisma.node.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
  })
}
