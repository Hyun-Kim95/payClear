import { Link, useParams } from 'react-router-dom'
import { formatKRW, getDebtById } from '../data/mock'
import { DirectionBadge, StatusBadge } from '../components/Badge'
import { Timeline } from '../components/Timeline'

export function DebtDetailPage() {
  const { id } = useParams()
  const debt = id ? getDebtById(id) : undefined

  if (!debt) {
    return (
      <div className="page">
        <p>채무를 찾을 수 없습니다.</p>
        <Link to="/debts">목록으로</Link>
      </div>
    )
  }

  const balanceLabel =
    debt.balance < 0 ? `초과 상환 ${formatKRW(debt.balance)}` : formatKRW(debt.balance)

  return (
    <div className="page">
      <Link to="/debts" className="back-link">
        ← 목록
      </Link>
      <header className="detail-header">
        <div className="detail-header__row">
          <h1>{debt.counterparty}</h1>
          <DirectionBadge direction={debt.direction} />
        </div>
        <p className="detail-balance">{balanceLabel}</p>
        <div className="detail-header__badges">
          <StatusBadge debt={debt} />
          {debt.dueOn && debt.status === 'active' && <span className="muted">예정 {debt.dueOn}</span>}
        </div>
        <p className="muted">{debt.reason}</p>
      </header>

      <section className="section">
        <h2>타임라인</h2>
        <Timeline events={debt.timeline} />
      </section>

      <div className="action-grid">
        <Link to={`/debts/${debt.id}/payment`} className="btn btn--primary">
          상환
        </Link>
        <Link to={`/debts/${debt.id}/adjustment`} className="btn btn--secondary">
          조정
        </Link>
        <Link to={`/debts/${debt.id}/share`} className="btn btn--secondary">
          공유
        </Link>
        <Link to={`/debts/${debt.id}/edit`} className="btn btn--ghost">
          편집
        </Link>
        <button type="button" className="btn btn--ghost">
          합의 종료
        </button>
      </div>
    </div>
  )
}
