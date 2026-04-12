import { Request, Response, NextFunction } from 'express'
import { logger } from '../lib/logger'

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    const status = res.statusCode
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'

    logger.log(level, `${req.method} ${req.path} ${status} ${duration}ms`, {
      userId: req.user?.userId,
      orgId: req.user?.orgId,
    })
  })

  next()
}
