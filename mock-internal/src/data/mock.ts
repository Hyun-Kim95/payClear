import type { ActivityItem, Debt } from '../types'

export const mockDebts: Debt[] = [
  {
    id: 'd1',
    counterparty: '김민수',
    direction: 'lent',
    principal: 1_000_000,
    balance: 500_000,
    status: 'active',
    agreementClosed: false,
    overdue: true,
    dueOn: '2026-05-28',
    reason: '생활비 대출',
    openedOn: '2026-01-10',
    timeline: [
      { id: 'e1', type: 'opening', amount: 1_000_000, occurredOn: '2026-01-10', memo: '생활비 대출' },
      { id: 'e2', type: 'payment', amount: 300_000, occurredOn: '2026-03-01', memo: '1차 상환' },
      { id: 'e3', type: 'payment', amount: 200_000, occurredOn: '2026-04-15' },
    ],
  },
  {
    id: 'd2',
    counterparty: '박지영',
    direction: 'borrowed',
    principal: 500_000,
    balance: 200_000,
    status: 'active',
    agreementClosed: false,
    overdue: false,
    dueOn: '2026-06-20',
    reason: '이사 비용',
    openedOn: '2026-02-05',
    timeline: [
      { id: 'e4', type: 'opening', amount: 500_000, occurredOn: '2026-02-05', memo: '이사 비용' },
      { id: 'e5', type: 'payment', amount: 300_000, occurredOn: '2026-05-01' },
    ],
  },
  {
    id: 'd3',
    counterparty: '이준호',
    direction: 'lent',
    principal: 300_000,
    balance: 0,
    status: 'completed',
    agreementClosed: true,
    overdue: false,
    reason: '카페 운영 자금',
    openedOn: '2025-11-01',
    timeline: [
      { id: 'e6', type: 'opening', amount: 300_000, occurredOn: '2025-11-01' },
      { id: 'e7', type: 'payment', amount: 300_000, occurredOn: '2026-04-20', memo: '전액 상환' },
    ],
  },
  {
    id: 'd4',
    counterparty: '최수연',
    direction: 'borrowed',
    principal: 150_000,
    balance: 0,
    status: 'completed',
    agreementClosed: false,
    overdue: false,
    reason: '점심값',
    openedOn: '2026-03-10',
    timeline: [
      { id: 'e8', type: 'opening', amount: 150_000, occurredOn: '2026-03-10' },
      { id: 'e9', type: 'payment', amount: 150_000, occurredOn: '2026-03-25' },
    ],
  },
  {
    id: 'd5',
    counterparty: '정우진',
    direction: 'lent',
    principal: 200_000,
    balance: -50_000,
    status: 'active',
    agreementClosed: false,
    overdue: false,
    dueOn: '2026-07-01',
    reason: '학원비',
    openedOn: '2026-04-01',
    timeline: [
      { id: 'e10', type: 'opening', amount: 200_000, occurredOn: '2026-04-01' },
      { id: 'e11', type: 'payment', amount: 250_000, occurredOn: '2026-05-10', memo: '초과 상환' },
    ],
  },
]

export const mockActivities: ActivityItem[] = [
  { id: 'a1', debtId: 'd1', counterparty: '김민수', label: '상환', amount: 200_000, occurredOn: '2026-04-15' },
  { id: 'a2', debtId: 'd2', counterparty: '박지영', label: '상환', amount: 300_000, occurredOn: '2026-05-01' },
  { id: 'a3', debtId: 'd5', counterparty: '정우진', label: '상환', amount: 250_000, occurredOn: '2026-05-10' },
]

export function formatKRW(amount: number): string {
  return `${Math.abs(amount).toLocaleString('ko-KR')}원`
}

export function getDisplayLabel(debt: Debt): string | null {
  if (debt.status !== 'completed') {
    if (debt.overdue && debt.status === 'active') return '연체'
    return null
  }
  if (debt.agreementClosed) return '합의 종료'
  return '완료'
}

export function getSummary() {
  const active = mockDebts.filter((d) => d.status === 'active')
  const toReceive = active.filter((d) => d.direction === 'lent').reduce((s, d) => s + Math.max(d.balance, 0), 0)
  const toPay = active.filter((d) => d.direction === 'borrowed').reduce((s, d) => s + Math.max(d.balance, 0), 0)
  return { toReceive, toPay, activeCount: active.length }
}

export function getDebtById(id: string): Debt | undefined {
  return mockDebts.find((d) => d.id === id)
}
