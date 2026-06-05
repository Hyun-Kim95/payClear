import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { mockDebts } from '../data/mock'
import { DebtCard } from '../components/DebtCard'

const filters = ['전체', '빌려줌', '빌림', '진행중', '완료', '연체'] as const
type Filter = (typeof filters)[number]

export function DebtsPage() {
  const [filter, setFilter] = useState<Filter>('전체')
  const [query, setQuery] = useState('')

  const list = useMemo(() => {
    return mockDebts.filter((d) => {
      if (query && !d.counterparty.includes(query) && !d.reason.includes(query)) return false
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
          return d.overdue && d.status === 'active'
        default:
          return true
      }
    })
  }, [filter, query])

  return (
    <div className="page">
      <h1 className="page-title">채무 목록</h1>
      <input
        className="search-input"
        placeholder="상대명·사유 검색"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="chip-row" role="tablist" aria-label="필터">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            className={filter === f ? 'chip chip--active' : 'chip'}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="empty-state">
          <p>조건에 맞는 채무가 없습니다.</p>
          <Link to="/debts/new" className="btn btn--primary">
            첫 채무 등록
          </Link>
        </div>
      ) : (
        <div className="debt-list">
          {list.map((d) => (
            <DebtCard key={d.id} debt={d} />
          ))}
        </div>
      )}

      <Link to="/debts/new" className="fab" aria-label="채무 등록">
        +
      </Link>
    </div>
  )
}
