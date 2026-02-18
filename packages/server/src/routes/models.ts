import { Router } from 'express'
import * as modelService from '../services/modelService.js'

export const modelsRouter = Router()

modelsRouter.get('/models', async (_req, res, next) => {
  try {
    const models = await modelService.listModels()
    res.json({ data: models })
  } catch (error) {
    next(error)
  }
})
