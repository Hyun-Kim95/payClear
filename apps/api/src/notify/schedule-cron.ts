import { runDueReminders } from './send.js'

/** Asia/Seoul 기준 다음 hour:minute까지 남은 ms */
export function msUntilNextKst(hour: number, minute: number): number {
  const now = Date.now()
  for (let mins = 1; mins <= 48 * 60; mins++) {
    const t = new Date(now + mins * 60_000)
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Seoul',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(t)
    const h = Number(parts.find((p) => p.type === 'hour')?.value)
    const m = Number(parts.find((p) => p.type === 'minute')?.value)
    if (h === hour && m === minute) return mins * 60_000
  }
  return 24 * 60 * 60_000
}

export function startNotifyCronSchedule(): void {
  const hour = Number(process.env.NOTIFY_CRON_HOUR_KST ?? 9)
  const minute = Number(process.env.NOTIFY_CRON_MINUTE_KST ?? 0)

  const run = async () => {
    try {
      const result = await runDueReminders(false)
      console.log('[NOTIFY_CRON]', JSON.stringify(result))
    } catch (e) {
      console.error('[NOTIFY_CRON] failed', e)
    }
    setTimeout(run, msUntilNextKst(hour, minute))
  }

  const delay = msUntilNextKst(hour, minute)
  console.log(
    `NOTIFY_CRON: scheduled at ${hour}:${String(minute).padStart(2, '0')} KST daily (next in ${Math.round(delay / 60_000)} min)`,
  )
  setTimeout(run, delay)
}
