import { query, queryOne } from './db/pool.js'
import { formatPgTimestamp } from './debt-helpers.js'
import { hashPin, validateAppPin, verifyPinHash } from './pin-crypto.js'

const APP_PIN_MAX_ATTEMPTS = 5
const APP_PIN_LOCK_MINUTES = 5

export interface SecurityState {
  pin_set: boolean
  lock_timeout_minutes: number
  locked_until: string | null
  failed_count: number
}

export async function getSecurityState(userId: string): Promise<SecurityState> {
  const row = await queryOne<{
    app_pin_hash: string | null
    lock_timeout_minutes: number
    app_pin_locked_until: unknown
    app_pin_failed_count: number
  }>(
    `SELECT app_pin_hash, lock_timeout_minutes, app_pin_locked_until, app_pin_failed_count
     FROM users WHERE id = $1`,
    [userId],
  )
  const lockedUntil = row?.app_pin_locked_until
    ? formatPgTimestamp(row.app_pin_locked_until)
    : null
  return {
    pin_set: !!row?.app_pin_hash,
    lock_timeout_minutes: row?.lock_timeout_minutes ?? 5,
    locked_until: lockedUntil,
    failed_count: row?.app_pin_failed_count ?? 0,
  }
}

export async function setAppPin(
  userId: string,
  pin: string,
  currentPin?: string,
): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const err = validateAppPin(pin)
  if (err) return { ok: false, code: 'VALIDATION_ERROR', message: err }

  const row = await queryOne<{ app_pin_hash: string | null }>(
    'SELECT app_pin_hash FROM users WHERE id = $1',
    [userId],
  )
  if (row?.app_pin_hash) {
    if (!currentPin) {
      return { ok: false, code: 'VALIDATION_ERROR', message: '현재 PIN을 입력해 주세요.' }
    }
    if (!verifyPinHash(currentPin, row.app_pin_hash)) {
      return { ok: false, code: 'VALIDATION_ERROR', message: '현재 PIN이 맞지 않습니다.' }
    }
  }

  await query(
    `UPDATE users SET app_pin_hash = $1, app_pin_failed_count = 0, app_pin_locked_until = NULL,
     updated_at = NOW() WHERE id = $2`,
    [hashPin(pin), userId],
  )
  return { ok: true }
}

export async function verifyAppPin(
  userId: string,
  pin: string,
): Promise<
  | { ok: true }
  | { ok: false; code: 'APP_PIN_INVALID' | 'APP_PIN_LOCKED'; message: string; remaining?: number }
> {
  const err = validateAppPin(pin)
  if (err) return { ok: false, code: 'APP_PIN_INVALID', message: err }

  const row = await queryOne<{
    app_pin_hash: string | null
    app_pin_failed_count: number
    app_pin_locked_until: unknown
  }>(
    `SELECT app_pin_hash, app_pin_failed_count, app_pin_locked_until FROM users WHERE id = $1`,
    [userId],
  )
  if (!row?.app_pin_hash) {
    return { ok: false, code: 'APP_PIN_INVALID', message: 'PIN이 설정되지 않았습니다.' }
  }

  const lockedUntil = row.app_pin_locked_until
    ? formatPgTimestamp(row.app_pin_locked_until)
    : null
  if (lockedUntil && new Date(lockedUntil) > new Date()) {
    return { ok: false, code: 'APP_PIN_LOCKED', message: '5분 후 다시 시도해 주세요.' }
  }

  if (!verifyPinHash(pin, row.app_pin_hash)) {
    const next = row.app_pin_failed_count + 1
    if (next >= APP_PIN_MAX_ATTEMPTS) {
      const until = new Date(Date.now() + APP_PIN_LOCK_MINUTES * 60 * 1000).toISOString()
      await query(
        `UPDATE users SET app_pin_failed_count = $1, app_pin_locked_until = $2 WHERE id = $3`,
        [next, until, userId],
      )
      return { ok: false, code: 'APP_PIN_LOCKED', message: '5분 후 다시 시도해 주세요.' }
    }
    await query(`UPDATE users SET app_pin_failed_count = $1 WHERE id = $2`, [next, userId])
    return {
      ok: false,
      code: 'APP_PIN_INVALID',
      message: `PIN이 맞지 않습니다. (남은 ${APP_PIN_MAX_ATTEMPTS - next}회)`,
      remaining: APP_PIN_MAX_ATTEMPTS - next,
    }
  }

  await query(
    `UPDATE users SET app_pin_failed_count = 0, app_pin_locked_until = NULL WHERE id = $1`,
    [userId],
  )
  return { ok: true }
}

export async function updateLockTimeout(
  userId: string,
  minutes: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (![1, 5, 15].includes(minutes)) {
    return { ok: false, message: '잠금 시간은 1, 5, 15분만 가능합니다.' }
  }
  await query(`UPDATE users SET lock_timeout_minutes = $1, updated_at = NOW() WHERE id = $2`, [
    minutes,
    userId,
  ])
  return { ok: true }
}
