import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { api, formatKRW, isUnauthorizedError, type Summary } from '../api/client'

export function HomePage() {
  const [data, setData] = useState<Summary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [authExpired, setAuthExpired] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .summary()
      .then(setData)
      .catch((e) => {
        if (isUnauthorizedError(e)) setAuthExpired(true)
        else setError(e instanceof Error ? e.message : '요청 실패')
      })
      .finally(() => setLoading(false))
  }, [])

  if (authExpired) return <Navigate to="/login" replace />

  if (loading) {
    return (
      <div>
        <div className="skeleton" style={{ height: '8rem' }} />
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
    )
  }

  if (error || !data) {
    return <div className="state-box state-box--error">{error ?? '데이터를 불러올 수 없습니다.'}</div>
  }

  return (
    <div>
      <section className="hero-summary">
        <div className="hero-summary__label">받을 돈</div>
        <div className="hero-summary__amount">{formatKRW(data.total_receivable)}</div>
        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem' }}>
          <span>갚을 돈 {formatKRW(data.total_payable)}</span>
          <span>진행 {data.active_count}건</span>
        </div>
      </section>

      <div className="mini-stats">
        <div className="stat-card">
          <span>갚을 돈</span>
          <strong>{formatKRW(data.total_payable)}</strong>
        </div>
        <div className="stat-card">
          <span>연체</span>
          <strong>{data.overdue_count}건</strong>
        </div>
      </div>

      <section>
        <div className="section-head">
          <h2>상환 예정</h2>
        </div>
        {data.upcoming_due.length === 0 ? (
          <p className="muted">예정된 상환일이 없습니다.</p>
        ) : (
          data.upcoming_due.map((u) => (
            <Link key={u.debt_id} to={`/debts/${u.debt_id}`} className="list-row">
              <span>{u.contact_name}</span>
              <span>
                {formatKRW(u.balance)} · {u.due_on}
              </span>
            </Link>
          ))
        )}
      </section>

      <Link to="/debts/new" className="fab" aria-label="채무 등록" />
    </div>
  )
}
