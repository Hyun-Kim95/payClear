import fs from 'node:fs'
import pg from 'pg'
import 'dotenv/config'

const { Pool } = pg

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required. Copy apps/api/.env.example to .env')
}

const dbUrl = process.env.DATABASE_URL
const isRailwayInternal = dbUrl.includes('.railway.internal')

const useSsl =
  !isRailwayInternal &&
  (process.env.PGSSLMODE === 'require' || process.env.DATABASE_SSL === 'true')

function buildSslConfig(): pg.ConnectionConfig['ssl'] | undefined {
  if (!useSsl) return undefined
  const rejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true'
  const caPath = process.env.DATABASE_SSL_CA
  if (caPath) {
    return {
      rejectUnauthorized,
      ca: fs.readFileSync(caPath, 'utf8'),
    }
  }
  return { rejectUnauthorized }
}

export const pool = new Pool({
  connectionString: dbUrl,
  ...(useSsl ? { ssl: buildSslConfig() } : {}),
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
