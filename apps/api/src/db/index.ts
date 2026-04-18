import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL || 'postgres://taxos:taxos@localhost:5432/taxos'

export const pool = new Pool({ connectionString })

export const db = drizzle(pool, { schema })
export { schema }
