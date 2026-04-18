import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import path from 'path'

async function main() {
  const connectionString = process.env.DATABASE_URL || 'postgres://taxos:taxos@localhost:5432/taxos'
  const pool = new Pool({ connectionString })
  const db = drizzle(pool)
  await migrate(db, { migrationsFolder: path.join(__dirname, 'migrations') })
  await pool.end()
  console.log('[migrate] done')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
