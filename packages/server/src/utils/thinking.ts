import { randomUUID } from 'crypto'

interface ThinkingStep {
  id: string
  content: string
  parentStepId: string | null
  depth: number
}

export function parseThinkingSteps(content: string): ThinkingStep[] {
  if (!content || content.trim().length === 0) return []

  const steps: ThinkingStep[] = []
  const lines = content.split('\n')

  // Strategy: detect numbered lists, markdown headers, or paragraph breaks
  let currentParagraph = ''
  let currentDepth = 0
  const depthStack: string[] = [] // stack of parent IDs

  for (const line of lines) {
    const trimmed = line.trim()

    // Markdown header
    const headerMatch = trimmed.match(/^(#{1,4})\s+(.+)/)
    if (headerMatch) {
      // Flush current paragraph
      if (currentParagraph.trim()) {
        const parentId = depthStack.length > 0 ? depthStack[depthStack.length - 1] ?? null : null
        steps.push({
          id: randomUUID(),
          content: currentParagraph.trim(),
          parentStepId: parentId,
          depth: currentDepth,
        })
        currentParagraph = ''
      }

      const headerLevel = (headerMatch[1] ?? '').length - 1 // 0-based
      const headerText = headerMatch[2] ?? ''

      // Adjust depth stack
      while (depthStack.length > headerLevel) depthStack.pop()

      const stepId = randomUUID()
      const parentId = depthStack.length > 0 ? depthStack[depthStack.length - 1] ?? null : null
      currentDepth = depthStack.length

      steps.push({
        id: stepId,
        content: headerText,
        parentStepId: parentId,
        depth: currentDepth,
      })

      depthStack.push(stepId)
      currentDepth = depthStack.length
      continue
    }

    // Numbered list item (1., 2., 2a., etc.)
    const numberedMatch = trimmed.match(/^(\d+[a-z]?)[.)]\s+(.+)/)
    if (numberedMatch) {
      // Flush current paragraph
      if (currentParagraph.trim()) {
        const parentId = depthStack.length > 0 ? depthStack[depthStack.length - 1] ?? null : null
        steps.push({
          id: randomUUID(),
          content: currentParagraph.trim(),
          parentStepId: parentId,
          depth: currentDepth,
        })
        currentParagraph = ''
      }

      const itemText = numberedMatch[2] ?? ''
      const numStr = numberedMatch[1] ?? ''

      // Detect sub-items (2a, 2b, etc.)
      const isSubItem = /\d+[a-z]/.test(numStr)
      const depth = isSubItem ? 1 : 0

      // Adjust depth stack for sub-items
      if (!isSubItem) {
        while (depthStack.length > 0) depthStack.pop()
      }

      const stepId = randomUUID()
      const parentId = depthStack.length > 0 ? depthStack[depthStack.length - 1] ?? null : null

      steps.push({
        id: stepId,
        content: itemText,
        parentStepId: parentId,
        depth,
      })

      if (!isSubItem) {
        depthStack.push(stepId)
      }
      currentDepth = depthStack.length
      continue
    }

    // Bullet point
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)/)
    if (bulletMatch) {
      if (currentParagraph.trim()) {
        const parentId = depthStack.length > 0 ? depthStack[depthStack.length - 1] ?? null : null
        steps.push({
          id: randomUUID(),
          content: currentParagraph.trim(),
          parentStepId: parentId,
          depth: currentDepth,
        })
        currentParagraph = ''
      }

      const parentId = depthStack.length > 0 ? depthStack[depthStack.length - 1] ?? null : null
      steps.push({
        id: randomUUID(),
        content: bulletMatch[1] ?? '',
        parentStepId: parentId,
        depth: Math.max(currentDepth, 1),
      })
      continue
    }

    // Empty line = paragraph break
    if (trimmed === '') {
      if (currentParagraph.trim()) {
        const parentId = depthStack.length > 0 ? depthStack[depthStack.length - 1] ?? null : null
        steps.push({
          id: randomUUID(),
          content: currentParagraph.trim(),
          parentStepId: parentId,
          depth: currentDepth,
        })
        currentParagraph = ''
      }
      continue
    }

    // Regular text — accumulate into paragraph
    currentParagraph += (currentParagraph ? ' ' : '') + trimmed
  }

  // Flush remaining paragraph
  if (currentParagraph.trim()) {
    const parentId = depthStack.length > 0 ? depthStack[depthStack.length - 1] ?? null : null
    steps.push({
      id: randomUUID(),
      content: currentParagraph.trim(),
      parentStepId: parentId,
      depth: currentDepth,
    })
  }

  // If we got no structured steps, create one step per paragraph
  if (steps.length === 0 && content.trim()) {
    const paragraphs = content.split(/\n\n+/).filter((p) => p.trim())
    for (const p of paragraphs) {
      steps.push({
        id: randomUUID(),
        content: p.trim(),
        parentStepId: null,
        depth: 0,
      })
    }
  }

  return steps
}
