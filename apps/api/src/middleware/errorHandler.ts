import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../lib/errors'
import { logger } from '../lib/logger'

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const userId = req.user?.userId
  const orgId = req.user?.orgId
  const route = `${req.method} ${req.path}`

  if (err instanceof ZodError) {
    const fields = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(' :: ')
    logger.warn(`Validation failed on ${route} :: ${fields}`, { userId, orgId })
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
    })
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(`${route} :: ${err.message}`, { userId, orgId, code: err.code, stack: err.stack })
    } else {
      logger.warn(`${route} :: ${err.message}`, { userId, orgId, code: err.code })
    }
    return res.status(err.statusCode).json({ error: err.message })
  }

  if (err.message.startsWith('HITL_GATE:')) {
    const reason = err.message.replace('HITL_GATE: ', '')
    logger.warn(`${route} :: HITL gate :: ${reason}`, { userId, orgId })
    return res.status(403).json({ error: reason })
  }

  // Unhandled errors
  logger.error(`${route} :: ${err.message}`, { userId, orgId, stack: err.stack })

  const status = (err as any).status || 500
  res.status(status).json({ error: 'Internal server error' })
}
