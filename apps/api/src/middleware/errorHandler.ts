import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../lib/errors'
import { logger } from '../lib/logger'

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const requestId = (req as any).requestId || '-'
  const userId = req.user?.userId || '-'
  const orgId = req.user?.orgId || '-'

  if (err instanceof ZodError) {
    logger.warn('Validation error', {
      requestId,
      method: req.method,
      path: req.path,
      userId,
      orgId,
      errors: err.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
    })
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
    })
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(err.message, {
        requestId,
        method: req.method,
        path: req.path,
        userId,
        orgId,
        code: err.code,
        stack: err.stack,
      })
    } else {
      logger.warn(err.message, {
        requestId,
        method: req.method,
        path: req.path,
        userId,
        orgId,
        code: err.code,
      })
    }
    return res.status(err.statusCode).json({ error: err.message })
  }

  if (err.message.startsWith('HITL_GATE:')) {
    logger.warn('HITL gate triggered', {
      requestId,
      method: req.method,
      path: req.path,
      userId,
      orgId,
    })
    return res.status(403).json({ error: err.message.replace('HITL_GATE: ', '') })
  }

  logger.error(err.message, {
    requestId,
    method: req.method,
    path: req.path,
    userId,
    orgId,
    stack: err.stack,
  })

  const status = (err as any).status || 500
  res.status(status).json({ error: 'Internal server error' })
}
