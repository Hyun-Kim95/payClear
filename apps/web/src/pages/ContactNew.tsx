import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api/client'

export function ContactNewPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const c = await api.createContact(name.trim(), note.trim() || undefined)
      navigate(`/contacts/${c.id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '등록에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <Link to="/contacts" className="back">
        ← 상대 목록
      </Link>
      <h1 className="page-title">상대 등록</h1>
      <form className="form-stack" onSubmit={submit}>
        <label className="field">
          <span>이름</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="field">
          <span>메모 (선택)</span>
          <textarea className="input" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
          등록
        </button>
      </form>
    </div>
  )
}
