import type { ConversationNode } from '../types/index'

interface TournamentCallbacks {
  onUserNode: (node: ConversationNode) => void
  onTournamentStart: (data: { models: string[]; userNodeId: string }) => void
  onToken: (modelIndex: number, content: string) => void
  onModelDone: (
    modelIndex: number,
    node: ConversationNode,
    timing: { ttft: number; totalDuration: number },
  ) => void
  onModelError: (modelIndex: number, message: string) => void
  onTournamentDone: () => void
  onTitle?: (title: string) => void
  onError: (message: string) => void
}

export async function consumeTournamentStream(
  url: string,
  body: object,
  callbacks: TournamentCallbacks,
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
            case 'tournamentStart':
              callbacks.onTournamentStart(
                parsed as unknown as {
                  models: string[]
                  userNodeId: string
                },
              )
              break
            case 'token':
              callbacks.onToken(
                parsed.modelIndex as number,
                parsed.content as string,
              )
              break
            case 'modelDone':
              callbacks.onModelDone(
                parsed.modelIndex as number,
                parsed.node as unknown as ConversationNode,
                parsed.timing as { ttft: number; totalDuration: number },
              )
              break
            case 'modelError':
              callbacks.onModelError(
                parsed.modelIndex as number,
                parsed.message as string,
              )
              break
            case 'tournamentDone':
              callbacks.onTournamentDone()
              break
            case 'title':
              callbacks.onTitle?.((parsed as { title: string }).title)
              break
            case 'error':
              callbacks.onError((parsed as { message: string }).message)
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
