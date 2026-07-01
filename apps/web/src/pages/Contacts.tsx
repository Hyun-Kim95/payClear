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
      <h1 className="page-title">상대</h1>
      <p className="muted" style={{ marginBottom: '1rem' }}>
        채무 등록 시 이름이 자동으로 추가됩니다. 별도 등록은 필요 없습니다.
      </p>
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
