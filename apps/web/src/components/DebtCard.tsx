import { Link } from 'react-router-dom'
import { formatDateYMD, formatKRW, type Debt } from '../api/client'

function StatusBadge({ debt }: { debt: Debt }) {
  if (debt.is_overdue && debt.status === 'active') {
    return <span className="badge badge--overdue">연체</span>
  }
  if (debt.display_label === '합의 종료') {
    return <span className="badge badge--agreement">합의 종료</span>
  }
  if (debt.display_label === '완료') {
    return <span className="badge badge--done">완료</span>
  }
  return null
}

export function DebtCard({ debt }: { debt: Debt }) {
  const balanceText =
    debt.balance < 0 ? `초과 상환 ${formatKRW(debt.balance)}` : formatKRW(debt.balance)

  return (
    <Link
      to={`/debts/${debt.id}`}
      className={`debt-card debt-card--${debt.direction}`}
    >
      <div className="debt-card__row">
        <div>
          <div className="debt-card__name">{debt.contact.display_name}</div>
          <span className={`badge badge--dir-${debt.direction}`}>
            {debt.direction === 'lent' ? '빌려줌' : '빌림'}
          </span>
          <div className="muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
            {formatDateYMD(debt.occurred_on)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="debt-card__balance">{balanceText}</div>
          <div style={{ marginTop: '0.35rem', display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
            <StatusBadge debt={debt} />
            {debt.due_on && debt.status === 'active' && (
              <span className="muted" style={{ fontSize: '0.75rem' }}>
                {formatDateYMD(debt.due_on)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
