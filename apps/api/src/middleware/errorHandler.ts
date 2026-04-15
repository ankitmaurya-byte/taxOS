import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../lib/errors'
import { logger } from '../lib/logger'

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const userId = req.user?.userId
  const orgId = req.user?.orgId
  const route = `${req.method} ${req.originalUrl || req.path}`

  if (err instanceof ZodError) {
    const fieldErrors = err.errors.map(e => ({
      path: e.path.join('.'),
      message: e.message,
    }))

    logger.warn(`Validation Failed  →  ${route}`, {
      endpoint: route,
      userId,
      orgId,
      role: req.user?.role,
      status: 400,
      validationErrors: fieldErrors,
      body: req.body,
    })

    return res.status(400).json({
      error: 'Validation error',
      details: fieldErrors,
    })
  }

  if (err instanceof AppError) {
    const level = err.statusCode >= 500 ? 'error' : 'warn'
    logger[level](`AppError  →  ${route}  →  ${err.statusCode}`, {
      endpoint: route,
      userId,
      orgId,
      role: req.user?.role,
      status: err.statusCode,
      code: err.code,
      message: err.message,
      ...(err.statusCode >= 500 ? { stack: err.stack } : {}),
    })
    return res.status(err.statusCode).json({ error: err.message })
  }

  if (err.message.startsWith('HITL_GATE:')) {
    const reason = err.message.replace('HITL_GATE: ', '')
    logger.warn(`HITL Gate Blocked  →  ${route}`, {
      endpoint: route,
      userId,
      orgId,
      role: req.user?.role,
      status: 403,
      gate: reason,
    })
    return res.status(403).json({ error: reason })
  }

  // Unhandled errors
  const status = (err as any).status || 500
  logger.error(`Unhandled Error  →  ${route}  →  ${status}`, {
    endpoint: route,
    userId,
    orgId,
    role: req.user?.role,
    status,
    message: err.message,
    stack: err.stack,
  })

  res.status(status).json({ error: 'Internal server error' })
}
