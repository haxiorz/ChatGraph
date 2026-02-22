import type { Response } from 'express'
import type { Prisma } from '@prisma/client'
import { prisma } from '../prisma.js'
import { AppError } from '../types/index.js'
import { buildPath, pathToMessages } from '../utils/tree.js'
import { parseThinkingSteps } from '../utils/thinking.js'
import * as settingsService from './settingsService.js'

async function generateTitle(
  userMessage: string,
  assistantReply: string,
  apiKey: string,
): Promise<string> {
  const fallback =
    userMessage.length > 60 ? userMessage.substring(0, 57) + '...' : userMessage

  try {
    const response = await Promise.race([
      fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'ChatGraph',
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'Generate a concise 3-7 word title for this conversation. Start the title with a single relevant emoji that represents the topic. Return ONLY the emoji followed by the title, no quotes or extra punctuation. Examples: "🐍 Python Snake Game Tutorial", "📊 Sales Data Analysis", "🔧 Fix Login Authentication Bug".',
            },
            {
              role: 'user',
              content: `User: ${userMessage.substring(0, 500)}\n\nAssistant: ${assistantReply.substring(0, 500)}`,
            },
          ],
          max_tokens: 30,
          temperature: 0.7,
        }),
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 5000),
      ),
    ])

    if (!response.ok) return fallback

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const title = data.choices?.[0]?.message?.content?.trim()
    return title && title.length > 0 && title.length <= 100
      ? title
      : fallback
  } catch {
    return fallback
  }
}

const ENHANCE_MODEL = 'google/gemini-3-flash-preview'

const ENHANCE_SYSTEM_PROMPT = `You are an expert prompt engineer. Your job is to rewrite the user's draft prompt so it produces the best possible response from a large language model. Apply the following techniques proportionally — simple prompts get light touch-ups, complex prompts get the full treatment.

<techniques>

1. BE CLEAR, DIRECT, AND DETAILED
- Replace vague or ambiguous language with specific, concrete instructions.
- State exactly what output is wanted: format, length, style, structure, audience.
- Add context the LLM needs: what the result will be used for, who the audience is, what workflow it belongs to, and what a successful response looks like.
- Give instructions as sequential numbered steps when the task has multiple parts.
- Explain WHY a constraint matters when relevant (e.g., "Use plain language because the audience is non-technical" rather than just "Use plain language"). The model generalizes better from motivations than bare rules.

2. USE XML TAGS FOR STRUCTURE
- When the prompt has distinct components (context, instructions, data, output format), separate them with descriptive XML tags such as <instructions>, <context>, <data>, <constraints>, <output_format>.
- Use consistent, descriptive tag names and reference them in the instructions (e.g., "Using the data in <data> tags, ...").
- Nest tags for hierarchical content.
- If the prompt includes input data, wrap it in tags to clearly separate it from instructions.

3. SPECIFY OUTPUT FORMAT
- If the prompt lacks an explicit output format, add one (e.g., "Return your answer as a markdown table", "Respond with a JSON object matching this schema: ...", "Write 3 bullet points").
- When requesting structured output, describe the exact schema or give a formatting example in <formatting_example> tags.

4. POSITIVE FRAMING
- Convert negative instructions ("don't do X", "never Y") into positive ones ("do Z instead"). Tell the model what TO do rather than what NOT to do.
- Example: Instead of "Don't use jargon" → "Use plain language accessible to a general audience."

5. CHAIN OF THOUGHT FOR COMPLEX TASKS
- For tasks involving analysis, math, logic, multi-step reasoning, or decisions with many factors, add an instruction to think step-by-step before giving the final answer.
- Use structured CoT: instruct the model to put its reasoning in <thinking> tags and its final answer in <answer> tags, so the reasoning is separated from the output.
- Only add CoT when the task genuinely benefits from it. Do not add it to simple factual questions.

6. ROLE ASSIGNMENT
- When the task would benefit from domain expertise, add a specific role at the start (e.g., "You are a senior backend engineer specializing in distributed systems" rather than just "You are a programmer").
- Make the role specific: include domain, seniority level, and relevant specialization.
- Only add a role when it meaningfully improves the response; do not add generic roles to simple questions.

7. TASK DECOMPOSITION
- If the prompt asks for a complex multi-part task, break it into clearly numbered subtasks, each with a single objective.
- Order subtasks logically so each builds on the previous.

8. LONG CONTEXT HANDLING
- If the prompt includes long input data (documents, code, etc.), place the data ABOVE the instructions/query and the query at the end. This ordering improves response quality.
- For multiple documents, wrap each in <document> tags with source metadata.
- When asking about long content, instruct the model to first find and quote relevant passages before answering to ground the response.

</techniques>

<rules>
- Preserve the user's original intent and meaning exactly. Never change what they are asking for.
- Do NOT add few-shot examples to the prompt.
- Do NOT make simple, short prompts unnecessarily verbose. "What is 2+2?" should stay simple. A one-line factual question needs at most minor clarification, not XML tags and CoT.
- Scale enhancement proportionally to complexity: simple prompts get light clarity improvements; complex multi-part prompts get full structural treatment with XML tags, CoT, output format, and role.
- Return ONLY the enhanced prompt text. No preamble, no explanation, no commentary, no meta-discussion.
- If the prompt is already well-structured, make only minimal improvements or return it nearly unchanged.
- Do NOT wrap the entire output in a code block or markdown quotes.
- Do NOT add instructions that contradict or override what the user wrote.
</rules>`

