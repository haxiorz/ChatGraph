import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validate } from './validate.js'
import { z } from 'zod'
import type { Request, Response, NextFunction } from 'express'

describe('validate', () => {
  const schema = z.object({
    name: z.string().min(1),
    age: z.number().int().positive(),
  })

  let req: { body: unknown }
  let res: { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> }
  let next: ReturnType<typeof vi.fn>

  beforeEach(() => {
    req = { body: {} }
    res = { status: vi.fn().mockReturnThis(), json: vi.fn() }
    next = vi.fn()
  })

  it('calls next() on valid input', () => {
    req.body = { name: 'Alice', age: 30 }
    validate(schema)(req as Request, res as unknown as Response, next as NextFunction)

    expect(next).toHaveBeenCalledWith()
  })

  it('replaces req.body with parsed value', () => {
    req.body = { name: 'Alice', age: 30, extra: 'field' }
    validate(schema)(req as Request, res as unknown as Response, next as NextFunction)

    // Zod strips extra fields in strict mode by default
    expect(req.body).toEqual({ name: 'Alice', age: 30 })
  })

  it('responds with 400 on invalid input', () => {
    req.body = { name: '', age: -1 }
    validate(schema)(req as Request, res as unknown as Response, next as NextFunction)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
        }),
      }),
    )
  })

  it('joins multiple error messages', () => {
    req.body = { name: '', age: -1 }
    validate(schema)(req as Request, res as unknown as Response, next as NextFunction)

    const errorPayload = res.json.mock.calls[0]![0] as { error: { message: string } }
    expect(errorPayload.error.message).toContain(', ')
  })
})
