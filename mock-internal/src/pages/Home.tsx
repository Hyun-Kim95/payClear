import { Link } from 'react-router-dom'
import { formatKRW, getSummary, mockActivities, mockDebts } from '../data/mock'

export function HomePage() {
  const summary = getSummary()
  const upcoming = mockDebts
    .filter((d) => d.status === 'active' && d.dueOn)
    .sort((a, b) => (a.dueOn ?? '').localeCompare(b.dueOn ?? ''))
    .slice(0, 3)

  return (
    <div className="page">
      <section className="summary-grid">
        <article className="summary-card summary-card--primary">
          <span>받을 돈</span>
          <strong>{formatKRW(summary.toReceive)}</strong>
        </article>
        <article className="summary-card">
          <span>갚을 돈</span>
          <strong>{formatKRW(summary.toPay)}</strong>
        </article>
        <article className="summary-card">
          <span>진행 중</span>
          <strong>{summary.activeCount}건</strong>
        </article>
      </section>

      <section className="section">
        <div className="section__head">
          <h2>상환 예정</h2>
        </div>
        {upcoming.length === 0 ? (
          <p className="empty-inline">예정된 상환일이 없습니다.</p>
        ) : (
          <ul className="simple-list">
            {upcoming.map((d) => (
              <li key={d.id}>
                <Link to={`/debts/${d.id}`}>
                  <span>{d.counterparty}</span>
                  <span>{formatKRW(d.balance)}</span>
                  <span className="muted">{d.dueOn}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section">
        <div className="section__head">
          <h2>최근 활동</h2>
          <Link to="/debts" className="link-sm">
            전체 보기
          </Link>
        </div>
        <ul className="activity-list">
          {mockActivities.map((a) => (
            <li key={a.id}>
              <div>
                <strong>{a.counterparty}</strong>
                <span className="muted"> {a.label}</span>
              </div>
              <div>
                <span>{formatKRW(a.amount)}</span>
                <span className="muted"> {a.occurredOn}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <Link to="/debts/new" className="fab" aria-label="채무 등록">
        +
      </Link>
    </div>
  )
}
