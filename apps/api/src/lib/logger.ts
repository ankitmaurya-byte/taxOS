import fs from 'fs'
import path from 'path'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0, info: 1, warn: 2, error: 3,
}

const LEVEL_LABEL: Record<LogLevel, string> = {
  debug: '  DEBUG  ', info: '  INFO   ', warn: ' WARNING ', error: '  ERROR  ',
}

const LEVEL_COLOR: Record<LogLevel, string> = {
  debug: '\x1b[90m', info: '\x1b[36m', warn: '\x1b[33m', error: '\x1b[31m',
}

const RESET = '\x1b[0m'
const DIM   = '\x1b[2m'
const BOLD  = '\x1b[1m'
const WHITE = '\x1b[37m'

const currentLevel = (process.env.LOG_LEVEL || 'info') as LogLevel
const useColor = process.env.NO_COLOR !== '1'

function c(color: string, text: string): string {
  return useColor ? `${color}${text}${RESET}` : text
}

// Strip ANSI codes for file output
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '')
}

const BORDER = '///////////////////////////////////////////////////////////////////////////////';

// ─── Log directory setup ─────────────────────────────────────────────────────
const LOG_DIR = path.join(process.cwd(), 'logs')

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true })
  }
}

function getLogFilePath(level: LogLevel): string {
  const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  return path.join(LOG_DIR, `${level}-${date}.log`)
}

function getRequestLogFilePath(): string {
  const date = new Date().toISOString().split('T')[0]
  return path.join(LOG_DIR, `requests-${date}.log`)
}

function writeToFile(filePath: string, content: string) {
  try {
    ensureLogDir()
    fs.appendFileSync(filePath, stripAnsi(content) + '\n')
  } catch { /* silent fail — don't crash app if log write fails */ }
}

// ─── Value summarizer — show shape not full data ─────────────────────────────

function summarizeValue(value: unknown, depth = 0): string {
  if (value === undefined || value === null) return '—'
  if (typeof value === 'string') {
    if (value.length > 120) return `"${value.slice(0, 120)}..." (${value.length} chars)`
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)

  if (Array.isArray(value)) {
    if (value.length === 0) return '[] (empty)'
    const itemType = typeof value[0]
    if (itemType === 'object' && value[0] !== null) {
      const keys = Object.keys(value[0])
      return `Array[${value.length}] { ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? ', ...' : ''} }`
    }
    if (value.length <= 3) return `[${value.map(v => summarizeValue(v, depth + 1)).join(', ')}]`
    return `Array[${value.length}] <${itemType}>`
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const keys = Object.keys(obj)
    if (keys.length === 0) return '{} (empty)'

    if (depth >= 1) {
      return `{${keys.length} fields: ${keys.slice(0, 6).join(', ')}${keys.length > 6 ? ', ...' : ''}}`
    }

    // Top level: show each field summarized
    const parts: string[] = []
    for (const key of keys.slice(0, 10)) {
      const v = obj[key]
      parts.push(`${key}: ${summarizeValue(v, depth + 1)}`)
    }
    if (keys.length > 10) parts.push(`... +${keys.length - 10} more fields`)
    return parts.join('\n    ')
  }

  return String(value)
}

const SENSITIVE_KEYS = new Set(['password', 'passwordHash', 'token', 'secret', 'apiKey', 'authorization'])

function sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    out[k] = SENSITIVE_KEYS.has(k) ? '[REDACTED]' : v
  }
  return out
}

// ─── Format stack trace ──────────────────────────────────────────────────────

function formatStack(stack: string | undefined): string {
  if (!stack) return ''
  return stack.split('\n').slice(1, 8).map(line => `  ${line.trim()}`).join('\n')
}

// ─── Build bordered log block ────────────────────────────────────────────────

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
    const summary = summarizeValue(value)
    if (summary.includes('\n')) {
      lines.push(c(WHITE, `  ${BOLD}${key}:`))
      for (const subLine of summary.split('\n')) {
        lines.push(c(DIM, `    ${subLine}`))
      }
    } else {
      lines.push(`  ${c(WHITE, `${BOLD}${key}:`)} ${c(DIM, summary)}`)
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

// ─── Core log function ───────────────────────────────────────────────────────

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

  // Console output
  const out = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
  out(output)

  // File output
  // writeToFile(getLogFilePath(level), output)
}

// ─── HTTP request logger ─────────────────────────────────────────────────────

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
    fields.push(['Request Body', sanitizeBody(opts.body)])
  }
  if (opts.responseBody !== undefined) {
    fields.push(['Response', opts.responseBody])
  }
  if (opts.error) {
    fields.push(['Error', opts.error])
  }

  const output = buildBlock(level, title, fields)

  // Console
  const out = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
  out(output)

  // File — all requests go to requests log + level-specific log
  writeToFile(getRequestLogFilePath(), output)
  if (level !== 'info') writeToFile(getLogFilePath(level), output)
}

export const logger = {
  debug(msg: string, meta?: Record<string, unknown>) { log('debug', msg, meta) },
  info(msg: string, meta?: Record<string, unknown>) { log('info', msg, meta) },
  warn(msg: string, meta?: Record<string, unknown>) { log('warn', msg, meta) },
  error(msg: string, meta?: Record<string, unknown>) { log('error', msg, meta) },
  log(level: LogLevel, msg: string, meta?: Record<string, unknown>) { log(level, msg, meta) },
  request: logRequest,
}
