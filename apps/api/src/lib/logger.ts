type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const currentLevel = (process.env.LOG_LEVEL || 'info') as LogLevel

function formatMessage(level: LogLevel, msg: string, meta?: Record<string, unknown>): string {
  const entry = {
    time: new Date().toISOString(),
    level,
    msg,
    ...meta,
  }
  return JSON.stringify(entry)
}

function log(level: LogLevel, msg: string, meta?: Record<string, unknown>) {
  if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[currentLevel]) return
  const out = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
  out(formatMessage(level, msg, meta))
}

export const logger = {
  debug(msg: string, meta?: Record<string, unknown>) { log('debug', msg, meta) },
  info(msg: string, meta?: Record<string, unknown>) { log('info', msg, meta) },
  warn(msg: string, meta?: Record<string, unknown>) { log('warn', msg, meta) },
  error(msg: string, meta?: Record<string, unknown>) { log('error', msg, meta) },
  log(level: LogLevel, msg: string, meta?: Record<string, unknown>) { log(level, msg, meta) },
}
