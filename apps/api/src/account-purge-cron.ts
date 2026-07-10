import { msUntilNextKst } from './notify/schedule-cron.js'
import { purgeDueAccounts } from './account-deletion.js'

export function startAccountPurgeCronSchedule(): void {
  const hour = Number(process.env.ACCOUNT_PURGE_CRON_HOUR_KST ?? 3)
  const minute = Number(process.env.ACCOUNT_PURGE_CRON_MINUTE_KST ?? 0)

  const run = async () => {
    try {
      const result = await purgeDueAccounts(false)
      console.log('[ACCOUNT_PURGE_CRON]', JSON.stringify(result))
    } catch (e) {
      console.error('[ACCOUNT_PURGE_CRON] failed', e)
    }
    setTimeout(run, msUntilNextKst(hour, minute))
  }

  const delay = msUntilNextKst(hour, minute)
  console.log(
    `ACCOUNT_PURGE_CRON: scheduled at ${hour}:${String(minute).padStart(2, '0')} KST daily (next in ${Math.round(delay / 60_000)} min)`,
  )
  setTimeout(run, delay)
}
