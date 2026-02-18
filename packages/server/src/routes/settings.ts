import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../middleware/validate.js'
import * as settingsService from '../services/settingsService.js'

export const settingsRouter = Router()

const UpdateSettingsSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
})

const TestConnectionSchema = z.object({
  apiKey: z.string().min(1),
})

// Get all settings
settingsRouter.get('/settings', async (_req, res, next) => {
  try {
    const settings = await settingsService.getAll()
    res.json(settings)
  } catch (error) {
    next(error)
  }
})

// Update a setting
settingsRouter.put(
  '/settings',
  validate(UpdateSettingsSchema),
  async (req, res, next) => {
    try {
      await settingsService.set(req.body.key, req.body.value)
      res.json({ success: true })
    } catch (error) {
      next(error)
    }
  },
)

// Test OpenRouter connection
settingsRouter.post(
  '/settings/test-connection',
  validate(TestConnectionSchema),
  async (req, res, next) => {
    try {
      const valid = await settingsService.testConnection(req.body.apiKey)
      res.json({ valid })
    } catch (error) {
      next(error)
    }
  },
)
