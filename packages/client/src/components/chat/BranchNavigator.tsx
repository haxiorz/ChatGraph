import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { useConversationStore } from '../../stores/conversationStore'
import { getChildren } from '../../utils/tree'

interface BranchNavigatorProps {
  currentIndex: number
  totalSiblings: number
  onNavigate: (direction: -1 | 1) => void
  nodeId?: string
}

export function BranchNavigator({
  currentIndex,
  totalSiblings,
  onNavigate,
  nodeId,
}: BranchNavigatorProps) {
  if (totalSiblings <= 1) return null

  const handleCompare = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!nodeId) return
    const store = useConversationStore.getState()
    const node = store.nodes.get(nodeId)
    if (!node?.parentId) return
    const parent = store.nodes.get(node.parentId)
    if (!parent?.parentId) return

    // The branch point is the grandparent — we want to compare siblings
    const siblings = getChildren(store.nodes, node.parentId)
    if (siblings.length < 2) return

    const getLeaf = (startId: string): string => {
      let id = startId
      while (true) {
        const c = getChildren(store.nodes, id)
        if (c.length === 0) return id
        id = c[c.length - 1]!.id
      }
    }

    useUIStore.getState().setCompareState({
      isComparing: true,
      branchPointId: node.parentId,
      leftBranchId: getLeaf(siblings[0]!.id),
      rightBranchId: getLeaf(siblings[1]!.id),
    })
  }

  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-border px-1 py-0.5 text-xs text-fg-muted">
      <button
        onClick={(e) => {
          e.stopPropagation()
          onNavigate(-1)
        }}
        disabled={currentIndex === 0}
        className="rounded p-0.5 hover:bg-elevated disabled:opacity-30 transition-colors"
      >
        <ChevronLeft size={10} />
      </button>
      <span className="min-w-[2rem] text-center text-[11px]">
        {currentIndex + 1}/{totalSiblings}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onNavigate(1)
        }}
        disabled={currentIndex === totalSiblings - 1}
        className="rounded p-0.5 hover:bg-elevated disabled:opacity-30 transition-colors"
      >
        <ChevronRight size={10} />
      </button>
      {totalSiblings >= 2 && nodeId && (
        <button
          onClick={handleCompare}
          className="ml-0.5 text-[10px] text-fg-muted hover:text-accent transition-colors"
          title="Compare branches"
        >
          Compare
        </button>
      )}
    </div>
  )
}
