import { query, queryOne } from './db/pool.js'
import { formatPgTimestamp } from './debt-helpers.js'

export const DELETION_GRACE_DAYS = 30

export interface DeletionState {
  requested_at: string
  scheduled_at: string
  days_remaining: number
}

export function buildDeletionState(requestedAt: Date): DeletionState {
  const scheduledAt = new Date(requestedAt.getTime() + DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000)
  const msRemaining = scheduledAt.getTime() - Date.now()
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)))
  return {
    requested_at: requestedAt.toISOString(),
    scheduled_at: scheduledAt.toISOString(),
    days_remaining: daysRemaining,
  }
}

export async function getDeletionRequestedAt(userId: string): Promise<string | null> {
  const row = await queryOne<{ deletion_requested_at: unknown }>(
    'SELECT deletion_requested_at FROM users WHERE id = $1',
    [userId],
  )
  if (!row?.deletion_requested_at) return null
  return formatPgTimestamp(row.deletion_requested_at)
}

export async function getDeletionState(userId: string): Promise<DeletionState | null> {
  const requestedAt = await getDeletionRequestedAt(userId)
  if (!requestedAt) return null
  return buildDeletionState(new Date(requestedAt))
}

export async function scheduleDeletion(userId: string): Promise<DeletionState> {
  const existing = await getDeletionRequestedAt(userId)
  if (existing) {
    return buildDeletionState(new Date(existing))
  }
  const row = await queryOne<{ deletion_requested_at: unknown }>(
    `UPDATE users SET deletion_requested_at = NOW(), updated_at = NOW()
     WHERE id = $1
     RETURNING deletion_requested_at`,
    [userId],
  )
  const requestedAt = formatPgTimestamp(row!.deletion_requested_at)
  return buildDeletionState(new Date(requestedAt!))
}

export async function cancelDeletion(userId: string): Promise<boolean> {
  const result = await query(
    `UPDATE users SET deletion_requested_at = NULL, updated_at = NOW()
     WHERE id = $1 AND deletion_requested_at IS NOT NULL`,
    [userId],
  )
  return (result.rowCount ?? 0) > 0
}

/** OAuth 재로그인 시 탈퇴 예약 자동 취소. 취소되었으면 true. */
export async function cancelDeletionIfScheduled(userId: string): Promise<boolean> {
  return cancelDeletion(userId)
}

export interface PurgeResult {
  dry_run: boolean
  purged_count: number
  user_ids: string[]
}

export async function purgeDueAccounts(dryRun: boolean): Promise<PurgeResult> {
  const due = await query<{ id: string }>(
    `SELECT id FROM users
     WHERE deletion_requested_at IS NOT NULL
       AND deletion_requested_at + ($1::text || ' days')::interval <= NOW()`,
    [String(DELETION_GRACE_DAYS)],
  )
  const userIds = due.rows.map((r) => r.id)
  if (!dryRun && userIds.length > 0) {
    await query('DELETE FROM users WHERE id = ANY($1::text[])', [userIds])
  }
  return { dry_run: dryRun, purged_count: userIds.length, user_ids: userIds }
}
