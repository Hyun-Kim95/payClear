import { randomUUID } from 'crypto'
import { query, queryOne } from './db/pool.js'
import {
  computeBalance,
  resolveStatusUpdate,
  type DebtRow,
  type LedgerRow,
} from './domain.js'

export function formatPgDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  const s = String(value)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  return s
}

export function formatPgTimestamp(value: unknown): string | null {
  if (value == null) return null
  if (value instanceof Date) return value.toISOString()
  const s = String(value)
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s
  return s
}

function mapLedgerRow(row: Record<string, unknown>): LedgerRow {
  return {
    id: row.id as string,
    debt_id: row.debt_id as string,
    type: row.type as LedgerRow['type'],
    amount: Number(row.amount),
    occurred_on: formatPgDate(row.occurred_on),
    note: (row.note as string) ?? null,
    deleted_at: row.deleted_at ? String(row.deleted_at) : null,
    created_at: String(row.created_at),
  }
}

export function mapDebtRow(row: Record<string, unknown>): DebtRow {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    contact_id: row.contact_id as string,
    direction: row.direction as DebtRow['direction'],
    principal: Number(row.principal),
    occurred_on: formatPgDate(row.occurred_on),
    reason: row.reason as string,
    due_on: row.due_on ? formatPgDate(row.due_on) : null,
    status: row.status as DebtRow['status'],
    is_split: Boolean(row.is_split),
    agreement_closed: Boolean(row.agreement_closed),
    completed_at: formatPgTimestamp(row.completed_at),
    archived_at: formatPgTimestamp(row.archived_at),
    created_at: formatPgTimestamp(row.created_at) ?? '',
    updated_at: formatPgTimestamp(row.updated_at) ?? '',
    contact_name: row.contact_name as string,
  }
}

export async function getLedger(debtId: string): Promise<LedgerRow[]> {
  const res = await query(
    'SELECT * FROM ledger_entries WHERE debt_id = $1 ORDER BY occurred_on DESC, created_at DESC',
    [debtId],
  )
  return res.rows.map(mapLedgerRow)
}

export async function getDebtRow(id: string, userId: string): Promise<DebtRow | undefined> {
  const row = await queryOne(
    `SELECT d.*, c.display_name AS contact_name FROM debts d
     JOIN contacts c ON c.id = d.contact_id WHERE d.id = $1 AND d.user_id = $2`,
    [id, userId],
  )
  return row ? mapDebtRow(row) : undefined
}

export async function refreshDebtStatus(debtId: string): Promise<void> {
  const row = await queryOne('SELECT * FROM debts WHERE id = $1', [debtId])
  if (!row || row.status === 'archived') return

  const ledger = await getLedger(debtId)
  const balance = computeBalance(Number(row.principal), ledger)
  const { status, completed_at } = resolveStatusUpdate(
    row.status as DebtRow['status'],
    Boolean(row.agreement_closed),
    balance,
    formatPgTimestamp(row.completed_at),
  )

  await query(
    `UPDATE debts SET status = $1, completed_at = $2, updated_at = NOW() WHERE id = $3`,
    [status, completed_at, debtId],
  )
}

export async function createContact(userId: string, displayName: string, note?: string | null): Promise<string> {
  const id = randomUUID()
  const name = displayName.trim()
  await query('INSERT INTO contacts (id, user_id, display_name, note) VALUES ($1, $2, $3, $4)', [
    id,
    userId,
    name,
    note?.trim() || null,
  ])
  return id
}

/** 동일 이름 상대가 있으면 재사용, 없으면 생성한다. */
export async function findOrCreateContact(userId: string, displayName: string): Promise<string> {
  const name = displayName.trim()
  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM contacts WHERE user_id = $1 AND display_name = $2',
    [userId, name],
  )
  if (existing) return existing.id
  return createContact(userId, name)
}

export function isArchived(row: DebtRow): boolean {
  return row.status === 'archived'
}
