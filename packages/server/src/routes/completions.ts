import { Router } from 'express'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { validate } from '../middleware/validate.js'
import * as completionService from '../services/completionService.js'

export const completionsRouter = Router()

const CompleteSchema = z.object({
  parentNodeId: z.string().uuid(),
  content: z.string().min(1),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2).optional(),
})

const RegenerateSchema = z.object({
  assistantNodeId: z.string().uuid(),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2).optional(),
})

const SummarizeSchema = z.object({
  nodeId: z.string().uuid(),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2).optional(),
})

const TournamentSchema = z.object({
  parentNodeId: z.string().uuid(),
  content: z.string().min(1),
  models: z.array(z.string().min(1)).min(2).max(4),
  temperature: z.number().min(0).max(2).optional(),
})

const MergeSchema = z.object({
  leftNodeId: z.string().uuid(),
  rightNodeId: z.string().uuid(),
  mergePrompt: z.string().min(1),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2).optional(),
})

/**
 * Sets up SSE headers, heartbeat interval, and abort handling.
 * Returns the AbortSignal for use with the completion service.
 * The caller must call cleanup() when done.
 */
function setupSSE(req: Request, res: Response) {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  // Disable Nagle's algorithm so small SSE chunks are sent immediately
  req.socket.setNoDelay(true)
  // Disable socket timeout for long-lived SSE connections
  req.socket.setTimeout(0)

  res.flushHeaders()

  const abortController = new AbortController()

  // Send heartbeat comments to keep the connection alive through proxies
  const heartbeat = setInterval(() => {
    if (!res.writableEnded) {
      res.write(': heartbeat\n\n')
    }
  }, 15000)

  // IMPORTANT: Listen on `res` close, NOT `req` close.
  // `req.on('close')` fires as soon as express.json() finishes reading
  // the POST body, which is NOT a client disconnect.
  // `res.on('close')` fires when the response connection actually closes.
  res.on('close', () => {
    if (!res.writableFinished) {
      console.log(`[sse] Client disconnected: ${req.method} ${req.originalUrl}`)
      abortController.abort()
    }
    clearInterval(heartbeat)
  })

  const cleanup = () => {
    clearInterval(heartbeat)
  }

  return { signal: abortController.signal, cleanup }
}

completionsRouter.post(
  '/conversations/:id/regenerate',
  validate(RegenerateSchema),
  async (req, res) => {
    const { signal, cleanup } = setupSSE(req, res)

    try {
      await completionService.streamRegeneration(
        {
          conversationId: req.params.id as string,
          assistantNodeId: req.body.assistantNodeId,
          model: req.body.model,
          temperature: req.body.temperature,
        },
        res,
        signal,
      )
    } catch (error) {
      if (!res.writableEnded) {
        const message =
          error instanceof Error ? error.message : 'Internal server error'
        res.write(
          `event: error\ndata: ${JSON.stringify({ message })}\n\n`,
        )
        res.end()
      }
    } finally {
      cleanup()
    }
  },
)

completionsRouter.post(
  '/conversations/:id/complete',
  validate(CompleteSchema),
  async (req, res) => {
    const { signal, cleanup } = setupSSE(req, res)

    try {
      await completionService.streamCompletion(
        {
          conversationId: req.params.id as string,
          parentNodeId: req.body.parentNodeId,
          content: req.body.content,
          model: req.body.model,
          temperature: req.body.temperature,
        },
        res,
        signal,
      )
    } catch (error) {
      if (!res.writableEnded) {
        const message =
          error instanceof Error ? error.message : 'Internal server error'
        res.write(
          `event: error\ndata: ${JSON.stringify({ message })}\n\n`,
        )
        res.end()
      }
    } finally {
      cleanup()
    }
  },
)

completionsRouter.post(
  '/conversations/:id/tournament',
  validate(TournamentSchema),
  async (req, res) => {
    const { signal, cleanup } = setupSSE(req, res)

    try {
      await completionService.streamTournament(
        {
          conversationId: req.params.id as string,
          parentNodeId: req.body.parentNodeId,
          content: req.body.content,
          models: req.body.models,
          temperature: req.body.temperature,
        },
        res,
        signal,
      )
    } catch (error) {
      if (!res.writableEnded) {
        const message =
          error instanceof Error ? error.message : 'Internal server error'
        res.write(
          `event: error\ndata: ${JSON.stringify({ message })}\n\n`,
        )
        res.end()
      }
    } finally {
      cleanup()
    }
  },
)

completionsRouter.post(
  '/conversations/:id/merge',
  validate(MergeSchema),
  async (req, res) => {
    const { signal, cleanup } = setupSSE(req, res)

    try {
      await completionService.streamMerge(
        {
          conversationId: req.params.id as string,
          leftNodeId: req.body.leftNodeId,
          rightNodeId: req.body.rightNodeId,
          mergePrompt: req.body.mergePrompt,
          model: req.body.model,
          temperature: req.body.temperature,
        },
        res,
        signal,
      )
    } catch (error) {
      if (!res.writableEnded) {
        const message =
          error instanceof Error ? error.message : 'Internal server error'
        res.write(
          `event: error\ndata: ${JSON.stringify({ message })}\n\n`,
        )
        res.end()
      }
    } finally {
      cleanup()
    }
  },
)

completionsRouter.post(
  '/conversations/:id/summarize',
  validate(SummarizeSchema),
  async (req, res) => {
    const { signal, cleanup } = setupSSE(req, res)

    try {
      await completionService.streamSummarization(
        {
          conversationId: req.params.id as string,
          nodeId: req.body.nodeId,
          model: req.body.model,
          temperature: req.body.temperature,
        },
        res,
        signal,
      )
    } catch (error) {
      if (!res.writableEnded) {
        const message =
          error instanceof Error ? error.message : 'Internal server error'
        res.write(
          `event: error\ndata: ${JSON.stringify({ message })}\n\n`,
        )
        res.end()
      }
    } finally {
      cleanup()
    }
  },
)
