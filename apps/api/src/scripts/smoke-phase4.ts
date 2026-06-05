/**
 * Phase 4 PWA security + notifications smoke (dev-token).
 */
import 'dotenv/config'
import { runDueReminders } from '../notify/send.js'

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3910/api/v1'

async function req(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers as Record<string, string>),
    },
  })
  if (res.status === 204) return { status: res.status, data: {} }
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`)
  console.log(`OK: ${msg}`)
}

async function main() {
  const token = 'dev-token'

  const sec0 = await req('/me/security', token)
  assert(sec0.status === 200, 'GET /me/security')

  const setPin = await req('/me/security/pin', token, {
    method: 'POST',
    body: JSON.stringify({ pin: '1234' }),
  })
  assert(setPin.status === 200 && setPin.data.ok, 'POST /me/security/pin')

  const sec1 = await req('/me/security', token)
  assert(sec1.data.pin_set === true, 'pin_set after setup')

  const verifyOk = await req('/me/security/verify-pin', token, {
    method: 'POST',
    body: JSON.stringify({ pin: '1234' }),
  })
  assert(verifyOk.status === 200 && verifyOk.data.ok, 'verify-pin success')

  const verifyBad = await req('/me/security/verify-pin', token, {
    method: 'POST',
    body: JSON.stringify({ pin: '9999' }),
  })
  assert(verifyBad.status === 401, 'verify-pin wrong pin')

  const patchTimeout = await req('/me/security', token, {
    method: 'PATCH',
    body: JSON.stringify({ lock_timeout_minutes: 15 }),
  })
  assert(patchTimeout.status === 200 && patchTimeout.data.lock_timeout_minutes === 15, 'PATCH lock timeout')

  const notifGet = await req('/me/notification-settings', token)
  assert(notifGet.status === 200 && notifGet.data.push_enabled !== undefined, 'GET notification-settings')

  const notifPatch = await req('/me/notification-settings', token, {
    method: 'PATCH',
    body: JSON.stringify({ remind_d1: true, remind_d0: false }),
  })
  assert(notifPatch.status === 200 && notifPatch.data.remind_d0 === false, 'PATCH notification-settings')

  const pushSub = await req('/me/push-subscription', token, {
    method: 'POST',
    body: JSON.stringify({
      endpoint: 'https://push.example/smoke-phase4',
      keys: { p256dh: 'dGVzdA==', auth: 'dGVzdA==' },
    }),
  })
  assert(pushSub.status === 201 && pushSub.data.ok, 'POST push-subscription')

  const pushDel = await req('/me/push-subscription', token, {
    method: 'DELETE',
    body: JSON.stringify({ endpoint: 'https://push.example/smoke-phase4' }),
  })
  assert(pushDel.status === 204, 'DELETE push-subscription')

  const vapid = await fetch(`${BASE}/public/push-vapid-key`)
  assert(vapid.status === 200 || vapid.status === 503, 'push-vapid-key responds')

  const cron = await runDueReminders(true)
  assert(typeof cron.sent_push === 'number', 'notify cron dry-run')

  console.log('\nAll phase-4 smoke checks passed.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
