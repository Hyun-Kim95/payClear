import { Link } from 'react-router-dom'
import type { Debt } from '../types'
import { formatKRW } from '../data/mock'
import { DirectionBadge, StatusBadge } from './Badge'

export function DebtCard({ debt }: { debt: Debt }) {
  const balanceLabel =
    debt.balance < 0 ? `초과 상환 ${formatKRW(debt.balance)}` : formatKRW(debt.balance)

  return (
    <Link to={`/debts/${debt.id}`} className="debt-card">
      <div className="debt-card__top">
        <strong>{debt.counterparty}</strong>
        <DirectionBadge direction={debt.direction} />
      </div>
      <div className="debt-card__bottom">
        <span className="debt-card__balance">{balanceLabel}</span>
        <div className="debt-card__meta">
          <StatusBadge debt={debt} />
          {debt.dueOn && debt.status === 'active' && (
            <span className="debt-card__due">예정 {debt.dueOn}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
