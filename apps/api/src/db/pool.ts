import pg from 'pg'
import 'dotenv/config'

const { Pool } = pg

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required. Copy apps/api/.env.example to .env')
}

// Railway 공개 DB URL(외부 프록시)은 SSL을 요구한다.
// 내부 네트워크(DATABASE_URL이 *.railway.internal)에서는 SSL 미적용 유지.
// PGSSLMODE=require 또는 DATABASE_SSL=true일 때만 SSL을 켠다.
const useSsl =
  process.env.PGSSLMODE === 'require' || process.env.DATABASE_SSL === 'true'

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
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
