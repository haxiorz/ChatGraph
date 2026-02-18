import { Router } from 'express'
import * as usageService from '../services/usageService.js'

export const usageRouter = Router()

usageRouter.get('/usage', async (req, res, next) => {
  try {
    const period = (req.query.period as string) ?? 'all'
    const stats = await usageService.getUsageStats(period)
    res.json(stats)
  } catch (error) {
    next(error)
  }
})

usageRouter.get('/usage/daily', async (req, res, next) => {
  try {
    const days = Math.max(1, Math.min(Number(req.query.days) || 7, 90))
    const data = await usageService.getDailySpending(days)
    res.json(data)
  } catch (error) {
    next(error)
  }
})
