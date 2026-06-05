import { runMigrations } from '../db/migrate.js'
import { seedDemo } from '../db/seed.js'
import { pool } from '../db/pool.js'

await runMigrations()
await seedDemo()
await pool.end()
