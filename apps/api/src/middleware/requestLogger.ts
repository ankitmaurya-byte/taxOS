import { Request, Response, NextFunction } from 'express'
import { logger } from '../lib/logger'

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now()

  // Capture response body
  const originalJson = res.json.bind(res)
  let responseBody: unknown
  res.json = (body: any) => {
    responseBody = body
    return originalJson(body)
  }

  res.on('finish', () => {
    const duration = Date.now() - start

    // Skip health checks and static assets from verbose logging
    if (req.path === '/health' || req.path.startsWith('/uploads/')) return

    logger.request({
      method: req.method,
      path: req.originalUrl || req.path,
      status: res.statusCode,
      duration,
      userId: req.user?.userId,
      orgId: req.user?.orgId,
      role: req.user?.role,
      params: req.params && Object.keys(req.params).length > 0 ? req.params : undefined,
      query: req.query && Object.keys(req.query).length > 0 ? (req.query as Record<string, unknown>) : undefined,
      body: req.method !== 'GET' && req.body && Object.keys(req.body).length > 0 ? req.body : undefined,
      responseBody,
    })
  })

  next()
}
