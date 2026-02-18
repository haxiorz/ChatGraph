import { prisma } from '../prisma.js'
import { AppError } from '../types/index.js'
import { buildPath, pathToMessages } from '../utils/tree.js'
import * as settingsService from './settingsService.js'

export interface ConversationAnalytics {
  summary: string
  decisions: string[]
  openQuestions: string[]
  actionItems: string[]
  healthScore: number
  healthAssessment: string
  branchCount: number
  nodeCount: number
  modelsMentioned: string[]
}

interface TreeNode {
  id: string
  parentId: string | null
  role: 'system' | 'user' | 'assistant'
  content: string
  model: string | null
}

function formatTree(nodes: TreeNode[]): string {
  const childrenMap = new Map<string | null, TreeNode[]>()
  for (const node of nodes) {
    const children = childrenMap.get(node.parentId) ?? []
    children.push(node)
    childrenMap.set(node.parentId, children)
  }

  const lines: string[] = []

  function walk(parentId: string | null, depth: number) {
    const children = childrenMap.get(parentId) ?? []
    for (const child of children) {
      const indent = '  '.repeat(depth)
      const preview = child.content.substring(0, 200).replace(/\n/g, ' ')
      const modelTag = child.model ? ` [${child.model}]` : ''
      lines.push(`${indent}[${child.role}]${modelTag}: ${preview}`)
      walk(child.id, depth + 1)
    }
  }

  walk(null, 0)
  return lines.join('\n')
}

export async function analyzeConversation(params: {
  conversationId: string
  model: string
  targetNodeId?: string
}): Promise<ConversationAnalytics> {
  const { conversationId, model, targetNodeId } = params

  const allNodes = await prisma.node.findMany({
    where: { conversationId },
  })

  if (allNodes.length === 0) {
    throw new AppError('No nodes found', 404, 'NOT_FOUND')
  }

  // Cast to our local TreeNode interface
  const treeNodes: TreeNode[] = allNodes.map((n) => ({
    id: n.id,
    parentId: n.parentId,
    role: n.role as 'system' | 'user' | 'assistant',
    content: n.content,
    model: n.model,
  }))

  // Determine which nodes to analyze
  let nodesToAnalyze: TreeNode[]
  if (targetNodeId) {
    // Active path mode: only nodes from root to target
    nodesToAnalyze = buildPath(treeNodes, targetNodeId) as TreeNode[]
  } else {
    // Full tree mode: all nodes
    nodesToAnalyze = treeNodes
  }

  // Format the conversation tree
  const treeText = targetNodeId
    ? pathToMessages(nodesToAnalyze)
        .map((m) => `[${m.role}]: ${m.content.substring(0, 500)}`)
        .join('\n\n')
    : formatTree(nodesToAnalyze)

  // Compute branch count
  const parentIds = new Set(allNodes.map((n) => n.parentId).filter(Boolean))
  const branchPoints = allNodes.filter((n) => {
    const children = allNodes.filter((c) => c.parentId === n.id)
    return children.length > 1
  })

  // Collect models used
  const models = [...new Set(allNodes.filter((n) => n.model).map((n) => n.model!))]

  const apiKey = await settingsService.get('openrouter_api_key')
  if (!apiKey) {
    throw new AppError('OpenRouter API key not configured', 400, 'NO_API_KEY')
  }

  const systemPrompt = `You are a conversation analyst. Analyze the following conversation and return a JSON object with these exact fields:
{
  "summary": "A 2-3 sentence summary of the conversation",
  "decisions": ["List of key decisions or conclusions reached"],
  "openQuestions": ["Questions that were raised but not answered"],
  "actionItems": ["Action items or next steps mentioned"],
  "healthScore": <number 1-10>,
  "healthAssessment": "Brief assessment of conversation quality/productivity"
}

Rules:
- healthScore: 1=unproductive/circular, 5=average, 10=highly productive
- Return ONLY valid JSON, no markdown fences, no explanation
- Each array should have 0-5 items
- If the conversation is too short for meaningful analysis, still provide your best assessment`

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey as string}`,
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'ChatGraph',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Analyze this conversation (${nodesToAnalyze.length} messages, ${branchPoints.length} branch points):\n\n${treeText}`,
        },
      ],
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new AppError(
      `OpenRouter API error: ${response.status} ${errorBody}`,
      502,
      'OPENROUTER_ERROR',
    )
  }

  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const rawContent = body.choices?.[0]?.message?.content ?? ''

  // Parse JSON from response (handle markdown code fences)
  let jsonStr = rawContent.trim()
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    jsonStr = fenceMatch[1]!.trim()
  }

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(jsonStr) as Record<string, unknown>
  } catch {
    throw new AppError('Failed to parse analytics response', 502, 'PARSE_ERROR')
  }

  return {
    summary: (parsed.summary as string) ?? 'No summary available',
    decisions: Array.isArray(parsed.decisions) ? (parsed.decisions as string[]) : [],
    openQuestions: Array.isArray(parsed.openQuestions) ? (parsed.openQuestions as string[]) : [],
    actionItems: Array.isArray(parsed.actionItems) ? (parsed.actionItems as string[]) : [],
    healthScore: Math.min(10, Math.max(1, Number(parsed.healthScore) || 5)),
    healthAssessment: (parsed.healthAssessment as string) ?? '',
    branchCount: branchPoints.length,
    nodeCount: allNodes.length,
    modelsMentioned: models,
  }
}
