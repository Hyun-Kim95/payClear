import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type Debt } from '../api/client'
import { DebtCard } from '../components/DebtCard'

const FILTERS = ['전체', '빌려줌', '빌림', '진행중', '완료', '연체'] as const

export function DebtsPage() {
  const [items, setItems] = useState<Debt[]>([])
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('전체')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .debts()
      .then((r) => setItems(r.items))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const list = useMemo(() => {
    return items.filter((d) => {
      if (q && !d.contact.display_name.includes(q) && !d.reason.includes(q)) return false
      switch (filter) {
        case '빌려줌':
          return d.direction === 'lent'
        case '빌림':
          return d.direction === 'borrowed'
        case '진행중':
          return d.status === 'active'
        case '완료':
          return d.status === 'completed'
        case '연체':
          return d.is_overdue
        default:
          return true
      }
    })
  }, [items, filter, q])

  if (loading) {
    return (
      <div>
        <div className="skeleton" style={{ height: '2.5rem' }} />
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
    )
  }

  if (error) return <div className="state-box state-box--error">{error}</div>

  return (
    <div>
      <h1 className="page-title">채무 목록</h1>
      <input className="search" placeholder="이름으로 검색" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="chip-row">
        {FILTERS.map((f) => (
          <button key={f} type="button" className={filter === f ? 'chip chip--on' : 'chip'} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <div className="state-box">
          <p>조건에 맞는 채무가 없습니다.</p>
          <Link to="/debts/new" className="btn btn--primary" style={{ marginTop: '1rem' }}>
            첫 채무 등록
          </Link>
        </div>
      ) : (
        list.map((d) => <DebtCard key={d.id} debt={d} />)
      )}
      <Link to="/debts/new" className="fab" aria-label="채무 등록">
        +
      </Link>
    </div>
  )
}
