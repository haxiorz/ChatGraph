import type { Request, Response, NextFunction } from 'express'

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now()
  const { method, url } = req

  res.on('finish', () => {
    const duration = Date.now() - start
    const status = res.statusCode
    const color =
      status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m'
    const reset = '\x1b[0m'
    console.log(
      `${color}${method} ${url} ${status}${reset} ${duration}ms`,
    )
  })

  // Also log SSE streams that stay open (finish won't fire until stream ends)
  res.on('close', () => {
    if (!res.writableFinished) {
      const duration = Date.now() - start
      console.log(`\x1b[36m${method} ${url} [stream closed] ${duration}ms\x1b[0m`)
    }
  })

  next()
}
