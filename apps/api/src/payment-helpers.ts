import { randomUUID } from 'crypto'
import { query, queryOne } from './db/pool.js'
import { computeBalance, type DebtRow } from './domain.js'
import { getLedger, refreshDebtStatus } from './debt-helpers.js'
import { validateDateOnOrBeforeToday, validatePaymentAmount } from './validate.js'

export type PaymentStrategy = 'oldest_first' | 'largest_first'

export interface AllocatePaymentResult {
  allocated_total: number
  unallocated: number
  payments: Array<{ debt_id: string; amount: number; entry_id: string; reason: string }>
  skipped_split_count: number
}

interface DebtWithBalance {
  row: DebtRow
  balance: number
}

export async function allocateContactPayment(
  contactId: string,
  userId: string,
  amount: number,
  occurredOn: string,
  strategy: PaymentStrategy,
  note?: string | null,
): Promise<AllocatePaymentResult> {
  const amountErr = validatePaymentAmount(amount)
  if (amountErr) throw new Error(amountErr)
  const dateErr = validateDateOnOrBeforeToday(occurredOn, '일자')
  if (dateErr) throw new Error(dateErr)

  const debtsRes = await query<Record<string, unknown>>(
    `SELECT d.*, c.display_name AS contact_name FROM debts d
     JOIN contacts c ON c.id = d.contact_id
     WHERE d.contact_id = $1 AND d.user_id = $2 AND d.status = 'active'`,
    [contactId, userId],
  )

  const withBalance: DebtWithBalance[] = []
  let skippedSplit = 0

  for (const raw of debtsRes.rows) {
    const row = raw as unknown as DebtRow & { is_split?: boolean }
    if (row.is_split) {
      skippedSplit++
      continue
    }
    const ledger = await getLedger(row.id)
    const balance = computeBalance(Number(row.principal), ledger)
    if (balance <= 0) continue
    withBalance.push({ row: row as DebtRow, balance })
  }

  withBalance.sort((a, b) => {
    if (strategy === 'largest_first') {
      return b.balance - a.balance || a.row.occurred_on.localeCompare(b.row.occurred_on)
    }
    const dueA = a.row.due_on ?? '9999-12-31'
    const dueB = b.row.due_on ?? '9999-12-31'
    return (
      a.row.occurred_on.localeCompare(b.row.occurred_on) ||
      dueA.localeCompare(dueB) ||
      b.balance - a.balance
    )
  })

  let remaining = amount
  const payments: AllocatePaymentResult['payments'] = []

  for (const { row, balance } of withBalance) {
    if (remaining <= 0) break
    const payAmount = Math.min(remaining, balance)
    if (payAmount <= 0) continue

    const entryId = randomUUID()
    await query(
      `INSERT INTO ledger_entries (id, debt_id, type, amount, occurred_on, note) VALUES ($1,$2,'payment',$3,$4,$5)`,
      [entryId, row.id, payAmount, occurredOn, note?.trim() || null],
    )
    await refreshDebtStatus(row.id)

    payments.push({
      debt_id: row.id,
      amount: payAmount,
      entry_id: entryId,
      reason: row.reason,
    })
    remaining -= payAmount
  }

  return {
    allocated_total: amount - remaining,
    unallocated: remaining,
    payments,
    skipped_split_count: skippedSplit,
  }
}

export function mapContactRow(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    display_name: row.display_name as string,
    note: (row.note as string) ?? null,
    payment_strategy: (row.payment_strategy as PaymentStrategy) ?? 'oldest_first',
  }
}
