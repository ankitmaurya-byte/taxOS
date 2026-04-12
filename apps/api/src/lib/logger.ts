type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const LEVEL_LABEL: Record<LogLevel, string> = {
  debug: 'DBG',
  info: 'INF',
  warn: 'WRN',
  error: 'ERR',
}

const LEVEL_COLOR: Record<LogLevel, string> = {
  debug: '\x1b[90m',   // gray
  info: '\x1b[36m',    // cyan
  warn: '\x1b[33m',    // yellow
  error: '\x1b[31m',   // red
}

const RESET = '\x1b[0m'
const DIM = '\x1b[2m'
const BOLD = '\x1b[1m'

const currentLevel = (process.env.LOG_LEVEL || 'info') as LogLevel
const useColor = process.env.NO_COLOR !== '1'

function colorize(color: string, text: string): string {
  return useColor ? `${color}${text}${RESET}` : text
}

function formatMeta(meta: Record<string, unknown>): string {
  const parts: string[] = []
  for (const [key, value] of Object.entries(meta)) {
    if (key === 'stack' || value === undefined || value === null || value === '-') continue
    if (typeof value === 'string') {
      parts.push(`${key}=${value}`)
    } else if (typeof value === 'number') {
      parts.push(`${key}=${value}`)
    } else {
      parts.push(`${key}=${JSON.stringify(value)}`)
    }
  }
  return parts.join(' :: ')
}

function formatStack(stack: string | undefined): string {
  if (!stack) return ''
  const lines = stack.split('\n').slice(1, 6) // skip message line, show up to 5 frames
  return lines.map(line => `    ${line.trim()}`).join('\n')
}

function log(level: LogLevel, msg: string, meta?: Record<string, unknown>) {
  if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[currentLevel]) return

  const label = colorize(LEVEL_COLOR[level], `${BOLD}${LEVEL_LABEL[level]}${RESET}`)
  const metaStr = meta ? formatMeta(meta) : ''
  const details = metaStr ? ` ${colorize(DIM, `:: ${metaStr}`)}` : ''

  const out = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
  out(`${label} ${msg}${details}`)

  // Print stack trace for errors
  if (level === 'error' && meta?.stack) {
    console.error(colorize(DIM, formatStack(meta.stack as string)))
  }
}

export const logger = {
  debug(msg: string, meta?: Record<string, unknown>) { log('debug', msg, meta) },
  info(msg: string, meta?: Record<string, unknown>) { log('info', msg, meta) },
  warn(msg: string, meta?: Record<string, unknown>) { log('warn', msg, meta) },
  error(msg: string, meta?: Record<string, unknown>) { log('error', msg, meta) },
  log(level: LogLevel, msg: string, meta?: Record<string, unknown>) { log(level, msg, meta) },
}
