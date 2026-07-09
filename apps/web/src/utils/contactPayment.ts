import type { Debt } from '../api/client'

export type ContactPaymentDirection = 'lent' | 'borrowed'

export function isContactPaymentDirection(value: string | null | undefined): value is ContactPaymentDirection {
  return value === 'lent' || value === 'borrowed'
}

/** 일괄 배분 대상 채무(active·양수 잔액·비분할·방향 일치·선택 일자 이후) */
export function listAllocatableDebts(
  debts: Debt[],
  direction: ContactPaymentDirection,
  occurredOn?: string,
): Debt[] {
  return debts.filter((d) => {
    if (d.status !== 'active' || d.direction !== direction || d.is_split) return false
    if (d.balance <= 0) return false
    if (occurredOn && d.occurred_on > occurredOn) return false
    return true
  })
}

export function sumAllocatableBalance(
  debts: Debt[],
  direction: ContactPaymentDirection,
  occurredOn?: string,
): number {
  return listAllocatableDebts(debts, direction, occurredOn).reduce((sum, d) => sum + d.balance, 0)
}

export function sumContactBalanceByDirection(debts: Debt[], direction: ContactPaymentDirection): number {
  return sumAllocatableBalance(debts, direction)
}

export function minAllocatableOccurredOn(
  debts: Debt[],
  direction: ContactPaymentDirection,
): string | null {
  const dates = listAllocatableDebts(debts, direction).map((d) => d.occurred_on)
  if (dates.length === 0) return null
  return dates.sort()[0] ?? null
}

export function excessAllocatableAmount(amount: number, allocatableBalance: number): number {
  if (amount <= 0 || allocatableBalance <= 0) return 0
  return Math.max(0, amount - allocatableBalance)
}

export const CONTACT_PAYMENT_COPY: Record<
  ContactPaymentDirection,
  {
    pageTitle: string
    amountLabel: string
    balanceSummary: string
    submitLabel: string
    submittingLabel: string
    detailButton: string
  }
> = {
  borrowed: {
    pageTitle: '일괄 상환',
    amountLabel: '총 상환 금액 (원)',
    balanceSummary: '갚을 돈 합계',
    submitLabel: '자동 배분 상환',
    submittingLabel: '배분 중…',
    detailButton: '갚을 돈 일괄 상환',
  },
  lent: {
    pageTitle: '일괄 받음 기록',
    amountLabel: '총 받은 금액 (원)',
    balanceSummary: '받을 돈 합계',
    submitLabel: '자동 배분 기록',
    submittingLabel: '기록 중…',
    detailButton: '받을 돈 일괄 기록',
  },
}
