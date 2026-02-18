import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../middleware/validate.js'
import * as promptService from '../services/promptService.js'

export const promptsRouter = Router()

const CreatePromptSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  content: z.string().min(1),
})

const UpdatePromptSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  content: z.string().min(1).optional(),
})

// List all prompts
promptsRouter.get('/', async (_req, res, next) => {
  try {
    const prompts = await promptService.list()
    res.json(prompts)
  } catch (error) {
    next(error)
  }
})

// Create a custom prompt
promptsRouter.post(
  '/',
  validate(CreatePromptSchema),
  async (req, res, next) => {
    try {
      const prompt = await promptService.create(req.body)
      res.status(201).json(prompt)
    } catch (error) {
      next(error)
    }
  },
)

// Update a custom prompt
promptsRouter.patch(
  '/:id',
  validate(UpdatePromptSchema),
  async (req, res, next) => {
    try {
      const prompt = await promptService.update(req.params.id as string, req.body)
      res.json(prompt)
    } catch (error) {
      next(error)
    }
  },
)

// Delete a custom prompt
promptsRouter.delete('/:id', async (req, res, next) => {
  try {
    await promptService.remove(req.params.id as string)
    res.status(204).end()
  } catch (error) {
    next(error)
  }
})
