import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../middleware/validate.js'
import * as nodeService from '../services/nodeService.js'

export const nodesRouter = Router()

const CreateNodeSchema = z.object({
  parentId: z.string().uuid().nullable(),
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().min(1),
  model: z.string().optional(),
})

const UpdateNodeSchema = z
  .object({
    content: z.string().min(1).optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .refine((data) => data.content !== undefined || data.metadata !== undefined, {
    message: 'At least one of content or metadata is required',
  })

// Create a standalone node (system prompt, manual message)
nodesRouter.post(
  '/conversations/:id/nodes',
  validate(CreateNodeSchema),
  async (req, res, next) => {
    try {
      const node = await nodeService.create(req.params.id as string, req.body)
      res.status(201).json(node)
    } catch (error) {
      next(error)
    }
  },
)

// Update node content and/or metadata
nodesRouter.patch(
  '/nodes/:id',
  validate(UpdateNodeSchema),
  async (req, res, next) => {
    try {
      const node = await nodeService.updateNode(req.params.id as string, req.body)
      res.json(node)
    } catch (error) {
      next(error)
    }
  },
)

// Delete node and its subtree
nodesRouter.delete('/nodes/:id', async (req, res, next) => {
  try {
    await nodeService.deleteSubtree(req.params.id as string)
    res.status(204).end()
  } catch (error) {
    next(error)
  }
})
