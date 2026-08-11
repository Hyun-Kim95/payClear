import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { api, formatKRW, isUnauthorizedError, type Contact } from '../api/client'

export function ContactsPage() {
  const [items, setItems] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [authExpired, setAuthExpired] = useState(false)

  useEffect(() => {
    api
      .contacts()
      .then((r) => setItems(r.items))
      .catch((e) => {
        if (isUnauthorizedError(e)) setAuthExpired(true)
      })
      .finally(() => setLoading(false))
  }, [])

  if (authExpired) return <Navigate to="/login" replace />
  if (loading) return <div className="skeleton" />

  return (
    <div>
      <h1 className="page-title">상대</h1>
      {items.length === 0 ? (
        <p className="muted">등록된 상대가 없습니다.</p>
      ) : (
        items.map((c) => {
          const receivable = c.total_receivable ?? 0
          const payable = c.total_payable ?? 0
          return (
            <Link key={c.id} to={`/contacts/${c.id}`} className="list-row">
              <span>{c.display_name}</span>
              <span className="list-row__meta muted">
                <span>받을 돈 {formatKRW(receivable)}</span>
                <span>갚을 돈 {formatKRW(payable)}</span>
              </span>
            </Link>
          )
        })
      )}
    </div>
  )
}
