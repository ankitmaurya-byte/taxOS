import { Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'
import { logger } from '../lib/logger'

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = randomUUID()
  ;(req as any).requestId = requestId

  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'
    const userId = req.user?.userId || '-'
    const orgId = req.user?.orgId || '-'

    ;(logger as any)[level](`${req.method} ${req.path}`, {
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      userId,
      orgId,
    })
  })

  next()
}
