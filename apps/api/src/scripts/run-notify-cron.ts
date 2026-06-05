import 'dotenv/config'
import { runMigrations } from '../db/migrate.js'
import { runDueReminders } from '../notify/send.js'

await runMigrations()
const dryRun = process.argv.includes('--dry-run')
const result = await runDueReminders(dryRun)
console.log('Notify cron done:', result)
