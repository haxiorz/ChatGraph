import { useCallback, useRef } from 'react'
import { useConversationStore } from '../stores/conversationStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useUIStore } from '../stores/uiStore'
import { useTournamentStore } from '../stores/tournamentStore'
import { consumeStream } from '../services/stream'
import { consumeTournamentStream } from '../services/tournamentStream'
import { toast } from '../stores/toastStore'
import { activity } from '../stores/activityStore'
import * as api from '../services/api'
import type { ConversationNode } from '../types/index'

function notifyIfHidden(node: ConversationNode) {
  const settings = useSettingsStore.getState().settings
  if (!settings.desktop_notifications) return
  if (!document.hidden) return
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return

  const convId = node.conversationId
  const conversations = useConversationStore.getState().conversations
  const conv = conversations.find((c) => c.id === convId)
  const title = conv?.title ?? 'ChatGraph'
  const modelName = node.model ?? 'AI'

  new Notification(title, {
    body: `${modelName} finished responding`,
    icon: '/favicon.ico',
  })
}

function checkBudget() {
  const settings = useSettingsStore.getState().settings
  const budget = settings.daily_budget
  if (budget == null || budget <= 0) return

  api.getUsage('day').then((stats) => {
    const ratio = stats.totalCost / budget
    if (ratio >= 1) {
      toast.warning(
        `Daily budget exceeded: $${stats.totalCost.toFixed(2)} / $${budget.toFixed(2)}`,
      )
    } else if (ratio >= 0.8) {
      toast.info(
        `Approaching daily budget: $${stats.totalCost.toFixed(2)} / $${budget.toFixed(2)}`,
      )
    }
  }).catch(() => {
    // Usage fetch failed — silently ignore
  })
}

function checkContextAndSuggestSummarize(node: ConversationNode) {
  const convId = node.conversationId
  const dismissed = useUIStore.getState().summarizeDismissed
  if (dismissed.has(convId)) return

  const usage = (node.metadata as Record<string, unknown> | null)?.usage as
    | { prompt_tokens?: number }
    | undefined
  if (!usage?.prompt_tokens) return

  const models = useSettingsStore.getState().models
  const modelId = node.model ?? useUIStore.getState().selectedModel
  const model = models.find((m) => m.id === modelId)
  if (!model?.context_length) return

  const ratio = usage.prompt_tokens / model.context_length
  if (ratio < 0.8) return

  const pct = Math.round(ratio * 100)
  toast.withAction(
    `Context ${pct}% full — consider summarizing`,
    {
      label: 'Summarize',
      onClick: () => {
        window.dispatchEvent(
          new CustomEvent('chatgraph:summarize', { detail: { nodeId: node.id } }),
        )
      },
    },
    'warning',
  )
  useUIStore.getState().dismissSummarize(convId)
}

let completionCounter = 0
const retitleDismissed = new Set<string>()

function checkRetitleSuggestion(node: ConversationNode) {
  completionCounter++
  if (completionCounter % 10 !== 0) return
  const convId = node.conversationId
  if (retitleDismissed.has(convId)) return

  toast.withAction(
    'Conversation has evolved — update title?',
    {
      label: 'Suggest titles',
      onClick: () => {
        window.dispatchEvent(
          new CustomEvent('chatgraph:suggest-retitle', { detail: { conversationId: convId } }),
        )
      },
    },
    'info',
    10000,
  )
  retitleDismissed.add(convId)
}

function onCompletionDone(node: ConversationNode) {
  notifyIfHidden(node)
  checkBudget()
  checkContextAndSuggestSummarize(node)
  checkRetitleSuggestion(node)

  const usage = (node.metadata as Record<string, unknown> | null)?.usage as
    | { prompt_tokens?: number; completion_tokens?: number }
    | undefined
  const tokens = (usage?.prompt_tokens ?? 0) + (usage?.completion_tokens ?? 0)
  const tokenStr = tokens > 0 ? ` (${tokens} tokens)` : ''
  activity.log('completion', `Response completed${tokenStr}`, node.model ?? undefined)
}

