import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, ApiError, formatKRW, type ContactDetail } from '../api/client'

export function ContactDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [contact, setContact] = useState<ContactDetail | null>(null)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    if (!id) return
    api
      .contact(id)
      .then((c) => {
        setContact(c)
        setName(c.display_name)
        setNote(c.note ?? '')
      })
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  const save = async () => {
    if (!id) return
    try {
      await api.updateContact(id, { display_name: name.trim(), note: note.trim() || null })
      setEditing(false)
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '저장 실패')
    }
  }

  const remove = async () => {
    if (!id || !confirm('이 상대를 삭제할까요?')) return
    try {
      await api.deleteContact(id)
      navigate('/contacts')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '삭제 실패')
    }
  }

  if (loading) return <div className="skeleton" />
  if (error && !contact) return <div className="state-box state-box--error">{error}</div>
  if (!contact) return null

  return (
    <div>
      <Link to="/contacts" className="back">
        ← 목록
      </Link>
      <h1 className="page-title">{contact.display_name}</h1>

      {editing ? (
        <div className="form-stack">
          <label className="field">
            <span>이름</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            <span>메모</span>
            <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <div className="action-row">
            <button type="button" className="btn btn--primary" onClick={() => void save()}>
              저장
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setEditing(false)}>
              취소
            </button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: '1.5rem' }}>
          {contact.note && <p className="muted">{contact.note}</p>}
          <div className="action-row" style={{ marginTop: '0.75rem' }}>
            <button type="button" className="btn btn--secondary" onClick={() => setEditing(true)}>
              수정
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => void remove()}>
              삭제
            </button>
          </div>
        </div>
      )}

      <div className="section-head">
        <h2>연결된 채무</h2>
      </div>
      {contact.debts.length === 0 ? (
        <p className="muted">채무가 없습니다.</p>
      ) : (
        contact.debts.map((d) => (
          <Link key={d.id} to={`/debts/${d.id}`} className="list-row">
            <span>
              {d.direction === 'lent' ? '빌려줌' : '빌림'} · {d.reason}
            </span>
            <span>{formatKRW(d.balance)}</span>
          </Link>
        ))
      )}
      {error && <p className="form-error">{error}</p>}
    </div>
  )
}
