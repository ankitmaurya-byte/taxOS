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

ensureEntityColumns()

export const db = drizzle(sqlite, { schema })
export { schema }
