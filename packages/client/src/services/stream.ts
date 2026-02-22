import type { ConversationNode } from '../types/index'

interface StreamCallbacks {
  onUserNode: (node: ConversationNode) => void
  onToken: (content: string) => void
  onDone: (node: ConversationNode) => void
  onError: (message: string) => void
  onTitle?: (title: string) => void
  onThinking?: (content: string) => void
  onToolCallStart?: (step: { stepId: string; name: string; arguments: string }) => void
  onToolCallEnd?: (step: { stepId: string; result: string }) => void
}

export async function consumeStream(
  url: string,
  body: object,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    const text = await response.text()
    callbacks.onError(`Request failed: ${response.status} ${text}`)
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    callbacks.onError('No response body')
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''
  // Track current event type across chunks (event: and data: may arrive in separate chunks)
  let currentEvent = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()

      if (trimmed.startsWith('event: ')) {
        currentEvent = trimmed.slice(7)
        continue
      }

      if (trimmed.startsWith('data: ')) {
        const data = trimmed.slice(6)

        try {
          const parsed = JSON.parse(data) as Record<string, unknown>

          switch (currentEvent) {
            case 'userNode':
              callbacks.onUserNode(parsed as unknown as ConversationNode)
              break
            case 'token':
              callbacks.onToken((parsed as { content: string }).content)
              break
            case 'done':
              callbacks.onDone(
                (parsed as { node: ConversationNode }).node,
              )
              break
            case 'title':
              callbacks.onTitle?.(
                (parsed as { title: string }).title,
              )
              break
            case 'thinking':
              callbacks.onThinking?.(
                (parsed as { content: string }).content,
              )
              break
            case 'toolCallStart': {
              const tsStep = parsed as { stepId?: string; name?: string; arguments?: string }
              if (tsStep.stepId && tsStep.name) {
                callbacks.onToolCallStart?.({
                  stepId: tsStep.stepId,
                  name: tsStep.name,
                  arguments: tsStep.arguments ?? '',
                })
              }
              break
            }
            case 'toolCallEnd': {
              const teStep = parsed as { stepId?: string; result?: string }
              if (teStep.stepId) {
                callbacks.onToolCallEnd?.({
                  stepId: teStep.stepId,
                  result: teStep.result ?? '',
                })
              }
              break
            }
            case 'error':
              callbacks.onError(
                (parsed as { message: string }).message,
              )
              break
          }
        } catch {
          // Skip malformed data
        }

        currentEvent = ''
      }
    }
  }
}