export async function enhancePrompt(
  content: string,
  apiKey: string,
): Promise<string> {
  try {
    const response = await Promise.race([
      fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'ChatGraph',
        },
        body: JSON.stringify({
          model: ENHANCE_MODEL,
          messages: [
            { role: 'system', content: ENHANCE_SYSTEM_PROMPT },
            { role: 'user', content },
          ],
          max_tokens: 2048,
          temperature: 0.4,
        }),
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 15000),
      ),
    ])

    if (!response.ok) return content

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const enhanced = data.choices?.[0]?.message?.content?.trim()
    return enhanced && enhanced.length > 0 ? enhanced : content
  } catch {
    return content
  }
}

interface UsageData {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
  [key: string]: unknown
}

interface ThinkingInput {
  level: 'fast' | 'thinking' | 'deep'
  budgetTokens?: number
}

function buildThinkingParams(model: string, thinking?: ThinkingInput): Record<string, unknown> {
  if (!thinking || thinking.level === 'fast') return {}

  // Claude models: use thinking parameter
  if (model.includes('claude')) {
    const budgetTokens = thinking.level === 'deep' ? 32000 : 10000
    return {
      thinking: {
        type: 'enabled',
        budget_tokens: thinking.budgetTokens ?? budgetTokens,
      },
    }
  }

  // OpenAI o-series: use reasoning_effort
  if (model.includes('openai/o')) {
    return {
      reasoning_effort: thinking.level === 'deep' ? 'high' : 'medium',
    }
  }

  // DeepSeek reasoning models
  if (model.includes('deepseek') && model.includes('reasoner')) {
    return {} // DeepSeek reasoner models auto-include reasoning
  }

  // Other models: no-op
  return {}
}

interface ToolCallDelta {
  index: number
  id?: string
  function?: { name?: string; arguments?: string }
}

