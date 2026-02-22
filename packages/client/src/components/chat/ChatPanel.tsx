import { useEffect, useRef, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { MessageCircle, AlertCircle } from 'lucide-react'
import { useActivePath } from '../../hooks/useActivePath'
import { useCompletion } from '../../hooks/useCompletion'
import { useConversationStore } from '../../stores/conversationStore'
import { useUIStore } from '../../stores/uiStore'
import { getSiblings, getDeepestLeaf } from '../../utils/tree'
import { slideUp, EASE_OUT_FAST } from '../../utils/animations'
import { MessageBubble } from './MessageBubble'
import { StreamingMessage } from './StreamingMessage'
import { MessageInput } from './MessageInput'
import { ContextBar } from './ContextBar'
import { TournamentPanel } from './TournamentPanel'
import { useTournamentStore } from '../../stores/tournamentStore'

export function ChatPanel() {
  const path = useActivePath()
  const nodes = useConversationStore((s) => s.nodes)
  const setActiveNode = useConversationStore((s) => s.setActiveNode)
  const streamState = useUIStore((s) => s.streamState)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { sendMessage, regenerate, summarize } = useCompletion()
  const tournamentActive = useTournamentStore((s) => s.active)
  const isStreaming = streamState.status === 'streaming'
  const prevPathRef = useRef<string>('')
  const userScrolledUpRef = useRef(false)

  // Track if user has scrolled up (to avoid hijacking their position)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handleScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      userScrolledUpRef.current = distanceFromBottom > 100
    }
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [])

  // Scroll to bottom on path change (instant) or during streaming (direct assignment)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const pathKey = path.map((n) => n.id).join(',')
    const pathChanged = pathKey !== prevPathRef.current
    prevPathRef.current = pathKey

    if (pathChanged) {
      // Path changed — always scroll to bottom instantly
      userScrolledUpRef.current = false
      el.scrollTop = el.scrollHeight
    } else if (!userScrolledUpRef.current) {
      // Streaming token — snap to bottom without smooth animation
      el.scrollTop = el.scrollHeight
    }
  }, [path, streamState])

  // Listen for summarize suggestions from toast action
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ nodeId: string }>).detail
      if (detail?.nodeId) {
        summarize(detail.nodeId)
      }
    }
    window.addEventListener('chatgraph:summarize', handler)
    return () => window.removeEventListener('chatgraph:summarize', handler)
  }, [summarize])

  const siblingData = useMemo(() => {
    const data = new Map<string, { index: number; count: number }>()
    for (const node of path) {
      const siblings = getSiblings(nodes, node.id)
      const index = siblings.findIndex((s) => s.id === node.id)
      data.set(node.id, { index: Math.max(0, index), count: siblings.length })
    }
    return data
  }, [path, nodes])

  const handleNavigateSibling = useCallback(
    (nodeId: string, direction: -1 | 1) => {
      const siblings = getSiblings(nodes, nodeId)
      const currentIndex = siblings.findIndex((s) => s.id === nodeId)
      const newIndex = currentIndex + direction
      if (newIndex < 0 || newIndex >= siblings.length) return
      const targetNode = siblings[newIndex]!
      const leafId = getDeepestLeaf(nodes, targetNode.id)
      setActiveNode(leafId)
    },
    [nodes, setActiveNode],
  )

  const handleRegenerate = useCallback(
    (assistantNodeId: string) => {
      regenerate(assistantNodeId)
    },
    [regenerate],
  )

  const handleEditResend = useCallback(
    (parentId: string, content: string) => {
      sendMessage(content, { parentNodeId: parentId })
    },
    [sendMessage],
  )

  const updateNodeData = useConversationStore((s) => s.updateNodeData)

  const handleRate = useCallback(
    (nodeId: string, rating: 'up' | 'down' | null) => {
      updateNodeData(nodeId, { metadata: { rating } })
    },
    [updateNodeData],
  )

  if (tournamentActive) {
    return (
      <div className="flex h-full flex-col bg-transparent">
        <TournamentPanel />
        <ContextBar />
        <MessageInput />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-transparent">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {path.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-fg-muted">
            <MessageCircle size={40} strokeWidth={1.5} />
            <div className="text-center">
              <p className="text-sm font-medium text-fg-secondary">No messages yet</p>
              <p className="text-xs">Send a message to start the conversation.</p>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl divide-y divide-[var(--glass-border)]">
            {path.map((node) => {
              const info = siblingData.get(node.id) ?? {
                index: 0,
                count: 1,
              }
              return (
                <motion.div
                  key={node.id}
                  className="py-5 first:pt-0"
                  variants={slideUp}
                  initial="initial"
                  animate="animate"
                  transition={EASE_OUT_FAST}
                >
                  <MessageBubble
                    node={node}
                    siblingIndex={info.index}
                    siblingCount={info.count}
                    isStreaming={isStreaming}
                    onNavigateSibling={handleNavigateSibling}
                    onRegenerate={handleRegenerate}
                    onEditResend={handleEditResend}
                    onRate={handleRate}
                  />
                </motion.div>
              )
            })}
            {streamState.status === 'streaming' && (
              <motion.div
                className="py-5"
                variants={slideUp}
                initial="initial"
                animate="animate"
                transition={EASE_OUT_FAST}
              >
                <StreamingMessage
                  content={streamState.content}
                  thinkingContent={streamState.thinkingContent}
                  agentSteps={streamState.agentSteps}
                />
              </motion.div>
            )}
            {streamState.status === 'error' && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{streamState.error}</span>
              </div>
            )}
            <div />
          </div>
        )}
      </div>
      <ContextBar />
      <MessageInput />
    </div>
  )
}
