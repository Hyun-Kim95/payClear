import { readFileSync, readdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { pool, query } from './pool.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function runMigrations() {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  const migrationsDir = path.join(__dirname, '..', '..', 'migrations')
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    const id = file.replace(/\.sql$/, '')
    const existing = await query('SELECT id FROM schema_migrations WHERE id = $1', [id])
    if (existing.rows.length > 0) {
      console.log(`Migration ${id} already applied`)
      continue
    }

    const sql = readFileSync(path.join(migrationsDir, file), 'utf8')
    await pool.query(sql)
    await query('INSERT INTO schema_migrations (id) VALUES ($1)', [id])
    console.log(`Applied migration ${id}`)
  }
}
