import { Router } from 'express'
import * as exportService from '../services/exportService.js'
import * as importService from '../services/importService.js'

export const exportImportRouter = Router()

// Export a conversation
exportImportRouter.get(
  '/conversations/:id/export',
  async (req, res, next) => {
    try {
      const format = (req.query.format as string) ?? 'json'
      const activeNodeId = req.query.activeNodeId as string | undefined

      if (format === 'markdown') {
        const markdown = await exportService.exportAsMarkdown(
          req.params.id as string,
          activeNodeId,
        )
        res.setHeader('Content-Type', 'text/markdown')
        res.setHeader(
          'Content-Disposition',
          'attachment; filename="conversation.md"',
        )
        res.send(markdown)
      } else {
        const data = await exportService.exportAsJson(req.params.id as string)
        res.json(data)
      }
    } catch (error) {
      next(error)
    }
  },
)

// Import a conversation
exportImportRouter.post('/conversations/import', async (req, res, next) => {
  try {
    const conversation = await importService.importConversation(req.body)
    res.status(201).json(conversation)
  } catch (error) {
    next(error)
  }
})
