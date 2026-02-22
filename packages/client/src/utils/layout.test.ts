import { describe, it, expect } from 'vitest'
import { computeLayout } from './layout'
import type { Node as FlowNode, Edge } from '@xyflow/react'

describe('computeLayout', () => {
  it('assigns positions to all nodes', async () => {
    const nodes: FlowNode[] = [
      { id: 'a', position: { x: 0, y: 0 }, data: {} },
      { id: 'b', position: { x: 0, y: 0 }, data: {} },
    ]
    const edges: Edge[] = [{ id: 'e1', source: 'a', target: 'b' }]

    const laid = await computeLayout(nodes, edges)
    expect(laid).toHaveLength(2)
    for (const n of laid) {
      expect(n.position.x).toEqual(expect.any(Number))
      expect(n.position.y).toEqual(expect.any(Number))
    }
  })

  it('parent node is above child node (TB direction)', async () => {
    const nodes: FlowNode[] = [
      { id: 'parent', position: { x: 0, y: 0 }, data: {} },
      { id: 'child', position: { x: 0, y: 0 }, data: {} },
    ]
    const edges: Edge[] = [{ id: 'e1', source: 'parent', target: 'child' }]

    const laid = await computeLayout(nodes, edges)
    const parentNode = laid.find((n) => n.id === 'parent')!
    const childNode = laid.find((n) => n.id === 'child')!
    expect(parentNode.position.y).toBeLessThan(childNode.position.y)
  })

  it('sibling nodes are at the same depth (y level)', async () => {
    const nodes: FlowNode[] = [
      { id: 'root', position: { x: 0, y: 0 }, data: {} },
      { id: 'left', position: { x: 0, y: 0 }, data: {} },
      { id: 'right', position: { x: 0, y: 0 }, data: {} },
    ]
    const edges: Edge[] = [
      { id: 'e1', source: 'root', target: 'left' },
      { id: 'e2', source: 'root', target: 'right' },
    ]

    const laid = await computeLayout(nodes, edges)
    const left = laid.find((n) => n.id === 'left')!
    const right = laid.find((n) => n.id === 'right')!
    expect(left.position.y).toBe(right.position.y)
  })

  it('handles empty input', async () => {
    const laid = await computeLayout([], [])
    expect(laid).toEqual([])
  })
})
