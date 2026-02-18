import { prisma } from '../prisma.js'
import { AppError } from '../types/index.js'

export async function list(page = 1, limit = 50) {
  const skip = (page - 1) * limit
  return prisma.conversation.findMany({
    orderBy: { updatedAt: 'desc' },
    skip,
    take: limit,
    include: {
      nodes: {
        take: 1,
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      },
    },
  })
}

export async function getById(id: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      nodes: {
        orderBy: { createdAt: 'asc' },
        include: {
          mergeParents: true,
        },
      },
    },
  })

  if (!conversation) {
    throw new AppError('Conversation not found', 404, 'NOT_FOUND')
  }

  // Also fetch merge edges for this conversation
  const mergeEdges = await prisma.mergeEdge.findMany({
    where: {
      child: { conversationId: id },
    },
  })

  return { ...conversation, mergeEdges }
}

export async function create(title?: string) {
  return prisma.conversation.create({
    data: { title: title ?? 'New Conversation' },
  })
}

export async function rename(id: string, title: string) {
  try {
    return await prisma.conversation.update({
      where: { id },
      data: { title },
    })
  } catch {
    throw new AppError('Conversation not found', 404, 'NOT_FOUND')
  }
}

export async function remove(id: string) {
  try {
    await prisma.conversation.delete({ where: { id } })
  } catch {
    throw new AppError('Conversation not found', 404, 'NOT_FOUND')
  }
}
