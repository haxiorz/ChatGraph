import { useMemo } from 'react'
import { Pin } from 'lucide-react'
import { useConversationStore } from '../../stores/conversationStore'

export function PinnedNodesPanel() {
  const nodes = useConversationStore((s) => s.nodes)
  const setActiveNode = useConversationStore((s) => s.setActiveNode)

  const pinnedNodes = useMemo(() => {
    const pinned: Array<{ id: string; role: string; content: string }> = []
    for (const node of nodes.values()) {
      const meta = (node.metadata ?? {}) as Record<string, unknown>
      if (meta.pinned === true) {
        pinned.push({ id: node.id, role: node.role, content: node.content })
      }
    }
    return pinned
  }, [nodes])

  if (pinnedNodes.length === 0) return null

  return (
    <div className="absolute bottom-3 left-3 z-10 max-h-48 w-52 overflow-y-auto rounded-lg border border-border bg-surface/90 shadow-sm backdrop-blur-sm">
      <div className="flex items-center gap-1.5 border-b border-border px-3 py-1.5">
        <Pin size={12} className="text-amber-500" />
        <span className="text-xs font-medium text-fg-secondary">
          Pinned ({pinnedNodes.length})
        </span>
      </div>
      <div className="py-1">
        {pinnedNodes.map((node) => (
          <button
            key={node.id}
            onClick={() => setActiveNode(node.id)}
            className="flex w-full items-center gap-2 px-3 py-1 text-left text-xs text-fg-secondary transition-colors hover:bg-elevated hover:text-fg-primary"
          >
            <span className="shrink-0 rounded bg-elevated px-1 py-0.5 text-[10px] text-fg-muted">
              {node.role}
            </span>
            <span className="truncate">{node.content}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
