/**
 * OAuth exchange code smoke — create code → POST /auth/exchange → JWT /me.
 * Requires API on PORT (default 3910) and migrations 010 applied.
 */
import 'dotenv/config'
import { createExchangeCode } from '../auth/oauth.js'
import { query } from '../db/pool.js'

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3910/api/v1'

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`)
  console.log(`OK: ${msg}`)
}

async function main() {
  await query(
    `UPDATE users SET app_pin_hash = NULL, pin_unlock_until = NULL,
     app_pin_failed_count = 0, app_pin_locked_until = NULL WHERE id = 'user-1'`,
  )

  const devMe = await fetch(`${BASE}/me`, { headers: { Authorization: 'Bearer dev-token' } })
  const devBody = await devMe.json()
  assert(devMe.status === 200 && devBody.id, 'dev-token /me for user id')

  const code = await createExchangeCode(devBody.id as string)

  const bad = await fetch(`${BASE}/auth/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'invalid-code' }),
  })
  assert(bad.status === 400 && (await bad.json()).error?.code === 'EXCHANGE_INVALID', 'invalid code rejected')

  const exchange = await fetch(`${BASE}/auth/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  const exchangeBody = await exchange.json()
  assert(exchange.status === 200 && exchangeBody.token, 'exchange returns token')

  const reuse = await fetch(`${BASE}/auth/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  assert(reuse.status === 400, 'exchange code single-use')

  const me = await fetch(`${BASE}/me`, {
    headers: { Authorization: `Bearer ${exchangeBody.token}` },
  })
  const meBody = await me.json()
  assert(me.status === 200 && meBody.id === devBody.id, 'JWT /me after exchange')

  // PIN server session: set pin → 423 on protected route → verify → OK
  const setPin = await fetch(`${BASE}/me/security/pin`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${exchangeBody.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pin: '123456' }),
  })
  assert(setPin.status === 200, 'set pin for lock test')

  await fetch(`${BASE}/me/security`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${exchangeBody.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ lock_timeout_minutes: 5 }),
  })

  // Force lock: clear pin_unlock_until
  await query('UPDATE users SET pin_unlock_until = NULL WHERE id = $1', [devBody.id])

  const locked = await fetch(`${BASE}/summary`, {
    headers: { Authorization: `Bearer ${exchangeBody.token}` },
  })
  const lockedBody = await locked.json()
  assert(locked.status === 423 && lockedBody.error?.code === 'APP_PIN_REQUIRED', '423 when pin locked')

  const verify = await fetch(`${BASE}/me/security/verify-pin`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${exchangeBody.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pin: '123456' }),
  })
  assert(verify.status === 200, 'verify pin unlocks session')

  const summary = await fetch(`${BASE}/summary`, {
    headers: { Authorization: `Bearer ${exchangeBody.token}` },
  })
  assert(summary.status === 200, 'summary after pin unlock')

  const unlockBio = await fetch(`${BASE}/me/security/unlock-session`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${exchangeBody.token}` },
  })
  assert(unlockBio.status === 200, 'unlock-session endpoint')

  // cleanup pin for other smokes
  await query(
    `UPDATE users SET app_pin_hash = NULL, pin_unlock_until = NULL,
     app_pin_failed_count = 0, app_pin_locked_until = NULL WHERE id = $1`,
    [devBody.id],
  )

  console.log('\nAll oauth exchange smoke checks passed.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
