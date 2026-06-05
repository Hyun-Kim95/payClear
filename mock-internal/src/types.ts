export type DebtDirection = 'lent' | 'borrowed'
export type DebtStatus = 'active' | 'completed' | 'archived'

export type LedgerEventType = 'opening' | 'payment' | 'adjustment'

export interface LedgerEvent {
  id: string
  type: LedgerEventType
  amount: number
  occurredOn: string
  memo?: string
}

export interface Debt {
  id: string
  counterparty: string
  direction: DebtDirection
  principal: number
  balance: number
  status: DebtStatus
  agreementClosed: boolean
  overdue: boolean
  dueOn?: string
  reason: string
  openedOn: string
  archived?: boolean
  timeline: LedgerEvent[]
}

export interface ActivityItem {
  id: string
  debtId: string
  counterparty: string
  label: string
  amount: number
  occurredOn: string
}
