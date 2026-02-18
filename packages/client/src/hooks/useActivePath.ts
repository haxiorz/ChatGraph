import { useMemo } from 'react'
import { useConversationStore } from '../stores/conversationStore'
import { buildPath } from '../utils/tree'

export function useActivePath() {
  const nodes = useConversationStore((s) => s.nodes)
  const activeNodeId = useConversationStore((s) => s.activeNodeId)

  return useMemo(() => {
    if (!activeNodeId) return []
    return buildPath(nodes, activeNodeId)
  }, [nodes, activeNodeId])
}
