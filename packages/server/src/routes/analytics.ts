import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../middleware/validate.js'
import * as analyticsService from '../services/analyticsService.js'

export const analyticsRouter = Router()

const AnalyzeSchema = z.object({
  model: z.string().min(1),
  targetNodeId: z.string().uuid().optional(),
})

analyticsRouter.post(
  '/conversations/:id/analyze',
  validate(AnalyzeSchema),
  async (req, res, next) => {
    try {
      const result = await analyticsService.analyzeConversation({
        conversationId: req.params.id as string,
        model: req.body.model,
        targetNodeId: req.body.targetNodeId,
      })
      res.json(result)
    } catch (error) {
      next(error)
    }
  },
)