export async function suggestTitles(
  conversationId: string,
): Promise<string[]> {
  const nodes = await prisma.node.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  if (nodes.length === 0) return []

  const apiKey = await settingsService.get('openrouter_api_key')
  if (!apiKey) return []

  const snippet = nodes
    .reverse()
    .map((n) => `[${n.role}]: ${n.content.substring(0, 200)}`)
    .join('\n')

  try {
    const response = await Promise.race([
      fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey as string}`,
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'ChatGraph',
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'Generate exactly 3 concise 3-7 word title suggestions for this conversation. ' +
                'Each title MUST start with a single relevant emoji. ' +
                'Return a JSON array of 3 strings, nothing else. ' +
                'Example: ["🐍 Python Snake Game Tutorial","📊 Sales Data Analysis","🔧 Fix Login Bug"]',
            },
            {
              role: 'user',
              content: snippet,
            },
          ],
          max_tokens: 150,
          temperature: 0.8,
        }),
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 8000),
      ),
    ])

    if (!response.ok) return []

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const raw = data.choices?.[0]?.message?.content?.trim() ?? ''
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed) && parsed.every((s) => typeof s === 'string')) {
      return (parsed as string[]).slice(0, 3)
    }
    return []
  } catch {
    return []
  }
}

interface RegenerateParams {
  conversationId: string
  assistantNodeId: string
  model: string
  temperature?: number
}

export async function streamRegeneration(
  params: RegenerateParams,
  res: Response,
  signal: AbortSignal,
) {
  const { conversationId, assistantNodeId, model, temperature } = params

  const allNodes = await prisma.node.findMany({
    where: { conversationId },
  })

  // Find the original assistant node
  const assistantNode = allNodes.find((n) => n.id === assistantNodeId)
  if (!assistantNode || assistantNode.role !== 'assistant') {
    throw new AppError('Assistant node not found', 404, 'NOT_FOUND')
  }

  // The parent is the user node
  const userNodeId = assistantNode.parentId
  if (!userNodeId) {
    throw new AppError('User node not found', 404, 'NOT_FOUND')
  }

  // Build the path up to the user node to get the message history
  const path = buildPath(allNodes, userNodeId)
  const messages = await pathToMessages(path)

  const apiKey = await settingsService.get('openrouter_api_key')
  if (!apiKey) {
    res.write(
      `event: error\ndata: ${JSON.stringify({ message: 'OpenRouter API key not configured. Please set it in Settings.' })}\n\n`,
    )
    res.end()
    return
  }

  let accumulated = ''
  let usage: UsageData | null = null

  try {
    const openRouterResponse = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey as string}`,
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'ChatGraph',
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          ...(temperature != null && { temperature }),
        }),
        signal,
      },
    )

    if (!openRouterResponse.ok) {
      const errorBody = await openRouterResponse.text()
      res.write(
        `event: error\ndata: ${JSON.stringify({ message: `OpenRouter API error: ${openRouterResponse.status} ${errorBody}` })}\n\n`,
      )
      res.end()
      return
    }

    const reader = openRouterResponse.body?.getReader()
    if (!reader) {
      res.write(
        `event: error\ndata: ${JSON.stringify({ message: 'No response body from OpenRouter' })}\n\n`,
      )
      res.end()
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue
        const data = trimmed.slice(6)
        if (data === '[DONE]') continue

        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string } }>
            usage?: UsageData
          }
          const token = parsed.choices?.[0]?.delta?.content
          if (token) {
            accumulated += token
            res.write(
              `event: token\ndata: ${JSON.stringify({ content: token })}\n\n`,
            )
          }
          if (parsed.usage) {
            usage = parsed.usage
          }
        } catch {
          // Skip malformed chunks
        }
      }
    }

    // Save new assistant node as sibling (same parentId = user node)
    const newAssistantNode = await prisma.node.create({
      data: {
        conversationId,
        parentId: userNodeId,
        role: 'assistant',
        content: accumulated,
        model,
        metadata: (usage ? { usage } : undefined) as Prisma.InputJsonValue | undefined,
      },
    })

    res.write(
      `event: done\ndata: ${JSON.stringify({ node: newAssistantNode })}\n\n`,
    )
    res.end()
  } catch (error) {
    if (signal.aborted) {
      if (accumulated.length > 0) {
        await prisma.node.create({
          data: {
            conversationId,
            parentId: userNodeId,
            role: 'assistant',
            content: accumulated,
            model,
            metadata: { partial: true, ...(usage ? { usage } : {}) } as Prisma.InputJsonValue,
          },
        })
      }
      return
    }

    const message =
      error instanceof Error ? error.message : 'Unknown error during streaming'
    res.write(
      `event: error\ndata: ${JSON.stringify({ message })}\n\n`,
    )
    res.end()
  }
}

interface CompleteParams {
  conversationId: string
  parentNodeId: string
  content: string
  model: string
  temperature?: number
  thinking?: ThinkingInput
  routingInfo?: { tier: string; reason: string; originalModel: string }
  files?: Array<{ id: string; name: string; type: string; size: number; category: string; storagePath: string; extractedText?: string }>
}

