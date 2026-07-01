import { randomUUID } from 'crypto'
import { query } from './db/pool.js'
import { formatPgDate } from './debt-helpers.js'

export interface ParticipantInput {
  label: string
  contact_id?: string | null
}

export interface InstallmentPlanInput {
  count: number
  interval_months: number
  start_on: string
}

export interface SplitInput {
  participants: ParticipantInput[]
  installment: InstallmentPlanInput
}

export interface ParticipantProgress {
  id: string
  label: string
  contact_id: string | null
  share_amount: number
  paid_amount: number
  balance: number
  completed: boolean
}

export interface InstallmentView {
  id: string
  participant_id: string
  participant_label: string
  seq: number
  due_on: string
  amount: number
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** YYYY-MM-DD에 months를 더한다(말일 보정). TZ 영향 없이 날짜 부분으로만 계산. */
export function addMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const base = new Date(Date.UTC(y, m - 1, d))
  const targetMonthIndex = base.getUTCMonth() + months
  const targetYear = base.getUTCFullYear() + Math.floor(targetMonthIndex / 12)
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate()
  const day = Math.min(d, lastDay)
  const mm = String(normalizedMonth + 1).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${targetYear}-${mm}-${dd}`
}

/** 총액을 n명에게 균등 분배. 나머지는 첫 참여자에 더한다. */
export function splitEqually(principal: number, n: number): number[] {
  const base = Math.floor(principal / n)
  const shares = Array(n).fill(base)
  shares[0] += principal - base * n
  return shares
}

/** 분담액을 count회차로 분할. 나머지는 마지막 회차에 더한다. */
export function splitInstallmentAmounts(share: number, count: number): number[] {
  const base = Math.floor(share / count)
  const amounts = Array(count).fill(base)
  amounts[count - 1] += share - base * count
  return amounts
}

export interface SplitValidationResult {
  ok: boolean
  error?: string
}

export function validateSplit(split: unknown, principal: number): SplitValidationResult {
  if (typeof split !== 'object' || split === null) return { ok: false, error: '분할 정보가 올바르지 않습니다.' }
  const s = split as Partial<SplitInput>
  if (!Array.isArray(s.participants) || s.participants.length < 2) {
    return { ok: false, error: '참여자는 2명 이상이어야 합니다.' }
  }
  for (const p of s.participants) {
    const label = typeof p?.label === 'string' ? p.label.trim() : ''
    if (!label || label.length > 40) return { ok: false, error: '참여자 이름은 1~40자여야 합니다.' }
  }
  const inst = s.installment
  if (!inst || typeof inst !== 'object') return { ok: false, error: '할부 정보가 필요합니다.' }
  if (!Number.isInteger(inst.count) || inst.count < 1 || inst.count > 60) {
    return { ok: false, error: '회차 수는 1~60이어야 합니다.' }
  }
  if (!Number.isInteger(inst.interval_months) || inst.interval_months < 1 || inst.interval_months > 12) {
    return { ok: false, error: '회차 간격은 1~12개월이어야 합니다.' }
  }
  if (typeof inst.start_on !== 'string' || !DATE_RE.test(inst.start_on)) {
    return { ok: false, error: '1회차 예정일 형식이 올바르지 않습니다.' }
  }
  if (principal < s.participants.length) {
    return { ok: false, error: '총액이 참여자 수보다 작아 분배할 수 없습니다.' }
  }
  return { ok: true }
}

/**
 * 분할 채무의 참여자·회차 일정을 생성한다.
 * - 총액을 균등 분배해 debt_participants 생성
 * - 각 참여자의 분담액을 회차로 나눠 installments 생성
 */
export async function createSplitPlan(
  debtId: string,
  principal: number,
  split: SplitInput,
): Promise<void> {
  const n = split.participants.length
  const shares = splitEqually(principal, n)

  for (let i = 0; i < n; i++) {
    const participantId = randomUUID()
    const p = split.participants[i]
    await query(
      `INSERT INTO debt_participants (id, debt_id, seq, label, contact_id, share_amount)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [participantId, debtId, i, p.label.trim(), p.contact_id ?? null, shares[i]],
    )

    const amounts = splitInstallmentAmounts(shares[i], split.installment.count)
    for (let k = 0; k < split.installment.count; k++) {
      const dueOn = addMonths(split.installment.start_on, k * split.installment.interval_months)
      await query(
        `INSERT INTO installments (id, debt_id, participant_id, seq, due_on, amount)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [randomUUID(), debtId, participantId, k + 1, dueOn, amounts[k]],
      )
    }
  }
}

/** 참여자별 진행(분담액·납입·잔액·완료). 납입은 그 참여자에 귀속된 payment 합. */
export async function getParticipantProgress(debtId: string): Promise<ParticipantProgress[]> {
  const res = await query<{
    id: string
    label: string
    contact_id: string | null
    share_amount: string
    paid_amount: string | null
  }>(
    `SELECT p.id, p.label, p.contact_id, p.share_amount,
            COALESCE(SUM(CASE WHEN le.type = 'payment' AND le.deleted_at IS NULL THEN le.amount END), 0) AS paid_amount
     FROM debt_participants p
     LEFT JOIN ledger_entries le ON le.participant_id = p.id
     WHERE p.debt_id = $1
     GROUP BY p.id, p.label, p.contact_id, p.share_amount, p.seq
     ORDER BY p.seq`,
    [debtId],
  )
  return res.rows.map((r) => {
    const share = Number(r.share_amount)
    const paid = Number(r.paid_amount ?? 0)
    const balance = share - paid
    return {
      id: r.id,
      label: r.label,
      contact_id: r.contact_id,
      share_amount: share,
      paid_amount: paid,
      balance,
      completed: balance <= 0,
    }
  })
}

export async function getInstallments(debtId: string): Promise<InstallmentView[]> {
  const res = await query<{
    id: string
    participant_id: string
    participant_label: string
    seq: number
    due_on: unknown
    amount: string
  }>(
    `SELECT i.id, i.participant_id, p.label AS participant_label, i.seq, i.due_on, i.amount
     FROM installments i
     JOIN debt_participants p ON p.id = i.participant_id
     WHERE i.debt_id = $1
     ORDER BY p.seq, i.seq`,
    [debtId],
  )
  return res.rows.map((r) => ({
    id: r.id,
    participant_id: r.participant_id,
    participant_label: r.participant_label,
    seq: r.seq,
    due_on: formatPgDate(r.due_on),
    amount: Number(r.amount),
  }))
}

/** participantId가 해당 채무의 참여자인지 확인 */
export async function isParticipantOfDebt(debtId: string, participantId: string): Promise<boolean> {
  const res = await query('SELECT 1 FROM debt_participants WHERE id = $1 AND debt_id = $2', [
    participantId,
    debtId,
  ])
  return res.rows.length > 0
}
