import { useState, useMemo } from 'react'
import { useConversationStore } from '../../stores/conversationStore'
import { useCompletion } from '../../hooks/useCompletion'
import { getChildren } from '../../utils/tree'
import { ModelSelector } from './ModelSelector'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Input'

interface MergeDialogProps {
  branchPointId: string
  onClose: () => void
}

export function MergeDialog({ branchPointId, onClose }: MergeDialogProps) {
  const nodes = useConversationStore((s) => s.nodes)
  const [mergePrompt, setMergePrompt] = useState(
    'Synthesize the key insights from both branches into a unified response.',
  )
  const { merge } = useCompletion()

  const childNodes = useMemo(() => {
    return getChildren(nodes, branchPointId)
  }, [nodes, branchPointId])

  const [leftChildIdx, setLeftChildIdx] = useState(0)
  const [rightChildIdx, setRightChildIdx] = useState(
    childNodes.length > 1 ? 1 : 0,
  )

  const getLeaf = (startId: string): string => {
    let id = startId
    while (true) {
      const c = getChildren(nodes, id)
      if (c.length === 0) return id
      id = c[c.length - 1]!.id
    }
  }

  const handleMerge = () => {
    const leftNode = childNodes[leftChildIdx]
    const rightNode = childNodes[rightChildIdx]
    if (!leftNode || !rightNode) return

    const leftLeafId = getLeaf(leftNode.id)
    const rightLeafId = getLeaf(rightNode.id)

    merge(leftLeafId, rightLeafId, mergePrompt)
    onClose()
  }

  if (childNodes.length < 2) {
    return (
      <Modal open onClose={onClose} className="max-w-md p-6">
        <p className="text-sm text-fg-muted">
          Need at least 2 branches to merge.
        </p>
        <Button variant="secondary" onClick={onClose} className="mt-4">
          Close
        </Button>
      </Modal>
    )
  }

  return (
    <Modal open onClose={onClose} className="max-w-md p-6">
      <h3 className="mb-4 text-lg font-semibold text-fg-primary">
        Merge Branches
      </h3>

      <div className="mb-4 space-y-3">
        {/* Branch A selector */}
        <div>
          <label className="mb-1 block text-sm font-medium text-fg-secondary">
            Branch A
          </label>
          <select
            value={leftChildIdx}
            onChange={(e) => setLeftChildIdx(Number(e.target.value))}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg-primary"
          >
            {childNodes.map((n, i) => (
              <option key={n.id} value={i}>
                Branch {i + 1}: {n.content.substring(0, 40)}...
              </option>
            ))}
          </select>
        </div>

        {/* Branch B selector */}
        <div>
          <label className="mb-1 block text-sm font-medium text-fg-secondary">
            Branch B
          </label>
          <select
            value={rightChildIdx}
            onChange={(e) => setRightChildIdx(Number(e.target.value))}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg-primary"
          >
            {childNodes.map((n, i) => (
              <option key={n.id} value={i}>
                Branch {i + 1}: {n.content.substring(0, 40)}...
              </option>
            ))}
          </select>
        </div>

        {/* Model */}
        <div>
          <label className="mb-1 block text-sm font-medium text-fg-secondary">
            Model
          </label>
          <ModelSelector />
        </div>

        {/* Merge prompt */}
        <div>
          <label className="mb-1 block text-sm font-medium text-fg-secondary">
            Merge Prompt
          </label>
          <Textarea
            value={mergePrompt}
            onChange={(e) => setMergePrompt(e.target.value)}
            rows={3}
            placeholder="Describe how to merge the branches..."
          />
        </div>
      </div>

      {leftChildIdx === rightChildIdx && (
        <p className="mb-3 text-xs text-warning">
          Please select two different branches.
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleMerge}
          disabled={leftChildIdx === rightChildIdx || !mergePrompt.trim()}
        >
          Merge
        </Button>
      </div>
    </Modal>
  )
}
