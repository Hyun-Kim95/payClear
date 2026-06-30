export type DebtStatus = 'active' | 'completed' | 'archived'
export type DebtDirection = 'lent' | 'borrowed'

export interface DebtRow {
  id: string
  user_id: string
  contact_id: string
  direction: DebtDirection
  principal: number
  occurred_on: string
  reason: string
  due_on: string | null
  status: DebtStatus
  agreement_closed: boolean | number
  completed_at: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
  contact_name: string
}

export interface LedgerRow {
  id: string
  debt_id: string
  type: 'payment' | 'adjustment'
  amount: number
  occurred_on: string
  note: string | null
  deleted_at: string | null
  created_at: string
}

export function computeBalance(principal: number, entries: LedgerRow[]): number {
  // principal·amount는 DB에서 BIGINT(문자열)로 올 수 있으므로 숫자 연산을 강제한다.
  // (문자열이 섞이면 +가 문자열 연결이 되어 금액이 깨진다)
  return entries
    .filter((e) => !e.deleted_at)
    .reduce((bal, e) => {
      const amount = Number(e.amount)
      if (e.type === 'payment') return bal - amount
      return bal + amount
    }, Number(principal))
}

export function computeDisplayLabel(
  status: DebtStatus,
  agreementClosed: boolean,
  balance: number,
): string | null {
  if (status !== 'completed') return null
  if (agreementClosed) return '합의 종료'
  if (balance === 0) return '완료'
  return null
}

export function isOverdue(dueOn: string | null, status: DebtStatus, balance: number): boolean {
  if (!dueOn || status !== 'active' || balance <= 0) return false
  const today = new Date().toISOString().slice(0, 10)
  return dueOn < today
}

export function deriveStatus(
  current: DebtStatus,
  _agreementClosed: boolean,
  balance: number,
): DebtStatus {
  if (current === 'archived') return 'archived'
  if (balance !== 0) return 'active'
  return 'completed'
}

/** ledger 변경 후 DB status·completed_at 갱신 */
export function resolveStatusUpdate(
  current: DebtStatus,
  agreementClosed: boolean,
  balance: number,
  previousCompletedAt: string | null,
): { status: DebtStatus; completed_at: string | null } {
  const next = deriveStatus(current, agreementClosed, balance)
  if (next === 'archived') {
    return { status: 'archived', completed_at: previousCompletedAt }
  }
  if (next === 'completed') {
    return { status: 'completed', completed_at: previousCompletedAt ?? new Date().toISOString() }
  }
  return { status: 'active', completed_at: null }
}
