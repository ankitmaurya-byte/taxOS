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
    `CREATE TABLE IF NOT EXISTS vaults (
      id TEXT PRIMARY KEY NOT NULL,
      org_id TEXT NOT NULL REFERENCES organizations(id),
      name TEXT NOT NULL,
      description TEXT,
      created_by_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY NOT NULL,
      vault_id TEXT NOT NULL REFERENCES vaults(id),
      parent_id TEXT,
      name TEXT NOT NULL,
      created_by_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS ai_chat_conversations (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id),
      org_id TEXT REFERENCES organizations(id),
      title TEXT NOT NULL DEFAULT 'Untitled',
      messages TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS document_contexts (
      id TEXT PRIMARY KEY NOT NULL,
      document_id TEXT NOT NULL REFERENCES documents(id),
      org_id TEXT NOT NULL REFERENCES organizations(id),
      vault_id TEXT REFERENCES vaults(id),
      raw_text TEXT,
      summary TEXT,
      key_entities TEXT DEFAULT '[]',
      metadata TEXT DEFAULT '{}',
      chunk_index INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  ]

  for (const ddl of newTables) {
    sqlite.prepare(ddl).run()
  }
}

function ensureFilingColumns() {
  const tableExists = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'filings'")
    .get() as { name: string } | undefined
  if (!tableExists) return

  const existingColumns = new Set(
    (sqlite.prepare('PRAGMA table_info(filings)').all() as Array<{ name: string }>).map((c) => c.name),
  )
  if (!existingColumns.has('cpa_review_skipped')) {
    sqlite.prepare("ALTER TABLE filings ADD COLUMN cpa_review_skipped INTEGER NOT NULL DEFAULT 0").run()
  }
  if (!existingColumns.has('paused')) {
    sqlite.prepare("ALTER TABLE filings ADD COLUMN paused INTEGER NOT NULL DEFAULT 0").run()
  }
  if (!existingColumns.has('stopped')) {
    sqlite.prepare("ALTER TABLE filings ADD COLUMN stopped INTEGER NOT NULL DEFAULT 0").run()
  }
}

function ensureDocumentVaultColumns() {
  const tableExists = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'documents'")
    .get() as { name: string } | undefined

  if (!tableExists) return

  const existingColumns = new Set(
    (sqlite.prepare('PRAGMA table_info(documents)').all() as Array<{ name: string }>).map((column) => column.name),
  )

  const missingColumns = [
    ['vault_id', "ALTER TABLE documents ADD COLUMN vault_id TEXT REFERENCES vaults(id)"],
    ['folder_id', "ALTER TABLE documents ADD COLUMN folder_id TEXT REFERENCES folders(id)"],
    ['cloudinary_public_id', "ALTER TABLE documents ADD COLUMN cloudinary_public_id TEXT"],
    ['cloudinary_resource_type', "ALTER TABLE documents ADD COLUMN cloudinary_resource_type TEXT"],
    ['file_size', "ALTER TABLE documents ADD COLUMN file_size INTEGER"],
    ['upload_status', "ALTER TABLE documents ADD COLUMN upload_status TEXT DEFAULT 'pending'"],
    ['extraction_status', "ALTER TABLE documents ADD COLUMN extraction_status TEXT DEFAULT 'pending'"],
    ['upload_error', "ALTER TABLE documents ADD COLUMN upload_error TEXT"],
    ['extraction_error', "ALTER TABLE documents ADD COLUMN extraction_error TEXT"],
  ] as const

  for (const [columnName, statement] of missingColumns) {
    if (!existingColumns.has(columnName)) {
      sqlite.prepare(statement).run()
    }
  }
}

function ensureDocumentStorageUrlNullable() {
  const tableExists = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'documents'")
    .get() as { name: string } | undefined
  if (!tableExists) return

  const storageCol = (sqlite.prepare('PRAGMA table_info(documents)').all() as Array<{ name: string; notnull: number }>)
    .find((c) => c.name === 'storage_url')
  if (!storageCol || storageCol.notnull === 0) return

  // Rebuild the documents table without the NOT NULL constraint on storage_url.
  // Files that exceed the Cloudinary 1 MB cap are intentionally stored without
  // a storage URL — only the extracted context is persisted.
  sqlite.pragma('foreign_keys = OFF')
  sqlite.exec('BEGIN')
  try {
    sqlite.exec(`
      CREATE TABLE documents__new (
        id TEXT PRIMARY KEY NOT NULL,
        filing_id TEXT REFERENCES filings(id),
        org_id TEXT NOT NULL REFERENCES organizations(id),
        vault_id TEXT REFERENCES vaults(id),
        folder_id TEXT REFERENCES folders(id),
        file_name TEXT NOT NULL,
        storage_url TEXT,
        cloudinary_public_id TEXT,
        cloudinary_resource_type TEXT,
        file_size INTEGER,
        mime_type TEXT NOT NULL,
        extracted_data TEXT,
        ai_tags TEXT DEFAULT '[]',
        confidence_score REAL,
        upload_status TEXT DEFAULT 'pending',
        extraction_status TEXT DEFAULT 'pending',
        upload_error TEXT,
        extraction_error TEXT,
        reviewed_by_human INTEGER DEFAULT 0,
        uploaded_by_id TEXT NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO documents__new (
        id, filing_id, org_id, vault_id, folder_id, file_name, storage_url,
        cloudinary_public_id, cloudinary_resource_type, file_size, mime_type,
        extracted_data, ai_tags, confidence_score, upload_status, extraction_status,
        upload_error, extraction_error, reviewed_by_human, uploaded_by_id, created_at
      )
      SELECT
        id, filing_id, org_id, vault_id, folder_id, file_name, storage_url,
        cloudinary_public_id, cloudinary_resource_type, file_size, mime_type,
        extracted_data, ai_tags, confidence_score, upload_status, extraction_status,
        upload_error, extraction_error, reviewed_by_human, uploaded_by_id, created_at
      FROM documents;
      DROP TABLE documents;
      ALTER TABLE documents__new RENAME TO documents;
    `)
    sqlite.exec('COMMIT')
    sqlite.pragma('foreign_keys = ON')
    // Normalise legacy empty-string sentinels that were used when the column
    // was NOT NULL — frontend relies on null to mean "no blob stored".
    sqlite.prepare(`UPDATE documents SET storage_url = NULL WHERE storage_url = ''`).run()
    console.log('[migration] rebuilt documents table — storage_url is now nullable')
  } catch (err) {
    sqlite.exec('ROLLBACK')
    sqlite.pragma('foreign_keys = ON')
    throw err
  }
}

ensureEntityColumns()
ensureNewTables()
ensureDocumentVaultColumns()
ensureDocumentStorageUrlNullable()
ensureFilingColumns()

export const db = drizzle(sqlite, { schema })
export { schema }
