import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../middleware/validate.js'
import * as conversationService from '../services/conversationService.js'
import { suggestTitles } from '../services/completionService.js'

export const conversationsRouter = Router()

const CreateConversationSchema = z.object({
  title: z.string().min(1).optional(),
})

const RenameConversationSchema = z.object({
  title: z.string().min(1),
})

// List conversations
conversationsRouter.get('/', async (_req, res, next) => {
  try {
    const conversations = await conversationService.list()
    res.json(conversations)
  } catch (error) {
    next(error)
  }
})

// Create conversation
conversationsRouter.post(
  '/',
  validate(CreateConversationSchema),
  async (req, res, next) => {
    try {
      const conversation = await conversationService.create(req.body.title)
      res.status(201).json(conversation)
    } catch (error) {
      next(error)
    }
  },
)

// Get conversation with nodes
conversationsRouter.get('/:id', async (req, res, next) => {
  try {
    const conversation = await conversationService.getById(req.params.id as string)
    res.json(conversation)
  } catch (error) {
    next(error)
  }
})

// Rename conversation
conversationsRouter.patch(
  '/:id',
  validate(RenameConversationSchema),
  async (req, res, next) => {
    try {
      const conversation = await conversationService.rename(
        req.params.id as string,
        req.body.title,
      )
      res.json(conversation)
    } catch (error) {
      next(error)
    }
  },
)

// Suggest titles for conversation
conversationsRouter.post('/:id/suggest-titles', async (req, res, next) => {
  try {
    const titles = await suggestTitles(req.params.id as string)
    res.json({ titles })
  } catch (error) {
    next(error)
  }
})

// Delete conversation
conversationsRouter.delete('/:id', async (req, res, next) => {
  try {
    await conversationService.remove(req.params.id as string)
    res.status(204).end()
  } catch (error) {
    next(error)
  }
})
