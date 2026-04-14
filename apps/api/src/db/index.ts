import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import path from 'path'

const dbPath = process.env.DATABASE_URL || path.join(__dirname, '../../taxos.db')
const sqlite = new Database(dbPath)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

function ensureEntityColumns() {
  const tableExists = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'entities'")
    .get() as { name: string } | undefined

  if (!tableExists) return

  const existingColumns = new Set(
    (sqlite.prepare('PRAGMA table_info(entities)').all() as Array<{ name: string }>).map((column) => column.name),
  )

  const missingColumns = [
    ['directors', "ALTER TABLE entities ADD COLUMN directors TEXT DEFAULT '[]'"],
    ['officers', "ALTER TABLE entities ADD COLUMN officers TEXT DEFAULT '[]'"],
    ['shareholders', "ALTER TABLE entities ADD COLUMN shareholders TEXT DEFAULT '[]'"],
    ['cap_table', "ALTER TABLE entities ADD COLUMN cap_table TEXT DEFAULT '[]'"],
    ['sensitive_data', "ALTER TABLE entities ADD COLUMN sensitive_data TEXT DEFAULT '[]'"],
  ] as const

  for (const [columnName, statement] of missingColumns) {
    if (!existingColumns.has(columnName)) {
      sqlite.prepare(statement).run()
    }
  }
}

function ensureNewTables() {
  const newTables: string[] = [
    `CREATE TABLE IF NOT EXISTS cpa_notifications (
      id TEXT PRIMARY KEY NOT NULL,
      filing_id TEXT NOT NULL REFERENCES filings(id),
      cpa_user_id TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'pending',
      notified_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      responded_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS cpa_rejections (
      id TEXT PRIMARY KEY NOT NULL,
      filing_id TEXT NOT NULL REFERENCES filings(id),
      cpa_user_id TEXT NOT NULL REFERENCES users(id),
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS org_chat_messages (
      id TEXT PRIMARY KEY NOT NULL,
      org_id TEXT NOT NULL REFERENCES organizations(id),
      sender_id TEXT NOT NULL REFERENCES users(id),
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS founder_chat_messages (
      id TEXT PRIMARY KEY NOT NULL,
      sender_id TEXT NOT NULL REFERENCES users(id),
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS cpa_chat_messages (
      id TEXT PRIMARY KEY NOT NULL,
      sender_id TEXT NOT NULL REFERENCES users(id),
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  ]

  for (const ddl of newTables) {
    sqlite.prepare(ddl).run()
  }
}

ensureEntityColumns()
ensureNewTables()

export const db = drizzle(sqlite, { schema })
export { schema }
