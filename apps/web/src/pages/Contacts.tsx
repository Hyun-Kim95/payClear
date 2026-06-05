import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

export function ContactsPage() {
  const [items, setItems] = useState<Array<{ id: string; display_name: string }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.contacts().then((r) => setItems(r.items)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="skeleton" />

  return (
    <div>
      <div className="section-head">
        <h1 className="page-title" style={{ margin: 0 }}>
          상대
        </h1>
        <Link to="/contacts/new" className="btn btn--primary">
          등록
        </Link>
      </div>
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
