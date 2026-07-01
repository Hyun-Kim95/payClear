import { randomUUID } from 'crypto'
import { query, queryOne } from './db/pool.js'
import { computeBalance, type DebtRow } from './domain.js'
import { getLedger, refreshDebtStatus } from './debt-helpers.js'
import { validateDateOnOrBeforeToday, validatePaymentAmount } from './validate.js'

export type PaymentStrategy = 'oldest_first' | 'largest_first' | 'newest_first' | 'smallest_first'

export const PAYMENT_STRATEGIES: PaymentStrategy[] = [
  'oldest_first',
  'newest_first',
  'largest_first',
  'smallest_first',
]

export function isValidPaymentStrategy(value: string): value is PaymentStrategy {
  return (PAYMENT_STRATEGIES as string[]).includes(value)
}

export type DueScheduleType = 'none' | 'monthly' | 'weekly'

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const

export function formatDueScheduleLabel(
  type: DueScheduleType | undefined,
  value: number | null | undefined,
): string | null {
  if (!type || type === 'none' || value == null) return null
  if (type === 'monthly') return `매월 ${value}일`
  if (type === 'weekly') return `매주 ${WEEKDAY_LABELS[value] ?? value}요일`
  return null
}

export function validateDueSchedule(
  type: DueScheduleType | undefined,
  value: number | null | undefined,
): string | null {
  if (!type || type === 'none') {
    if (value != null) return '주기 없음일 때 값을 지정할 수 없습니다.'
    return null
  }
  if (value == null) return '주기 값을 선택해 주세요.'
  if (type === 'monthly' && (value < 1 || value > 31)) return '매월 1~31일을 선택해 주세요.'
  if (type === 'weekly' && (value < 0 || value > 6)) return '요일을 선택해 주세요.'
  return null
}

/** KST 기준 날짜(YYYY-MM-DD)의 요일(0=일) */
export function weekdayKST(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

export function contactScheduleMatchesDate(
  type: DueScheduleType,
  value: number | null,
  isoDate: string,
): boolean {
  if (type === 'none' || value == null) return false
  if (type === 'monthly') return Number(isoDate.slice(8, 10)) === value
  if (type === 'weekly') return weekdayKST(isoDate) === value
  return false
}

export interface AllocatePaymentResult {
  allocated_total: number
  unallocated: number
  payments: Array<{ debt_id: string; amount: number; entry_id: string; reason: string }>
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

  for (const raw of debtsRes.rows) {
    const row = raw as unknown as DebtRow
    const ledger = await getLedger(row.id)
    const balance = computeBalance(Number(row.principal), ledger)
    if (balance <= 0) continue
    withBalance.push({ row: row as DebtRow, balance })
  }

  withBalance.sort((a, b) => {
    const dueA = a.row.due_on ?? '9999-12-31'
    const dueB = b.row.due_on ?? '9999-12-31'
    switch (strategy) {
      case 'largest_first':
        return b.balance - a.balance || a.row.occurred_on.localeCompare(b.row.occurred_on)
      case 'smallest_first':
        return a.balance - b.balance || a.row.occurred_on.localeCompare(b.row.occurred_on)
      case 'newest_first':
        return (
          b.row.occurred_on.localeCompare(a.row.occurred_on) ||
          dueA.localeCompare(dueB) ||
          b.balance - a.balance
        )
      case 'oldest_first':
      default:
        return (
          a.row.occurred_on.localeCompare(b.row.occurred_on) ||
          dueA.localeCompare(dueB) ||
          b.balance - a.balance
        )
    }
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
  }
}

export function mapContactRow(row: Record<string, unknown>) {
  const scheduleType = (row.due_schedule_type as DueScheduleType) ?? 'none'
  const scheduleValue =
    row.due_schedule_value == null ? null : Number(row.due_schedule_value)
  return {
    id: row.id as string,
    display_name: row.display_name as string,
    note: (row.note as string) ?? null,
    payment_strategy: (row.payment_strategy as PaymentStrategy) ?? 'oldest_first',
    due_schedule_type: scheduleType,
    due_schedule_value: scheduleValue,
    due_schedule_label: formatDueScheduleLabel(scheduleType, scheduleValue),
  }
}
