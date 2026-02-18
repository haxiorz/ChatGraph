import { Router } from 'express'
import * as searchService from '../services/searchService.js'

export const searchRouter = Router()

searchRouter.get('/search', async (req, res, next) => {
  try {
    const q = (req.query.q as string) ?? ''
    const conversationId = req.query.conversationId as string | undefined
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined

    const results = await searchService.searchNodes(q, {
      conversationId,
      limit,
    })
    res.json(results)
  } catch (error) {
    next(error)
  }
})
