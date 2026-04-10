import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message)

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
    })
  }

  if (err.message.startsWith('HITL_GATE:')) {
    return res.status(403).json({ error: err.message.replace('HITL_GATE: ', '') })
  }

  const status = (err as any).status || 500
  res.status(status).json({ error: err.message || 'Internal server error' })
}
