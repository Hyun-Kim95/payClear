import { randomBytes } from 'crypto'
import { randomUUID } from 'crypto'
import { hashPin, verifyPinHash } from './pin-crypto.js'
import { query, queryOne } from './db/pool.js'
import { formatPgDate, formatPgTimestamp, getDebtRow, getLedger } from './debt-helpers.js'
import {
  computeBalance,
  computeDisplayLabel,
  deriveStatus,
  isOverdue,
  type DebtRow,
} from './domain.js'

const PIN_MAX_ATTEMPTS = 5
const PIN_LOCK_MINUTES = 15

export interface ShareTokenRow {
  id: string
  debt_id: string
  token: string
  pin_hash: string | null
  anonymous: boolean
  include_reason: boolean
  expires_at: string | null
  revoked_at: string | null
  pin_failed_count: number
  pin_locked_until: string | null
  created_at: string
}

function generateToken(): string {
  return randomBytes(24).toString('base64url')
}

function shareUrl(token: string): string {
  const origin = process.env.WEB_ORIGIN ?? 'http://localhost:5173'
  return `${origin}/s/${token}`
}

function isActive(row: ShareTokenRow): boolean {
  if (row.revoked_at) return false
  if (row.expires_at && new Date(row.expires_at) <= new Date()) return false
  return true
}

function mapShareRow(row: Record<string, unknown>): ShareTokenRow {
  return {
    id: row.id as string,
    debt_id: row.debt_id as string,
    token: row.token as string,
    pin_hash: (row.pin_hash as string) ?? null,
    anonymous: Boolean(row.anonymous),
    include_reason: row.include_reason !== false && row.include_reason !== 'false',
    expires_at: row.expires_at ? formatPgTimestamp(row.expires_at) : null,
    revoked_at: row.revoked_at ? formatPgTimestamp(row.revoked_at) : null,
    pin_failed_count: Number(row.pin_failed_count ?? 0),
    pin_locked_until: row.pin_locked_until ? formatPgTimestamp(row.pin_locked_until) : null,
    created_at: formatPgTimestamp(row.created_at) ?? '',
  }
}

export function toShareResponse(row: ShareTokenRow) {
  return {
    token: row.token,
    url: shareUrl(row.token),
    expires_at: row.expires_at,
    has_pin: !!row.pin_hash,
    anonymous: row.anonymous,
    include_reason: row.include_reason,
    created_at: row.created_at,
  }
}

export async function revokeActiveForDebt(debtId: string): Promise<void> {
  await query(
    `UPDATE share_tokens SET revoked_at = NOW() WHERE debt_id = $1 AND revoked_at IS NULL`,
    [debtId],
  )
}

export async function getActiveShareForDebt(debtId: string): Promise<ShareTokenRow | null> {
  const res = await query(
    `SELECT * FROM share_tokens WHERE debt_id = $1 AND revoked_at IS NULL
     ORDER BY created_at DESC`,
    [debtId],
  )
  for (const row of res.rows) {
    const mapped = mapShareRow(row)
    if (isActive(mapped)) return mapped
  }
  return null
}

