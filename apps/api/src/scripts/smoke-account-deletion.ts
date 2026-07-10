/**
 * P13 account deletion smoke (AC P13-01~04).
 */
import 'dotenv/config'
import { randomBytes } from 'crypto'
import { query, queryOne } from '../db/pool.js'
import { runMigrations } from '../db/migrate.js'
import { signJwt } from '../auth/jwt.js'

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3910/api/v1'
const CRON_SECRET = process.env.NOTIFY_CRON_SECRET ?? 'smoke-cron-secret'

async function req(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers as Record<string, string>),
    },
  })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`)
  console.log(`OK: ${msg}`)
}

async function main() {
  await runMigrations()

  const dev = await req('/me', 'dev-token')
  assert(dev.status === 200 && dev.data.id, 'P13 setup: dev-token /me')
  const userId = dev.data.id as string

  // P13-01: PIN 설정·미해제 시 탈퇴 요청 → 423
  await req('/me/security/pin', 'dev-token', {
    method: 'POST',
    body: JSON.stringify({ pin: '123456' }),
  })
  await query('UPDATE users SET pin_unlock_until = NULL WHERE id = $1', [userId])
  const blocked = await req('/me/delete-request', 'dev-token', { method: 'POST' })
  assert(blocked.status === 423 && blocked.data.error?.code === 'APP_PIN_REQUIRED', 'P13-01 pin required')

  await req('/me/security/verify-pin', 'dev-token', {
    method: 'POST',
    body: JSON.stringify({ pin: '123456' }),
  })

  // P13-02: 탈퇴 요청 → scheduled_at ≈ 요청+30일
  const schedule = await req('/me/delete-request', 'dev-token', { method: 'POST' })
  assert(schedule.status === 200 && schedule.data.deletion?.scheduled_at, 'P13-02 delete-request')
  const requestedAt = new Date(schedule.data.deletion.requested_at)
  const scheduledAt = new Date(schedule.data.deletion.scheduled_at)
  const diffDays = (scheduledAt.getTime() - requestedAt.getTime()) / (24 * 60 * 60 * 1000)
  assert(Math.abs(diffDays - 30) < 0.01, 'P13-02 grace is 30 days')

  const meScheduled = await req('/me', 'dev-token')
  assert(meScheduled.data.deletion?.days_remaining !== undefined, 'P13-02 /me deletion state')

  const idempotent = await req('/me/delete-request', 'dev-token', { method: 'POST' })
  assert(
    idempotent.data.deletion?.requested_at === schedule.data.deletion.requested_at,
    'P13-02 idempotent schedule',
  )

  // 수동 취소
  const cancel = await req('/me/delete-request/cancel', 'dev-token', { method: 'POST' })
  assert(cancel.status === 200 && cancel.data.deletion === null, 'manual cancel')
  const cancelAgain = await req('/me/delete-request/cancel', 'dev-token', { method: 'POST' })
  assert(cancelAgain.status === 400 && cancelAgain.data.error?.code === 'DELETE_NOT_SCHEDULED', 'cancel without schedule')

  // P13-03: 유예 중 재로그인(exchange) → 자동 취소
  await req('/me/delete-request', 'dev-token', { method: 'POST' })
  const exchangeCode = randomBytes(24).toString('base64url')
  const expiresAt = new Date(Date.now() + 60_000).toISOString()
  await query(
    'INSERT INTO oauth_exchange_codes (code, user_id, expires_at) VALUES ($1, $2, $3)',
    [exchangeCode, userId, expiresAt],
  )
  const exchangeRes = await fetch(`${BASE}/auth/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: exchangeCode }),
  })
  const exchangeBody = await exchangeRes.json()
  assert(exchangeRes.status === 200 && exchangeBody.deletion_cancelled === true, 'P13-03 login auto-cancel')
  const jwt = exchangeBody.token as string
  const meAfterLogin = await req('/me', jwt)
  assert(meAfterLogin.data.deletion === null, 'P13-03 deletion cleared after login')

  // P13-04: purge due accounts
  const purgeUserId = `purge-smoke-${Date.now()}`
  await query('INSERT INTO users (id) VALUES ($1)', [purgeUserId])
  await query(
    `UPDATE users SET deletion_requested_at = NOW() - interval '31 days' WHERE id = $1`,
    [purgeUserId],
  )
  const contactId = `contact-${purgeUserId}`
  await query(
    'INSERT INTO contacts (id, user_id, display_name) VALUES ($1, $2, $3)',
    [contactId, purgeUserId, 'purge-test'],
  )
  const debtId = `debt-${purgeUserId}`
  await query(
    `INSERT INTO debts (id, user_id, contact_id, direction, principal, occurred_on, reason)
     VALUES ($1, $2, $3, 'lent', 1000, CURRENT_DATE, 'smoke')`,
    [debtId, purgeUserId, contactId],
  )

  const dryPurge = await fetch(`${BASE}/internal/account-purge/run?dryRun=true`, {
    method: 'POST',
    headers: { 'X-Notify-Cron-Secret': CRON_SECRET },
  })
  const dryBody = await dryPurge.json()
  assert(dryPurge.status === 200 && dryBody.user_ids?.includes(purgeUserId), 'P13-04 purge dry-run')

  const purge = await fetch(`${BASE}/internal/account-purge/run`, {
    method: 'POST',
    headers: { 'X-Notify-Cron-Secret': CRON_SECRET },
  })
  const purgeBody = await purge.json()
  assert(purge.status === 200 && purgeBody.purged_count >= 1, 'P13-04 purge executed')

  const gone = await queryOne('SELECT id FROM users WHERE id = $1', [purgeUserId])
  assert(!gone, 'P13-04 user deleted')
  const debtGone = await queryOne('SELECT id FROM debts WHERE id = $1', [debtId])
  assert(!debtGone, 'P13-04 debt cascade deleted')

  const purgeJwt = await signJwt(purgeUserId)
  const unauthorized = await req('/me', purgeJwt)
  assert(unauthorized.status === 401, 'P13-04 purged user unauthorized')

  // cleanup: clear pin on dev user
  await query(
    `UPDATE users SET app_pin_hash = NULL, app_pin_failed_count = 0, app_pin_locked_until = NULL,
     pin_unlock_until = NULL, deletion_requested_at = NULL WHERE id = $1`,
    [userId],
  )

  console.log('smoke-account-deletion: all passed')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
