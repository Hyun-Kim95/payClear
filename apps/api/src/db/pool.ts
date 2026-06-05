import pg from 'pg'
import 'dotenv/config'

const { Pool } = pg

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required. Copy apps/api/.env.example to .env')
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params)
}

export async function queryOne<T extends pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T | undefined> {
  const res = await query<T>(text, params)
  return res.rows[0]
}

export async function pingDb(): Promise<boolean> {
  try {
    await query('SELECT 1')
    return true
  } catch {
    return false
  }
}
