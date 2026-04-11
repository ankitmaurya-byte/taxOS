export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
  ) {
    super(message)
    this.name = 'AppError'
    Error.captureStackTrace(this, this.constructor)
  }
}

export function badRequest(message: string): never {
  throw new AppError(message, 400)
}

export function unauthorized(message = 'Unauthorized'): never {
  throw new AppError(message, 401)
}

export function forbidden(message = 'Forbidden'): never {
  throw new AppError(message, 403)
}

export function notFound(resource: string): never {
  throw new AppError(`${resource} not found`, 404)
}

export function conflict(message: string): never {
  throw new AppError(message, 409)
}

export function internal(message = 'Internal server error'): never {
  throw new AppError(message, 500)
}

export function withContext(err: Error, context: string): Error {
  err.message = `[${context}] ${err.message}`
  return err
}
