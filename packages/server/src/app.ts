import express from 'express'
import cors from 'cors'
import path from 'path'
import { conversationsRouter } from './routes/conversations.js'
import { nodesRouter } from './routes/nodes.js'
import { completionsRouter } from './routes/completions.js'
import { modelsRouter } from './routes/models.js'
import { settingsRouter } from './routes/settings.js'
import { promptsRouter } from './routes/prompts.js'
import { usageRouter } from './routes/usage.js'
import { exportImportRouter } from './routes/exportImport.js'
import { searchRouter } from './routes/search.js'
import { analyticsRouter } from './routes/analytics.js'
import { uploadsRouter } from './routes/uploads.js'
import { errorHandler } from './middleware/errorHandler.js'
import { requestLogger } from './middleware/logger.js'

export function createApp() {
  const app = express()

  app.use(requestLogger)
  app.use(cors({ origin: 'http://localhost:5173' }))
  app.use(express.json())

  // Serve uploaded files statically
  app.use('/uploads', express.static(path.resolve('uploads')))

  // Mount routes under /api/v1
  app.use('/api/v1/conversations', conversationsRouter)
  app.use('/api/v1', nodesRouter)
  app.use('/api/v1', completionsRouter)
  app.use('/api/v1', modelsRouter)
  app.use('/api/v1', settingsRouter)
  app.use('/api/v1/prompts', promptsRouter)
  app.use('/api/v1', usageRouter)
  app.use('/api/v1', exportImportRouter)
  app.use('/api/v1', searchRouter)
  app.use('/api/v1', analyticsRouter)
  app.use('/api/v1', uploadsRouter)

  // Error handler (must be last)
  app.use(errorHandler)

  return app
}
