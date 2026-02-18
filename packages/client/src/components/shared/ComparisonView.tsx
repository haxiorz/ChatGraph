import { useMemo } from 'react'
import { useConversationStore } from '../../stores/conversationStore'
import { useUIStore } from '../../stores/uiStore'
import { buildPath, getChildren } from '../../utils/tree'
import { MarkdownRenderer } from '../chat/MarkdownRenderer'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'

export function ComparisonView() {
  const nodes = useConversationStore((s) => s.nodes)
  const compareState = useUIStore((s) => s.compareState)
  const resetCompareState = useUIStore((s) => s.resetCompareState)
  const setActiveNode = useConversationStore((s) => s.setActiveNode)

  const { branchPointId, leftBranchId, rightBranchId } = compareState

  // Allow selecting branches dynamically
  const childNodes = useMemo(() => {
    if (!branchPointId) return []
    return getChildren(nodes, branchPointId)
  }, [nodes, branchPointId])

  const leftPath = useMemo(() => {
    if (!leftBranchId) return []
    return buildPath(nodes, leftBranchId)
  }, [nodes, leftBranchId])

  const rightPath = useMemo(() => {
    if (!rightBranchId) return []
    return buildPath(nodes, rightBranchId)
  }, [nodes, rightBranchId])

  // Find shared prefix and divergent parts
  const { sharedPrefix, leftUnique, rightUnique } = useMemo(() => {
    const shared = []
    const minLen = Math.min(leftPath.length, rightPath.length)
    let divergeIdx = 0

    for (let i = 0; i < minLen; i++) {
      if (leftPath[i]?.id === rightPath[i]?.id) {
        shared.push(leftPath[i]!)
        divergeIdx = i + 1
      } else {
        break
      }
    }

    return {
      sharedPrefix: shared,
      leftUnique: leftPath.slice(divergeIdx),
      rightUnique: rightPath.slice(divergeIdx),
    }
  }, [leftPath, rightPath])

  const handleExit = () => {
    resetCompareState()
  }

  const handleSelectNode = (nodeId: string) => {
    setActiveNode(nodeId)
    resetCompareState()
  }

  const ROLE_VARIANT: Record<string, 'default' | 'accent' | 'success'> = {
    system: 'default',
    user: 'accent',
    assistant: 'success',
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-fg-primary">
            Branch Comparison
          </h3>
          {/* Branch selectors */}
          <select
            value={leftBranchId ?? ''}
            onChange={(e) => {
              if (e.target.value) {
                let leafId = e.target.value
                let children = getChildren(nodes, leafId)
                while (children.length > 0) {
                  leafId = children[children.length - 1]!.id
                  children = getChildren(nodes, leafId)
                }
                useUIStore.getState().setCompareState({
                  ...compareState,
                  leftBranchId: leafId,
                })
              }
            }}
            className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-fg-secondary"
          >
            <option value="">Branch A</option>
            {childNodes.map((n, i) => (
              <option key={n.id} value={n.id}>
                Branch {i + 1}: {n.content.substring(0, 30)}...
              </option>
            ))}
          </select>
          <span className="text-xs text-fg-muted">vs</span>
          <select
            value={rightBranchId ?? ''}
            onChange={(e) => {
              if (e.target.value) {
                let leafId = e.target.value
                let children = getChildren(nodes, leafId)
                while (children.length > 0) {
                  leafId = children[children.length - 1]!.id
                  children = getChildren(nodes, leafId)
                }
                useUIStore.getState().setCompareState({
                  ...compareState,
                  rightBranchId: leafId,
                })
              }
            }}
            className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-fg-secondary"
          >
            <option value="">Branch B</option>
            {childNodes.map((n, i) => (
              <option key={n.id} value={n.id}>
                Branch {i + 1}: {n.content.substring(0, 30)}...
              </option>
            ))}
          </select>
        </div>
        <Button variant="secondary" size="sm" onClick={handleExit}>
          Exit Comparison
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-5xl">
          {/* Shared context (collapsed) */}
          {sharedPrefix.length > 0 && (
            <div className="mb-4">
              <details className="rounded-lg border border-border">
                <summary className="cursor-pointer px-3 py-2 text-xs text-fg-muted hover:bg-elevated">
                  Shared context ({sharedPrefix.length} messages)
                </summary>
                <div className="space-y-1 p-3">
                  {sharedPrefix.map((node) => (
                    <div
                      key={node.id}
                      className="rounded bg-elevated px-3 py-1.5 text-xs text-fg-muted opacity-60"
                    >
                      <span className="font-medium">{node.role}: </span>
                      {node.content.length > 200
                        ? node.content.substring(0, 200) + '...'
                        : node.content}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}

          {/* Divergence divider */}
          <div className="mb-4 flex items-center gap-3">
            <div className="flex-1 border-t border-dashed border-warning" />
            <span className="text-xs font-medium text-warning">
              Branches diverge
            </span>
            <div className="flex-1 border-t border-dashed border-warning" />
          </div>

          {/* Side-by-side columns */}
          <div className="grid grid-cols-2 gap-4">
            {/* Left branch */}
            <div>
              <h4 className="mb-2 text-xs font-semibold text-accent">
                Branch A
              </h4>
              <div className="space-y-2">
                {leftUnique.map((node) => (
                  <div
                    key={node.id}
                    onClick={() => handleSelectNode(node.id)}
                    className="cursor-pointer rounded-lg border border-transparent p-3 text-sm transition-colors hover:border-accent/30"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <Badge variant={ROLE_VARIANT[node.role] ?? 'default'}>
                        {node.role}
                      </Badge>
                      {node.model && (
                        <span className="text-[10px] text-fg-muted">
                          {node.model}
                        </span>
                      )}
                    </div>
                    <div className="markdown-body text-xs">
                      <MarkdownRenderer content={node.content} />
                    </div>
                  </div>
                ))}
                {leftUnique.length === 0 && (
                  <p className="text-xs text-fg-muted">
                    Select Branch A above
                  </p>
                )}
              </div>
            </div>

            {/* Right branch */}
            <div>
              <h4 className="mb-2 text-xs font-semibold text-purple-500">
                Branch B
              </h4>
              <div className="space-y-2">
                {rightUnique.map((node) => (
                  <div
                    key={node.id}
                    onClick={() => handleSelectNode(node.id)}
                    className="cursor-pointer rounded-lg border border-transparent p-3 text-sm transition-colors hover:border-purple-300 dark:hover:border-purple-600"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <Badge variant={ROLE_VARIANT[node.role] ?? 'default'}>
                        {node.role}
                      </Badge>
                      {node.model && (
                        <span className="text-[10px] text-fg-muted">
                          {node.model}
                        </span>
                      )}
                    </div>
                    <div className="markdown-body text-xs">
                      <MarkdownRenderer content={node.content} />
                    </div>
                  </div>
                ))}
                {rightUnique.length === 0 && (
                  <p className="text-xs text-fg-muted">
                    Select Branch B above
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
