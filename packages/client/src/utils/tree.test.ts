import { describe, it, expect, beforeEach } from 'vitest'
import { buildPath, getChildren, getRootNodes, getSiblings, getDeepestLeaf } from './tree'
import { makeSampleNodeMap, makeClientNode, resetCounter } from '../test/helpers/fixtures'

describe('client tree utils', () => {
  let nodes: Map<string, ReturnType<typeof makeClientNode>>

  beforeEach(() => {
    resetCounter()
    nodes = makeSampleNodeMap()
  })

  describe('buildPath', () => {
    it('builds path from root to target node', () => {
      const path = buildPath(nodes, 'user2')
      expect(path.map((n) => n.id)).toEqual(['root', 'user1', 'asst1', 'user2'])
    })

    it('returns single node for root target', () => {
      const path = buildPath(nodes, 'root')
      expect(path).toHaveLength(1)
      expect(path[0]!.id).toBe('root')
    })

    it('follows correct branch to alternative child', () => {
      const path = buildPath(nodes, 'asst2')
      expect(path.map((n) => n.id)).toEqual(['root', 'user1', 'asst2'])
    })

    it('returns empty array for missing node', () => {
      expect(buildPath(nodes, 'nonexistent')).toEqual([])
    })

    it('returns empty array for empty map', () => {
      expect(buildPath(new Map(), 'user1')).toEqual([])
    })
  })

  describe('getChildren', () => {
    it('returns children of a parent node sorted by createdAt', () => {
      const children = getChildren(nodes, 'user1')
      expect(children.map((n) => n.id)).toEqual(['asst1', 'asst2'])
    })

    it('returns empty array when no children exist', () => {
      expect(getChildren(nodes, 'user2')).toEqual([])
    })

    it('returns root-level children (parentId matches)', () => {
      const children = getChildren(nodes, 'root')
      expect(children).toHaveLength(1)
      expect(children[0]!.id).toBe('user1')
    })
  })

  describe('getRootNodes', () => {
    it('returns all nodes with null parentId', () => {
      const roots = getRootNodes(nodes)
      expect(roots).toHaveLength(1)
      expect(roots[0]!.id).toBe('root')
    })

    it('returns empty array for empty map', () => {
      expect(getRootNodes(new Map())).toEqual([])
    })

    it('returns multiple roots if present', () => {
      const root2 = makeClientNode({ id: 'root2', parentId: null, role: 'system' })
      nodes.set(root2.id, root2)
      expect(getRootNodes(nodes)).toHaveLength(2)
    })
  })

  describe('getSiblings', () => {
    it('returns all same-role siblings sharing a parent', () => {
      const siblings = getSiblings(nodes, 'asst1')
      expect(siblings.map((n) => n.id)).toEqual(['asst1', 'asst2'])
    })

    it('returns single node if no siblings', () => {
      const siblings = getSiblings(nodes, 'user1')
      expect(siblings).toHaveLength(1)
      expect(siblings[0]!.id).toBe('user1')
    })

    it('returns empty array for missing node', () => {
      expect(getSiblings(nodes, 'nonexistent')).toEqual([])
    })
  })

  describe('getDeepestLeaf', () => {
    it('finds the deepest leaf from a starting node', () => {
      const deepest = getDeepestLeaf(nodes, 'root')
      // root -> user1 -> (asst1 at 00:02, asst2 at 00:04)
      // Last child of user1 = asst2 (latest createdAt)
      // asst2 has no children → deepest = asst2
      expect(deepest).toBe('asst2')
    })

    it('returns the node itself if it has no children', () => {
      expect(getDeepestLeaf(nodes, 'user2')).toBe('user2')
    })

    it('follows the last child at each level', () => {
      // From asst1 -> user2 (only child, no further children)
      expect(getDeepestLeaf(nodes, 'asst1')).toBe('user2')
    })
  })
})
