type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const LEVEL_LABEL: Record<LogLevel, string> = {
  debug: '  DEBUG  ',
  info:  '  INFO   ',
  warn:  ' WARNING ',
  error: '  ERROR  ',
}

const LEVEL_COLOR: Record<LogLevel, string> = {
  debug: '\x1b[90m',   // gray
  info:  '\x1b[36m',   // cyan
  warn:  '\x1b[33m',   // yellow
  error: '\x1b[31m',   // red
}

const RESET  = '\x1b[0m'
const DIM    = '\x1b[2m'
const BOLD   = '\x1b[1m'
const WHITE  = '\x1b[37m'
const GREEN  = '\x1b[32m'
const MAGENTA = '\x1b[35m'

const currentLevel = (process.env.LOG_LEVEL || 'info') as LogLevel
const useColor = process.env.NO_COLOR !== '1'

function c(color: string, text: string): string {
  return useColor ? `${color}${text}${RESET}` : text
}

const BORDER = '///////////////////////////////////////////////////////////////////////////////';

function formatStack(stack: string | undefined): string {
  if (!stack) return ''
  return stack
    .split('\n')
    .slice(1, 8)
    .map(line => `  ${line.trim()}`)
    .join('\n')
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) return '—'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function buildBlock(level: LogLevel, title: string, fields: [string, unknown][], stackTrace?: string): string {
  const lines: string[] = []
  const timestamp = new Date().toISOString()
  const levelTag = `[${LEVEL_LABEL[level].trim()}]`

  lines.push('')
  lines.push(c(LEVEL_COLOR[level], BORDER))
  lines.push(c(LEVEL_COLOR[level], `${BOLD}  ${levelTag}  ${title}`))
  lines.push(c(DIM, `  Timestamp: ${timestamp}`))
  lines.push(c(LEVEL_COLOR[level], '  ' + '─'.repeat(75)))

  for (const [key, value] of fields) {
    if (value === undefined || value === null) continue
    const formatted = formatValue(value)
    if (formatted.includes('\n')) {
      lines.push(c(WHITE, `  ${BOLD}${key}:`))
      for (const subLine of formatted.split('\n')) {
        lines.push(c(DIM, `    ${subLine}`))
      }
    } else {
      lines.push(`  ${c(WHITE, `${BOLD}${key}:`)} ${c(DIM, formatted)}`)
    }
  }

  if (stackTrace) {
    lines.push(c(LEVEL_COLOR[level], '  ' + '─'.repeat(75)))
    lines.push(c(WHITE, `  ${BOLD}Stack Trace:`))
    lines.push(c(DIM, stackTrace))
  }

  lines.push(c(LEVEL_COLOR[level], BORDER))
  lines.push('')

  return lines.join('\n')
}

function log(level: LogLevel, msg: string, meta?: Record<string, unknown>) {
  if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[currentLevel]) return

  const fields: [string, unknown][] = []
  if (meta) {
    for (const [key, value] of Object.entries(meta)) {
      if (key === 'stack') continue
      fields.push([key, value])
    }
  }

  const stack = meta?.stack ? formatStack(meta.stack as string) : undefined
  const output = buildBlock(level, msg, fields, stack)

  const out = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
  out(output)
}

/**
 * Log a full HTTP request/response cycle with all details.
 */
function logRequest(opts: {
  method: string
  path: string
  status: number
  duration: number
  userId?: string
  orgId?: string
  role?: string
  params?: Record<string, unknown>
  query?: Record<string, unknown>
  body?: Record<string, unknown>
  responseBody?: unknown
  error?: string
}) {
  const level: LogLevel = opts.status >= 500 ? 'error' : opts.status >= 400 ? 'warn' : 'info'
  if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[currentLevel]) return

  const statusText = opts.status >= 500 ? 'FAILED' : opts.status >= 400 ? 'CLIENT ERROR' : 'OK'
  const title = `${opts.method} ${opts.path}  →  ${opts.status} ${statusText}  (${opts.duration}ms)`

  const fields: [string, unknown][] = [
    ['Endpoint', `${opts.method} ${opts.path}`],
    ['Status', `${opts.status} (${statusText})`],
    ['Duration', `${opts.duration}ms`],
    ['User ID', opts.userId],
    ['Org ID', opts.orgId],
    ['Role', opts.role],
  ]

  if (opts.params && Object.keys(opts.params).length > 0) {
    fields.push(['Route Params', opts.params])
  }
  if (opts.query && Object.keys(opts.query).length > 0) {
    fields.push(['Query Params', opts.query])
  }
  if (opts.body && Object.keys(opts.body).length > 0) {
    // Redact sensitive fields
    const sanitized = { ...opts.body }
    for (const key of ['password', 'token', 'secret', 'apiKey', 'authorization']) {
      if (key in sanitized) sanitized[key] = '[REDACTED]'
    }
    fields.push(['Request Body', sanitized])
  }
  if (opts.responseBody !== undefined) {
    fields.push(['Response', opts.responseBody])
  }
  if (opts.error) {
    fields.push(['Error', opts.error])
  }

  const output = buildBlock(level, title, fields)
  const out = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
  out(output)
}

export const logger = {
  debug(msg: string, meta?: Record<string, unknown>) { log('debug', msg, meta) },
  info(msg: string, meta?: Record<string, unknown>) { log('info', msg, meta) },
  warn(msg: string, meta?: Record<string, unknown>) { log('warn', msg, meta) },
  error(msg: string, meta?: Record<string, unknown>) { log('error', msg, meta) },
  log(level: LogLevel, msg: string, meta?: Record<string, unknown>) { log(level, msg, meta) },
  request: logRequest,
}
