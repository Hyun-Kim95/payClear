import { runMigrations } from '../db/migrate.js'
import { pool } from '../db/pool.js'

await runMigrations()
await pool.end()
