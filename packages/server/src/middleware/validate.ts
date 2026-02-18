import type { Request, Response, NextFunction } from 'express'
import { ZodSchema, ZodError } from 'zod'

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body)
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: {
            message: error.errors.map((e) => e.message).join(', '),
            code: 'VALIDATION_ERROR',
          },
        })
        return
      }
      next(error)
    }
  }
}
