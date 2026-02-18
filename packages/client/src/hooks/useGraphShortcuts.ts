import { useEffect } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useConversationStore } from '../stores/conversationStore'
import { getChildren, getSiblings } from '../utils/tree'

export function useGraphShortcuts() {
  const reactFlow = useReactFlow()

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.isComposing) return

      const tag = document.activeElement?.tagName
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable === true
      ) {
        return
      }

      const isMac = /Mac/.test(navigator.userAgent)
      const mod = isMac ? e.metaKey : e.ctrlKey
      const store = useConversationStore.getState()
      const { nodes, activeNodeId, setActiveNode } = store

      if (!activeNodeId) return
      const currentNode = nodes.get(activeNodeId)
      if (!currentNode) return

      // Ctrl+Shift+F — fit view
      if (mod && e.shiftKey && e.key === 'F') {
        e.preventDefault()
        reactFlow.fitView({ duration: 300 })
        return
      }

      // Ctrl+0 — reset zoom
      if (mod && e.key === '0') {
        e.preventDefault()
        reactFlow.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 300 })
        return
      }

      // Arrow Up — go to parent
      if (e.key === 'ArrowUp' && !mod && !e.shiftKey) {
        if (currentNode.parentId) {
          e.preventDefault()
          setActiveNode(currentNode.parentId)
        }
        return
      }

      // Arrow Down — go to first child
      if (e.key === 'ArrowDown' && !mod && !e.shiftKey) {
        const children = getChildren(nodes, activeNodeId)
        if (children.length > 0) {
          e.preventDefault()
          setActiveNode(children[0]!.id)
        }
        return
      }

      // Arrow Left — previous sibling
      if (e.key === 'ArrowLeft' && !mod && !e.shiftKey) {
        const siblings = getSiblings(nodes, activeNodeId)
        const idx = siblings.findIndex((s) => s.id === activeNodeId)
        if (idx > 0) {
          e.preventDefault()
          setActiveNode(siblings[idx - 1]!.id)
        }
        return
      }

      // Arrow Right — next sibling
      if (e.key === 'ArrowRight' && !mod && !e.shiftKey) {
        const siblings = getSiblings(nodes, activeNodeId)
        const idx = siblings.findIndex((s) => s.id === activeNodeId)
        if (idx < siblings.length - 1) {
          e.preventDefault()
          setActiveNode(siblings[idx + 1]!.id)
        }
        return
      }

      // Home — go to root
      if (e.key === 'Home' && !mod) {
        e.preventDefault()
        let node = currentNode
        while (node.parentId) {
          const parent = nodes.get(node.parentId)
          if (!parent) break
          node = parent
        }
        setActiveNode(node.id)
        return
      }

      // End — go to deepest leaf
      if (e.key === 'End' && !mod) {
        e.preventDefault()
        let nodeId = activeNodeId
        while (true) {
          const children = getChildren(nodes, nodeId)
          if (children.length === 0) break
          nodeId = children[children.length - 1]!.id
        }
        setActiveNode(nodeId)
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [reactFlow])
}