export async function streamCompletion(
  params: CompleteParams,
  res: Response,
  signal: AbortSignal,
) {
  const { conversationId, parentNodeId, content, model, temperature, thinking, routingInfo, files } = params
  console.log(`[completion] Starting: conv=${conversationId} model=${model} content="${content.substring(0, 50)}..."`)

  // Get all nodes for this conversation
  const allNodes = await prisma.node.findMany({
    where: { conversationId },
  })
  console.log(`[completion] Found ${allNodes.length} existing nodes`)

  // Verify parent exists
  const parentExists = allNodes.some((n) => n.id === parentNodeId)
  if (!parentExists) {
    throw new AppError('Parent node not found', 404, 'NOT_FOUND')
  }

  // Create user node (with optional file metadata)
  const userNodeMetadata: Record<string, unknown> = {}
  if (files && files.length > 0) {
    userNodeMetadata.files = files
  }

  const userNode = await prisma.node.create({
    data: {
      conversationId,
      parentId: parentNodeId,
      role: 'user',
      content,
      ...(Object.keys(userNodeMetadata).length > 0
        ? { metadata: userNodeMetadata as Prisma.InputJsonValue }
        : {}),
    },
  })

  // Send user node event
  res.write(`event: userNode\ndata: ${JSON.stringify(userNode)}\n\n`)

  // Build message path including the new user message
  const updatedNodes = [...allNodes, userNode]
  const path = buildPath(updatedNodes, userNode.id)
  const messages = await pathToMessages(path)

  // Get API key from settings
  const apiKey = await settingsService.get('openrouter_api_key')
  if (!apiKey) {
    console.log('[completion] ERROR: No API key configured')
    res.write(
      `event: error\ndata: ${JSON.stringify({ message: 'OpenRouter API key not configured. Please set it in Settings.' })}\n\n`,
    )
    res.end()
    return
  }

  console.log(`[completion] Sending ${messages.length} messages to OpenRouter (model=${model})`)

  let accumulated = ''
  let accumulatedThinking = ''
  let usage: UsageData | null = null
  const agentSteps: Array<{ id: string; type: string; name: string; input?: string; output?: string; status: string; startedAt?: string; completedAt?: string; duration?: number }> = []

  // Build thinking params
  const thinkingParams = buildThinkingParams(model, thinking)

  try {
    const openRouterResponse = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey as string}`,
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'ChatGraph',
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          ...(temperature != null && { temperature }),
          ...thinkingParams,
        }),
        signal,
      },
    )

    console.log(`[completion] OpenRouter responded: ${openRouterResponse.status}`)

    if (!openRouterResponse.ok) {
      const errorBody = await openRouterResponse.text()
      console.log(`[completion] OpenRouter error: ${errorBody}`)
      res.write(
        `event: error\ndata: ${JSON.stringify({ message: `OpenRouter API error: ${openRouterResponse.status} ${errorBody}` })}\n\n`,
      )
      res.end()
      return
    }

    const reader = openRouterResponse.body?.getReader()
    if (!reader) {
      console.log('[completion] ERROR: No response body from OpenRouter')
      res.write(
        `event: error\ndata: ${JSON.stringify({ message: 'No response body from OpenRouter' })}\n\n`,
      )
      res.end()
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''

    // Tool call buffering
    const toolCallBuffers = new Map<number, { id: string; name: string; arguments: string }>()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue
        const data = trimmed.slice(6)
        if (data === '[DONE]') continue

        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{
              delta?: {
                content?: string
                reasoning_content?: string
                tool_calls?: ToolCallDelta[]
              }
            }>
            usage?: UsageData
          }

          const delta = parsed.choices?.[0]?.delta

          // Regular content token
          const token = delta?.content
          if (token) {
            accumulated += token
            res.write(
              `event: token\ndata: ${JSON.stringify({ content: token })}\n\n`,
            )
          }

          // Reasoning/thinking content
          const reasoningToken = delta?.reasoning_content
          if (reasoningToken) {
            accumulatedThinking += reasoningToken
            res.write(
              `event: thinking\ndata: ${JSON.stringify({ content: reasoningToken })}\n\n`,
            )
          }

          // Tool calls
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index
              if (!toolCallBuffers.has(idx)) {
                toolCallBuffers.set(idx, { id: tc.id ?? `tool-${idx}`, name: '', arguments: '' })
              }
              const buf = toolCallBuffers.get(idx)!
              if (tc.id) buf.id = tc.id
              if (tc.function?.name) {
                buf.name += tc.function.name
                res.write(
                  `event: toolCallStart\ndata: ${JSON.stringify({ stepId: buf.id, name: buf.name, arguments: '' })}\n\n`,
                )
                agentSteps.push({
                  id: buf.id,
                  type: 'tool_call',
                  name: buf.name,
                  input: '',
                  status: 'running',
                  startedAt: new Date().toISOString(),
                })
              }
              if (tc.function?.arguments) {
                buf.arguments += tc.function.arguments
              }
            }
          }

          if (parsed.usage) {
            usage = parsed.usage
          }
        } catch {
          // Skip malformed chunks
        }
      }
    }

    // Finalize tool call buffers
    for (const [, buf] of toolCallBuffers) {
      const step = agentSteps.find((s) => s.id === buf.id)
      if (step) {
        step.input = buf.arguments
        step.status = 'completed'
        step.completedAt = new Date().toISOString()
      }
      res.write(
        `event: toolCallEnd\ndata: ${JSON.stringify({ stepId: buf.id, result: buf.arguments })}\n\n`,
      )
    }

    console.log(`[completion] Stream complete, accumulated ${accumulated.length} chars, thinking ${accumulatedThinking.length} chars`)

    // Build metadata
    const metadata: Record<string, unknown> = {}
    if (usage) metadata.usage = usage
    if (accumulatedThinking) {
      const thinkingSteps = parseThinkingSteps(accumulatedThinking)
      metadata.thinking = {
        level: thinking?.level ?? 'fast',
        content: accumulatedThinking,
        steps: thinkingSteps,
      }
    }
    if (routingInfo) metadata.routingInfo = routingInfo
    if (agentSteps.length > 0) metadata.agentSteps = agentSteps

    // Save assistant node
    const assistantNode = await prisma.node.create({
      data: {
        conversationId,
        parentId: userNode.id,
        role: 'assistant',
        content: accumulated,
        model,
        metadata: (Object.keys(metadata).length > 0 ? metadata : undefined) as Prisma.InputJsonValue | undefined,
      },
    })

    // Auto-title the conversation if it's the first exchange
    if (allNodes.length <= 1) {
      const title = await generateTitle(content, accumulated, apiKey as string)
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { title },
      })
      res.write(
        `event: title\ndata: ${JSON.stringify({ title })}\n\n`,
      )
    }

    console.log(`[completion] Done, saved assistant node ${assistantNode.id}`)
    res.write(
      `event: done\ndata: ${JSON.stringify({ node: assistantNode })}\n\n`,
    )
    res.end()
  } catch (error) {
    console.error('[completion] Error:', error)
    if (signal.aborted) {
      // Client disconnected — save partial content
      if (accumulated.length > 0) {
        const partialMeta: Record<string, unknown> = { partial: true }
        if (usage) partialMeta.usage = usage
        if (accumulatedThinking) partialMeta.thinking = { content: accumulatedThinking }
        if (agentSteps.length > 0) partialMeta.agentSteps = agentSteps
        await prisma.node.create({
          data: {
            conversationId,
            parentId: userNode.id,
            role: 'assistant',
            content: accumulated,
            model,
            metadata: partialMeta as Prisma.InputJsonValue,
          },
        })
      }
      return
    }

    const message =
      error instanceof Error ? error.message : 'Unknown error during streaming'
    res.write(
      `event: error\ndata: ${JSON.stringify({ message })}\n\n`,
    )
    res.end()
  }
}

interface SummarizeParams {
  conversationId: string
  nodeId: string
  model: string
  temperature?: number
}

export async function streamSummarization(
  params: SummarizeParams,
  res: Response,
  signal: AbortSignal,
) {
  const { conversationId, nodeId, model, temperature } = params

  const allNodes = await prisma.node.findMany({
    where: { conversationId },
  })

  const targetNode = allNodes.find((n) => n.id === nodeId)
  if (!targetNode) {
    throw new AppError('Node not found', 404, 'NOT_FOUND')
  }

  // Build path from root to this node
  const path = buildPath(allNodes, nodeId)
  if (path.length <= 1) {
    throw new AppError('Nothing to summarize', 400, 'VALIDATION_ERROR')
  }

  const summarizedNodeIds = path.map((n) => n.id)
  const messages = await pathToMessages(path)
  const messageCount = messages.length

  // Build summarization prompt
  const summarizationMessages = [
    {
      role: 'system' as const,
      content:
        'You are a conversation summarizer. Produce a concise summary of the conversation above. ' +
        'Preserve key decisions, facts, code snippets, and action items. ' +
        'Use bullet points for clarity. Be thorough but concise.',
    },
    ...messages,
    {
      role: 'user' as const,
      content: `Please provide a concise summary of the entire conversation above (${messageCount} messages). Focus on key points, decisions, and outcomes.`,
    },
  ]

  const apiKey = await settingsService.get('openrouter_api_key')
  if (!apiKey) {
    res.write(
      `event: error\ndata: ${JSON.stringify({ message: 'OpenRouter API key not configured. Please set it in Settings.' })}\n\n`,
    )
    res.end()
    return
  }

  let accumulated = ''
  let usage: UsageData | null = null

  try {
    const openRouterResponse = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey as string}`,
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'ChatGraph',
        },
        body: JSON.stringify({
          model,
          messages: summarizationMessages,
          stream: true,
          ...(temperature != null && { temperature }),
        }),
        signal,
      },
    )

    if (!openRouterResponse.ok) {
      const errorBody = await openRouterResponse.text()
      res.write(
        `event: error\ndata: ${JSON.stringify({ message: `OpenRouter API error: ${openRouterResponse.status} ${errorBody}` })}\n\n`,
      )
      res.end()
      return
    }

    const reader = openRouterResponse.body?.getReader()
    if (!reader) {
      res.write(
        `event: error\ndata: ${JSON.stringify({ message: 'No response body from OpenRouter' })}\n\n`,
      )
      res.end()
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue
        const data = trimmed.slice(6)
        if (data === '[DONE]') continue

        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string } }>
            usage?: UsageData
          }
          const token = parsed.choices?.[0]?.delta?.content
          if (token) {
            accumulated += token
            res.write(
              `event: token\ndata: ${JSON.stringify({ content: token })}\n\n`,
            )
          }
          if (parsed.usage) {
            usage = parsed.usage
          }
        } catch {
          // Skip malformed chunks
        }
      }
    }

    // Save summary node as child of the target node
    const summaryNode = await prisma.node.create({
      data: {
        conversationId,
        parentId: nodeId,
        role: 'assistant',
        content: accumulated,
        model,
        metadata: {
          isSummary: true,
          summarizedMessageCount: messageCount,
          summarizedNodeIds,
          ...(usage ? { usage } : {}),
        } as Prisma.InputJsonValue,
      },
    })

    res.write(
      `event: done\ndata: ${JSON.stringify({ node: summaryNode })}\n\n`,
    )
    res.end()
  } catch (error) {
    if (signal.aborted) {
      if (accumulated.length > 0) {
        await prisma.node.create({
          data: {
            conversationId,
            parentId: nodeId,
            role: 'assistant',
            content: accumulated,
            model,
            metadata: {
              partial: true,
              isSummary: true,
              summarizedMessageCount: messageCount,
              summarizedNodeIds,
              ...(usage ? { usage } : {}),
            } as Prisma.InputJsonValue,
          },
        })
      }
      return
    }

    const message =
      error instanceof Error ? error.message : 'Unknown error during streaming'
    res.write(
      `event: error\ndata: ${JSON.stringify({ message })}\n\n`,
    )
    res.end()
  }
}

