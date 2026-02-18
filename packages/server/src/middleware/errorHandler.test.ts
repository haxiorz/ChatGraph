import { describe, it, expect, vi, beforeEach } from 'vitest'
import { errorHandler } from './errorHandler.js'
import { AppError } from '../types/index.js'
import type { Request, Response, NextFunction } from 'express'

describe('errorHandler', () => {
  let req: Request
  let res: { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> }
  let next: NextFunction

  beforeEach(() => {
    req = {} as Request
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    }
    next = vi.fn()
  })

  it('responds with AppError statusCode and message', () => {
    const err = new AppError('Not found', 404, 'NOT_FOUND')
    errorHandler(err, req, res as unknown as Response, next)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Not found', code: 'NOT_FOUND' },
    })
  })

  it('responds with 500 for generic errors', () => {
    const err = new Error('Something broke')
    errorHandler(err, req, res as unknown as Response, next)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Internal server error', code: 'INTERNAL_ERROR' },
    })
  })

  it('logs generic errors to console', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const err = new Error('Oops')
    errorHandler(err, req, res as unknown as Response, next)

    expect(spy).toHaveBeenCalledWith('Unhandled error:', err)
    spy.mockRestore()
  })

  it('handles AppError with custom status codes', () => {
    const err = new AppError('Forbidden', 403, 'FORBIDDEN')
    errorHandler(err, req, res as unknown as Response, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Forbidden', code: 'FORBIDDEN' },
    })
  })
})
