import pg from 'pg'
import 'dotenv/config'

const adminUrl =
  process.env.DATABASE_ADMIN_URL ?? 'postgresql://postgres@localhost:5432/postgres'
const targetDb = process.env.DATABASE_NAME ?? 'payclear'

const admin = new pg.Client({ connectionString: adminUrl })
await admin.connect()

const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [targetDb])
if (exists.rows.length === 0) {
  await admin.query(`CREATE DATABASE ${targetDb}`)
  console.log(`Created database ${targetDb}`)
} else {
  console.log(`Database ${targetDb} already exists`)
}

await admin.end()
console.log('Run: npm run db:setup')
