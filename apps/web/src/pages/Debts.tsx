import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { api, isUnauthorizedError, type Debt } from '../api/client'
import { DebtCard } from '../components/DebtCard'

const FILTERS = ['전체', '빌려줌', '빌림', '진행중', '완료', '연체'] as const
const MAX_SUGGESTIONS = 8

type SortOption = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'date_desc', label: '날짜 최신순' },
  { value: 'date_asc', label: '날짜 오래된순' },
  { value: 'amount_desc', label: '금액 높은순' },
  { value: 'amount_asc', label: '금액 낮은순' },
]

function sortDebts(items: Debt[], sort: SortOption): Debt[] {
  const sorted = [...items]
  switch (sort) {
    case 'date_desc':
      return sorted.sort((a, b) => b.occurred_on.localeCompare(a.occurred_on))
    case 'date_asc':
      return sorted.sort((a, b) => a.occurred_on.localeCompare(b.occurred_on))
    case 'amount_desc':
      return sorted.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
    case 'amount_asc':
      return sorted.sort((a, b) => Math.abs(a.balance) - Math.abs(b.balance))
  }
}

export function DebtsPage() {
  const [items, setItems] = useState<Debt[]>([])
  const [contacts, setContacts] = useState<Array<{ id: string; display_name: string }>>([])
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('전체')
  const [sort, setSort] = useState<SortOption>('date_desc')
  const [q, setQ] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authExpired, setAuthExpired] = useState(false)
  const searchWrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([api.debts(), api.contacts()])
      .then(([debts, c]) => {
        setItems(debts.items)
        setContacts(c.items)
      })
      .catch((e) => {
        if (isUnauthorizedError(e)) setAuthExpired(true)
        else setError(e instanceof Error ? e.message : '요청 실패')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const suggestions = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return contacts.slice(0, MAX_SUGGESTIONS).map((c) => c.display_name)
    return contacts
      .filter((c) => c.display_name.toLowerCase().includes(needle))
      .slice(0, MAX_SUGGESTIONS)
      .map((c) => c.display_name)
  }, [contacts, q])

  const showSuggestions = searchFocused && suggestions.length > 0

  const list = useMemo(() => {
    const filtered = items.filter((d) => {
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
    return sortDebts(filtered, sort)
  }, [items, filter, q, sort])

  const pickSuggestion = (name: string) => {
    setQ(name)
    setSearchFocused(false)
  }

  if (authExpired) return <Navigate to="/login" replace />

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
      <div className="search-wrap" ref={searchWrapRef}>
        <input
          className="search"
          placeholder="이름으로 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          aria-expanded={showSuggestions}
          aria-controls="debt-search-suggestions"
          autoComplete="off"
        />
        {showSuggestions && (
          <ul id="debt-search-suggestions" className="search-suggestions" role="listbox">
            {suggestions.map((name) => (
              <li key={name} role="presentation">
                <button
                  type="button"
                  className="search-suggestion"
                  role="option"
                  onClick={() => pickSuggestion(name)}
                >
                  {name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="chip-row">
        {FILTERS.map((f) => (
          <button key={f} type="button" className={filter === f ? 'chip chip--on' : 'chip'} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>
      <label className="sort-bar field">
        <span>정렬</span>
        <select className="input" value={sort} onChange={(e) => setSort(e.target.value as SortOption)}>
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
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
      <Link to="/debts/new" className="fab" aria-label="채무 등록" />
    </div>
  )
}