export async function createShareToken(
  debtId: string,
  opts: {
    expires_in_days?: number | null
    pin?: string | null
    anonymous?: boolean
    include_reason?: boolean
  },
): Promise<ShareTokenRow> {
  await revokeActiveForDebt(debtId)

  const days = opts.expires_in_days === undefined ? 30 : opts.expires_in_days
  const expiresAt =
    days === null ? null : new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()

  const id = randomUUID()
  const token = generateToken()
  const pinHash = opts.pin ? hashPin(opts.pin) : null

  await query(
    `INSERT INTO share_tokens (id, debt_id, token, pin_hash, anonymous, include_reason, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      id,
      debtId,
      token,
      pinHash,
      opts.anonymous ?? false,
      opts.include_reason !== false,
      expiresAt,
    ],
  )

  const row = await queryOne('SELECT * FROM share_tokens WHERE id = $1', [id])
  return mapShareRow(row!)
}

async function getShareByToken(token: string): Promise<ShareTokenRow | null> {
  const row = await queryOne('SELECT * FROM share_tokens WHERE token = $1', [token])
  if (!row) return null
  const mapped = mapShareRow(row)
  if (!isActive(mapped)) return null
  return mapped
}

async function recordPinFailure(share: ShareTokenRow): Promise<{ locked: boolean; remaining: number }> {
  const next = share.pin_failed_count + 1
  if (next >= PIN_MAX_ATTEMPTS) {
    const lockedUntil = new Date(Date.now() + PIN_LOCK_MINUTES * 60 * 1000).toISOString()
    await query(
      `UPDATE share_tokens SET pin_failed_count = $1, pin_locked_until = $2 WHERE id = $3`,
      [next, lockedUntil, share.id],
    )
    return { locked: true, remaining: 0 }
  }
  await query(`UPDATE share_tokens SET pin_failed_count = $1 WHERE id = $2`, [next, share.id])
  return { locked: false, remaining: PIN_MAX_ATTEMPTS - next }
}

async function resetPinFailures(shareId: string): Promise<void> {
  await query(
    `UPDATE share_tokens SET pin_failed_count = 0, pin_locked_until = NULL WHERE id = $1`,
    [shareId],
  )
}

export type PublicShareResult =
  | { ok: true; view: Record<string, unknown> }
  | { ok: false; code: 'SHARE_INVALID' | 'SHARE_PIN_INVALID' | 'SHARE_PIN_LOCKED'; message: string; remaining?: number }

export async function buildPublicShareView(
  token: string,
  pin?: string | null,
): Promise<PublicShareResult> {
  const share = await getShareByToken(token)
  if (!share) {
    return { ok: false, code: 'SHARE_INVALID', message: '링크가 만료되었거나 삭제되었어요.' }
  }

  if (share.pin_locked_until && new Date(share.pin_locked_until) > new Date()) {
    return { ok: false, code: 'SHARE_PIN_LOCKED', message: '15분 후 다시 시도해 주세요.' }
  }

  if (share.pin_hash) {
    if (!pin) {
      return {
        ok: false,
        code: 'SHARE_PIN_INVALID',
        message: 'PIN을 입력해 주세요.',
        remaining: PIN_MAX_ATTEMPTS - share.pin_failed_count,
      }
    }
    if (!verifyPinHash(pin, share.pin_hash)) {
      const { locked, remaining } = await recordPinFailure(share)
      if (locked) {
        return { ok: false, code: 'SHARE_PIN_LOCKED', message: '15분 후 다시 시도해 주세요.' }
      }
      return {
        ok: false,
        code: 'SHARE_PIN_INVALID',
        message: `비밀번호가 맞지 않아요. (남은 ${remaining}회)`,
        remaining,
      }
    }
    await resetPinFailures(share.id)
  }

  const debtRow = await queryOne<DebtRow>(
    `SELECT d.*, c.display_name AS contact_name FROM debts d
     JOIN contacts c ON c.id = d.contact_id WHERE d.id = $1`,
    [share.debt_id],
  )
  if (!debtRow) {
    return { ok: false, code: 'SHARE_INVALID', message: '링크가 만료되었거나 삭제되었어요.' }
  }

  const row = {
    ...(debtRow as unknown as DebtRow),
    principal: Number((debtRow as Record<string, unknown>).principal),
    occurred_on: formatPgDate((debtRow as Record<string, unknown>).occurred_on),
    due_on: (debtRow as Record<string, unknown>).due_on
      ? formatPgDate((debtRow as Record<string, unknown>).due_on)
      : null,
    agreement_closed: Boolean((debtRow as Record<string, unknown>).agreement_closed),
    contact_name: (debtRow as Record<string, unknown>).contact_name as string,
  } as DebtRow

  const ledger = await getLedger(row.id)
  const balance = computeBalance(row.principal, ledger)
  const status = deriveStatus(row.status, !!row.agreement_closed, balance)
  const display_label = computeDisplayLabel(status, !!row.agreement_closed, balance)

  const contactName = share.anonymous ? '익명(상대)' : row.contact_name

  const view: Record<string, unknown> = {
    direction: row.direction,
    contact: { display_name: contactName },
    balance,
    display_label,
    is_overdue: isOverdue(row.due_on, status, balance),
    occurred_on: row.occurred_on,
    due_on: row.due_on,
    opening: {
      principal: row.principal,
      occurred_on: row.occurred_on,
      reason: share.include_reason ? row.reason : undefined,
    },
    ledger_entries: ledger
      .filter((e) => !e.deleted_at)
      .map((e) => ({
        id: e.id,
        type: e.type,
        amount: e.amount,
        occurred_on: e.occurred_on,
        note: e.note,
      })),
  }

  if (share.include_reason) {
    view.reason = row.reason
  }

  return { ok: true, view }
}

export async function revokeShareForDebt(debtId: string, userId: string): Promise<boolean> {
  const debt = await getDebtRow(debtId, userId)
  if (!debt) return false
  await revokeActiveForDebt(debtId)
  return true
}