interface TournamentParams {
  conversationId: string
  parentNodeId: string
  content: string
  models: string[]
  temperature?: number
}

export async function streamTournament(
  params: TournamentParams,
  res: Response,
  signal: AbortSignal,
) {
  const { conversationId, parentNodeId, content, models, temperature } = params
  console.log(
    `[tournament] Starting: conv=${conversationId} models=${models.join(',')} content="${content.substring(0, 50)}..."`,
  )

  const allNodes = await prisma.node.findMany({
    where: { conversationId },
  })

  const parentExists = allNodes.some((n) => n.id === parentNodeId)
  if (!parentExists) {
    throw new AppError('Parent node not found', 404, 'NOT_FOUND')
  }

  // Create ONE user node
  const userNode = await prisma.node.create({
    data: {
      conversationId,
      parentId: parentNodeId,
      role: 'user',
      content,
      metadata: { isTournament: true } as Prisma.InputJsonValue,
    },
  })

  res.write(`event: userNode\ndata: ${JSON.stringify(userNode)}\n\n`)
  res.write(
    `event: tournamentStart\ndata: ${JSON.stringify({ models, userNodeId: userNode.id })}\n\n`,
  )

  // Build message path once
  const updatedNodes = [...allNodes, userNode]
  const path = buildPath(updatedNodes, userNode.id)
  const messages = await pathToMessages(path)

  const apiKey = await settingsService.get('openrouter_api_key')
  if (!apiKey) {
    res.write(
      `event: error\ndata: ${JSON.stringify({ message: 'OpenRouter API key not configured. Please set it in Settings.' })}\n\n`,
    )
    res.end()
    return
  }

  // Launch parallel streams
  const streamPromises = models.map(async (model, modelIndex) => {
    let accumulated = ''
    let usage: UsageData | null = null
    const startTime = Date.now()
    let firstTokenTime: number | null = null

    try {
      const openRouterResponse = await fetch(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey as string}`,
            'HTTP-Referer': 'http://localhost:5173',
            'X-Title': 'ChatGraph',
          },
          body: JSON.stringify({
            model,
            messages,
            stream: true,
            ...(temperature != null && { temperature }),
          }),
          signal,
        },
      )

      if (!openRouterResponse.ok) {
        const errorBody = await openRouterResponse.text()
        res.write(
          `event: modelError\ndata: ${JSON.stringify({ modelIndex, message: `${model}: ${openRouterResponse.status} ${errorBody}` })}\n\n`,
        )
        return
      }

      const reader = openRouterResponse.body?.getReader()
      if (!reader) {
        res.write(
          `event: modelError\ndata: ${JSON.stringify({ modelIndex, message: `${model}: No response body` })}\n\n`,
        )
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue
          const data = trimmed.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data) as {
              choices?: Array<{ delta?: { content?: string } }>
              usage?: UsageData
            }
            const token = parsed.choices?.[0]?.delta?.content
            if (token) {
              if (firstTokenTime === null) firstTokenTime = Date.now()
              accumulated += token
              res.write(
                `event: token\ndata: ${JSON.stringify({ modelIndex, content: token })}\n\n`,
              )
            }
            if (parsed.usage) {
              usage = parsed.usage
            }
          } catch {
            // Skip malformed chunks
          }
        }
      }

      const totalDuration = Date.now() - startTime
      const ttft = firstTokenTime ? firstTokenTime - startTime : totalDuration

      // Save assistant node as sibling (all share parentId = userNode.id)
      const assistantNode = await prisma.node.create({
        data: {
          conversationId,
          parentId: userNode.id,
          role: 'assistant',
          content: accumulated,
          model,
          metadata: {
            isTournament: true,
            ...(usage ? { usage } : {}),
          } as Prisma.InputJsonValue,
        },
      })

      res.write(
        `event: modelDone\ndata: ${JSON.stringify({ modelIndex, node: assistantNode, timing: { ttft, totalDuration } })}\n\n`,
      )
    } catch (error) {
      if (signal.aborted) return
      const message =
        error instanceof Error ? error.message : 'Unknown error'
      res.write(
        `event: modelError\ndata: ${JSON.stringify({ modelIndex, message: `${model}: ${message}` })}\n\n`,
      )
    }
  })

  await Promise.allSettled(streamPromises)

  // Auto-title if first exchange
  if (allNodes.length <= 1) {
    const title = await generateTitle(content, '(tournament)', apiKey as string)
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { title },
    })
    res.write(
      `event: title\ndata: ${JSON.stringify({ title })}\n\n`,
    )
  }

  res.write(`event: tournamentDone\ndata: ${JSON.stringify({})}\n\n`)
  res.end()
}

interface MergeParams {
  conversationId: string
  leftNodeId: string
  rightNodeId: string
  mergePrompt: string
  model: string
  temperature?: number
}

export async function streamMerge(
  params: MergeParams,
  res: Response,
  signal: AbortSignal,
) {
  const { conversationId, leftNodeId, rightNodeId, mergePrompt, model, temperature } = params

  const allNodes = await prisma.node.findMany({
    where: { conversationId },
  })

  const leftPath = buildPath(allNodes, leftNodeId)
  const rightPath = buildPath(allNodes, rightNodeId)

  // Find common ancestor
  const leftIds = new Set(leftPath.map((n) => n.id))
  let commonAncestorIdx = -1
  for (let i = rightPath.length - 1; i >= 0; i--) {
    if (leftIds.has(rightPath[i]!.id)) {
      commonAncestorIdx = i
      break
    }
  }

  // Build merged message context
  const sharedPrefix = rightPath.slice(0, commonAncestorIdx + 1)
  const leftUnique = leftPath.slice(
    leftPath.findIndex((n) => n.id === sharedPrefix[sharedPrefix.length - 1]?.id) + 1,
  )
  const rightUnique = rightPath.slice(commonAncestorIdx + 1)

  const messages = await pathToMessages(sharedPrefix)
  if (leftUnique.length > 0) {
    messages.push({
      role: 'user',
      content: `--- Branch A ---\n${leftUnique.map((n) => `[${n.role}]: ${n.content}`).join('\n')}`,
    })
  }
  if (rightUnique.length > 0) {
    messages.push({
      role: 'user',
      content: `--- Branch B ---\n${rightUnique.map((n) => `[${n.role}]: ${n.content}`).join('\n')}`,
    })
  }
  messages.push({ role: 'user', content: mergePrompt })

  // Create merge user node as child of leftNode
  const mergeUserNode = await prisma.node.create({
    data: {
      conversationId,
      parentId: leftNodeId,
      role: 'user',
      content: mergePrompt,
      metadata: { isMergeNode: true },
    },
  })

  res.write(`event: userNode\ndata: ${JSON.stringify(mergeUserNode)}\n\n`)

  const apiKey = await settingsService.get('openrouter_api_key')
  if (!apiKey) {
    res.write(
      `event: error\ndata: ${JSON.stringify({ message: 'OpenRouter API key not configured.' })}\n\n`,
    )
    res.end()
    return
  }

  let accumulated = ''
  let usage: UsageData | null = null

  try {
    const openRouterResponse = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey as string}`,
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'ChatGraph',
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          ...(temperature != null && { temperature }),
        }),
        signal,
      },
    )

    if (!openRouterResponse.ok) {
      const errorBody = await openRouterResponse.text()
      res.write(
        `event: error\ndata: ${JSON.stringify({ message: `OpenRouter API error: ${openRouterResponse.status} ${errorBody}` })}\n\n`,
      )
      res.end()
      return
    }

    const reader = openRouterResponse.body?.getReader()
    if (!reader) {
      res.write(
        `event: error\ndata: ${JSON.stringify({ message: 'No response body from OpenRouter' })}\n\n`,
      )
      res.end()
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue
        const data = trimmed.slice(6)
        if (data === '[DONE]') continue

        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string } }>
            usage?: UsageData
          }
          const token = parsed.choices?.[0]?.delta?.content
          if (token) {
            accumulated += token
            res.write(
              `event: token\ndata: ${JSON.stringify({ content: token })}\n\n`,
            )
          }
          if (parsed.usage) {
            usage = parsed.usage
          }
        } catch {
          // Skip malformed chunks
        }
      }
    }

    const assistantNode = await prisma.node.create({
      data: {
        conversationId,
        parentId: mergeUserNode.id,
        role: 'assistant',
        content: accumulated,
        model,
        metadata: { isMergeNode: true, ...(usage ? { usage } : {}) } as Prisma.InputJsonValue,
      },
    })

    // Create merge edge from rightNodeId to mergeUserNode
    await prisma.mergeEdge.create({
      data: {
        childId: mergeUserNode.id,
        parentId: rightNodeId,
        branchOrder: 1,
      },
    })

    res.write(
      `event: done\ndata: ${JSON.stringify({ node: assistantNode })}\n\n`,
    )
    res.end()
  } catch (error) {
    if (signal.aborted) {
      if (accumulated.length > 0) {
        await prisma.node.create({
          data: {
            conversationId,
            parentId: mergeUserNode.id,
            role: 'assistant',
            content: accumulated,
            model,
            metadata: { partial: true, isMergeNode: true, ...(usage ? { usage } : {}) } as Prisma.InputJsonValue,
          },
        })
      }
      return
    }

    const message =
      error instanceof Error ? error.message : 'Unknown error during streaming'
    res.write(
      `event: error\ndata: ${JSON.stringify({ message })}\n\n`,
    )
    res.end()
  }
}
