import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../types/index.js'

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  // Guard against double-response (e.g. SSE routes that already sent headers)
  if (res.headersSent) {
    console.error('Error after headers sent:', err.message)
    if (!res.writableEnded) res.end()
    return
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { message: err.message, code: err.code },
    })
    return
  }

  console.error('Unhandled error:', err)
  res.status(500).json({
    error: { message: 'Internal server error', code: 'INTERNAL_ERROR' },
  })
}
