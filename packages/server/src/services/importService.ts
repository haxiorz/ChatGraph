import { randomUUID } from 'crypto'
import { prisma } from '../prisma.js'
import { AppError } from '../types/index.js'

interface ChatGraphNode {
  id: string
  parentId: string | null
  role: 'system' | 'user' | 'assistant'
  content: string
  model?: string | null
  metadata?: unknown
  createdAt?: string
}

interface ChatGraphExport {
  format: string
  conversation: {
    title: string
  }
  nodes: ChatGraphNode[]
}

interface ChatGptMapping {
  [key: string]: {
    id: string
    parent?: string | null
    message?: {
      author?: { role?: string }
      content?: { parts?: string[] }
    } | null
  }
}

interface ChatGptExport {
  title?: string
  mapping?: ChatGptMapping
}

export async function importChatGraphJson(data: ChatGraphExport) {
  if (!data.nodes || !Array.isArray(data.nodes)) {
    throw new AppError('Invalid ChatGraph export format', 400, 'INVALID_FORMAT')
  }

  const idMap = new Map<string, string>()
  for (const node of data.nodes) {
    idMap.set(node.id, randomUUID())
  }

  return prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.create({
      data: { title: data.conversation?.title ?? 'Imported Conversation' },
    })

    for (const node of data.nodes) {
      const newId = idMap.get(node.id)!
      const newParentId = node.parentId ? idMap.get(node.parentId) ?? null : null
      await tx.node.create({
        data: {
          id: newId,
          conversationId: conversation.id,
          parentId: newParentId,
          role: node.role,
          content: node.content,
          model: node.model ?? null,
          metadata: node.metadata as never ?? undefined,
        },
      })
    }

    return conversation
  })
}

export async function importChatGptJson(data: ChatGptExport) {
  if (!data.mapping) {
    throw new AppError('Invalid ChatGPT export format', 400, 'INVALID_FORMAT')
  }

  const mapping = data.mapping
  const entries = Object.values(mapping)

  // Map old IDs to new UUIDs
  const idMap = new Map<string, string>()
  for (const entry of entries) {
    idMap.set(entry.id, randomUUID())
  }

  return prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.create({
      data: { title: data.title ?? 'Imported from ChatGPT' },
    })

    for (const entry of entries) {
      const msg = entry.message
      if (!msg || !msg.author?.role || !msg.content?.parts?.length) continue
      const role = msg.author.role
      if (role !== 'system' && role !== 'user' && role !== 'assistant') continue

      const content = msg.content.parts.join('\n')
      if (!content) continue

      const newId = idMap.get(entry.id)!
      const newParentId = entry.parent ? idMap.get(entry.parent) ?? null : null

      await tx.node.create({
        data: {
          id: newId,
          conversationId: conversation.id,
          parentId: newParentId,
          role,
          content,
        },
      })
    }

    return conversation
  })
}

export async function importConversation(data: unknown) {
  const obj = data as Record<string, unknown>
  if (obj.format === 'chatgraph-v1') {
    return importChatGraphJson(obj as unknown as ChatGraphExport)
  }
  if (obj.mapping) {
    return importChatGptJson(obj as unknown as ChatGptExport)
  }
  throw new AppError(
    'Unrecognized import format. Supported: ChatGraph JSON, ChatGPT JSON.',
    400,
    'INVALID_FORMAT',
  )
}
