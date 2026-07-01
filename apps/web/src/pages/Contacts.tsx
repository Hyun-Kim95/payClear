import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { api, isUnauthorizedError } from '../api/client'

export function ContactsPage() {
  const [items, setItems] = useState<Array<{ id: string; display_name: string }>>([])
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
        items.map((c) => (
          <Link key={c.id} to={`/contacts/${c.id}`} className="list-row">
            <span>{c.display_name}</span>
          </Link>
        ))
      )}
    </div>
  )
}