export function useCompletion() {
  const activeConversationId = useConversationStore(
    (s) => s.activeConversationId,
  )
  const activeNodeId = useConversationStore((s) => s.activeNodeId)
  const addNode = useConversationStore((s) => s.addNode)
  const updateConversationTitle = useConversationStore(
    (s) => s.updateConversationTitle,
  )
  const selectedModel = useUIStore((s) => s.selectedModel)
  const setStreamState = useUIStore((s) => s.setStreamState)
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    async (content: string, overrideParentNodeId?: string) => {
      if (!activeConversationId) return
      const parentId = overrideParentNodeId ?? activeNodeId
      if (!parentId) return

      // Abort any in-flight request
      if (abortRef.current) {
        abortRef.current.abort()
      }
      const controller = new AbortController()
      abortRef.current = controller
      useUIStore.getState().setAbortController(controller)

      setStreamState({ status: 'streaming', content: '' })

      const temperature = useSettingsStore.getState().settings.temperature

      try {
        await consumeStream(
          `/api/v1/conversations/${activeConversationId}/complete`,
          {
            parentNodeId: parentId,
            content,
            model: selectedModel,
            ...(temperature != null && { temperature }),
          },
          {
            onUserNode: (node) => {
              addNode(node)
            },
            onToken: (token) => {
              const state = useUIStore.getState()
              if (state.streamState.status === 'streaming') {
                useUIStore.setState({
                  streamState: {
                    status: 'streaming',
                    content: state.streamState.content + token,
                  },
                })
              }
            },
            onDone: (node) => {
              addNode(node)
              setStreamState({ status: 'idle' })
              useUIStore.getState().setAbortController(null)
              onCompletionDone(node)
            },
            onError: (message) => {
              setStreamState({ status: 'error', error: message })
              useUIStore.getState().setAbortController(null)
              activity.log('error', `Completion failed: ${message}`)
            },
            onTitle: (title) => {
              if (activeConversationId) {
                updateConversationTitle(activeConversationId, title)
              }
            },
          },
          controller.signal,
        )
      } catch (error) {
        if (controller.signal.aborted) {
          setStreamState({ status: 'idle' })
          useUIStore.getState().setAbortController(null)
          return
        }
        const message =
          error instanceof Error ? error.message : 'Unknown error'
        setStreamState({ status: 'error', error: message })
        useUIStore.getState().setAbortController(null)
      }
    },
    [activeConversationId, activeNodeId, selectedModel, addNode, setStreamState, updateConversationTitle],
  )

  const regenerate = useCallback(
    async (assistantNodeId: string) => {
      if (!activeConversationId) return

      if (abortRef.current) {
        abortRef.current.abort()
      }
      const controller = new AbortController()
      abortRef.current = controller
      useUIStore.getState().setAbortController(controller)

      setStreamState({ status: 'streaming', content: '' })

      const temperature = useSettingsStore.getState().settings.temperature

      try {
        await consumeStream(
          `/api/v1/conversations/${activeConversationId}/regenerate`,
          {
            assistantNodeId,
            model: selectedModel,
            ...(temperature != null && { temperature }),
          },
          {
            onUserNode: () => {
              // regenerate doesn't create a user node
            },
            onToken: (token) => {
              const state = useUIStore.getState()
              if (state.streamState.status === 'streaming') {
                useUIStore.setState({
                  streamState: {
                    status: 'streaming',
                    content: state.streamState.content + token,
                  },
                })
              }
            },
            onDone: (node) => {
              addNode(node)
              setStreamState({ status: 'idle' })
              useUIStore.getState().setAbortController(null)
              onCompletionDone(node)
              activity.log('regenerate', 'Response regenerated', node.model ?? undefined)
            },
            onError: (message) => {
              setStreamState({ status: 'error', error: message })
              useUIStore.getState().setAbortController(null)
              activity.log('error', `Regeneration failed: ${message}`)
            },
          },
          controller.signal,
        )
      } catch (error) {
        if (controller.signal.aborted) {
          setStreamState({ status: 'idle' })
          useUIStore.getState().setAbortController(null)
          return
        }
        const message =
          error instanceof Error ? error.message : 'Unknown error'
        setStreamState({ status: 'error', error: message })
        useUIStore.getState().setAbortController(null)
      }
    },
    [activeConversationId, selectedModel, addNode, setStreamState],
  )

  const merge = useCallback(
    async (leftNodeId: string, rightNodeId: string, mergePrompt: string) => {
      if (!activeConversationId) return

      if (abortRef.current) {
        abortRef.current.abort()
      }
      const controller = new AbortController()
      abortRef.current = controller
      useUIStore.getState().setAbortController(controller)

      setStreamState({ status: 'streaming', content: '' })

      const temperature = useSettingsStore.getState().settings.temperature

      try {
        await consumeStream(
          `/api/v1/conversations/${activeConversationId}/merge`,
          {
            leftNodeId,
            rightNodeId,
            mergePrompt,
            model: selectedModel,
            ...(temperature != null && { temperature }),
          },
          {
            onUserNode: (node) => {
              addNode(node)
            },
            onToken: (token) => {
              const state = useUIStore.getState()
              if (state.streamState.status === 'streaming') {
                useUIStore.setState({
                  streamState: {
                    status: 'streaming',
                    content: state.streamState.content + token,
                  },
                })
              }
            },
            onDone: (node) => {
              addNode(node)
              setStreamState({ status: 'idle' })
              useUIStore.getState().setAbortController(null)
            },
            onError: (message) => {
              setStreamState({ status: 'error', error: message })
              useUIStore.getState().setAbortController(null)
            },
          },
          controller.signal,
        )
      } catch (error) {
        if (controller.signal.aborted) {
          setStreamState({ status: 'idle' })
          useUIStore.getState().setAbortController(null)
          return
        }
        const message =
          error instanceof Error ? error.message : 'Unknown error'
        setStreamState({ status: 'error', error: message })
        useUIStore.getState().setAbortController(null)
      }
    },
    [activeConversationId, selectedModel, addNode, setStreamState],
  )

  const summarize = useCallback(
    async (nodeId: string) => {
      if (!activeConversationId) return

      if (abortRef.current) {
        abortRef.current.abort()
      }
      const controller = new AbortController()
      abortRef.current = controller
      useUIStore.getState().setAbortController(controller)

      setStreamState({ status: 'streaming', content: '' })

      const temperature = useSettingsStore.getState().settings.temperature

      try {
        await consumeStream(
          `/api/v1/conversations/${activeConversationId}/summarize`,
          {
            nodeId,
            model: selectedModel,
            ...(temperature != null && { temperature }),
          },
          {
            onUserNode: () => {
              // summarize doesn't create a user node
            },
            onToken: (token) => {
              const state = useUIStore.getState()
              if (state.streamState.status === 'streaming') {
                useUIStore.setState({
                  streamState: {
                    status: 'streaming',
                    content: state.streamState.content + token,
                  },
                })
              }
            },
            onDone: (node) => {
              addNode(node)
              setStreamState({ status: 'idle' })
              useUIStore.getState().setAbortController(null)
              activity.log('summarize', 'Summarization completed', node.model ?? undefined)
            },
            onError: (message) => {
              setStreamState({ status: 'error', error: message })
              useUIStore.getState().setAbortController(null)
              activity.log('error', `Summarization failed: ${message}`)
            },
          },
          controller.signal,
        )
      } catch (error) {
        if (controller.signal.aborted) {
          setStreamState({ status: 'idle' })
          useUIStore.getState().setAbortController(null)
          return
        }
        const message =
          error instanceof Error ? error.message : 'Unknown error'
        setStreamState({ status: 'error', error: message })
        useUIStore.getState().setAbortController(null)
      }
    },
    [activeConversationId, selectedModel, addNode, setStreamState],
  )

  const sendTournament = useCallback(
    async (content: string, models: string[]) => {
      if (!activeConversationId) return
      if (!activeNodeId) return

      if (abortRef.current) {
        abortRef.current.abort()
      }
      const controller = new AbortController()
      abortRef.current = controller
      useUIStore.getState().setAbortController(controller)

      const tournamentStore = useTournamentStore.getState()
      tournamentStore.startTournament(models)

      const temperature = useSettingsStore.getState().settings.temperature
      const addNodeSilent = useConversationStore.getState().addNodeSilent

      try {
        await consumeTournamentStream(
          `/api/v1/conversations/${activeConversationId}/tournament`,
          {
            parentNodeId: activeNodeId,
            content,
            models,
            ...(temperature != null && { temperature }),
          },
          {
            onUserNode: (node) => {
              addNode(node)
              useTournamentStore.getState().setUserNodeId(node.id)
            },
            onTournamentStart: () => {
              // Already handled via startTournament above
            },
            onToken: (modelIndex, tokenContent) => {
              useTournamentStore.getState().appendToken(modelIndex, tokenContent)
            },
            onModelDone: (modelIndex, node, timing) => {
              addNodeSilent(node)
              useTournamentStore.getState().setModelDone(modelIndex, node, timing)
            },
            onModelError: (modelIndex, message) => {
              useTournamentStore.getState().setModelError(modelIndex, message)
            },
            onTournamentDone: () => {
              useUIStore.getState().setAbortController(null)
              checkBudget()
              activity.log('tournament', `Tournament completed (${models.length} models)`)
            },
            onTitle: (title) => {
              if (activeConversationId) {
                updateConversationTitle(activeConversationId, title)
              }
            },
            onError: (message) => {
              setStreamState({ status: 'error', error: message })
              useTournamentStore.getState().reset()
              useUIStore.getState().setAbortController(null)
            },
          },
          controller.signal,
        )
      } catch (error) {
        if (controller.signal.aborted) {
          useTournamentStore.getState().reset()
          useUIStore.getState().setAbortController(null)
          return
        }
        const message =
          error instanceof Error ? error.message : 'Unknown error'
        setStreamState({ status: 'error', error: message })
        useTournamentStore.getState().reset()
        useUIStore.getState().setAbortController(null)
      }
    },
    [activeConversationId, activeNodeId, addNode, setStreamState, updateConversationTitle],
  )

  const abort = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setStreamState({ status: 'idle' })
    useTournamentStore.getState().reset()
    useUIStore.getState().setAbortController(null)
  }, [setStreamState])

  return { sendMessage, regenerate, merge, summarize, sendTournament, abort }
}
