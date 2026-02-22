import type { OpenRouterMessage, OpenRouterContentPart } from '../types/index.js'
import type { Prisma } from '@prisma/client'
import { readFile } from 'fs/promises'
import path from 'path'

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

export async function pathToMessages(pathNodes: TreeNode[]): Promise<OpenRouterMessage[]> {
  const filtered = pathNodes.filter((node) => {
    // Never exclude the system prompt (root) or the latest user message (last in path)
    if (node.role === 'system') return true
    if (node === pathNodes[pathNodes.length - 1]) return true

    const meta = node.metadata as Record<string, unknown> | null
    return meta?.excludeFromContext !== true
  })

  const messages: OpenRouterMessage[] = []

  for (const node of filtered) {
    const meta = node.metadata as Record<string, unknown> | null
    const files = meta?.files as Array<{
      id: string
      name: string
      type: string
      size: number
      category: string
      storagePath: string
      extractedText?: string
    }> | undefined

    if (!files || files.length === 0) {
      messages.push({ role: node.role, content: node.content })
      continue
    }

    // Check for image files that need multimodal content
    const imageFiles = files.filter((f) => f.category === 'image')
    const textFiles = files.filter((f) => f.category !== 'image')

    // Build text content with file extractions
    let textContent = node.content

    for (const f of textFiles) {
      if (f.extractedText) {
        textContent += `\n\n--- File: ${f.name} ---\n${f.extractedText}`
      }
    }

    if (imageFiles.length === 0) {
      messages.push({ role: node.role, content: textContent })
    } else {
      // Multimodal message with images
      const contentParts: OpenRouterContentPart[] = [
        { type: 'text', text: textContent },
      ]

      for (const img of imageFiles) {
        try {
          // Validate storagePath against uploads directory to prevent path traversal
          const filePath = path.resolve(img.storagePath)
          const uploadsDir = path.resolve('uploads')
          if (!filePath.startsWith(uploadsDir + path.sep)) {
            throw new Error('Invalid file path')
          }
          const data = await readFile(filePath)
          const base64 = data.toString('base64')
          const mimeType = img.type || 'image/png'
          contentParts.push({
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64}` },
          })
        } catch {
          // File not found or unreadable — skip
          contentParts.push({
            type: 'text',
            text: `[Image: ${img.name} — file not available]`,
          })
        }
      }

      messages.push({ role: node.role, content: contentParts })
    }
  }

  return messages
}
