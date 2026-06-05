import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, ApiError, todayLocal, type DebtDetail } from '../api/client'

export function DebtEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [debt, setDebt] = useState<DebtDetail | null>(null)
  const [contacts, setContacts] = useState<Array<{ id: string; display_name: string }>>([])
  const [contactId, setContactId] = useState('')
  const [occurredOn, setOccurredOn] = useState('')
  const [reason, setReason] = useState('')
  const [dueOn, setDueOn] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!id) return
    Promise.all([api.debt(id), api.contacts()])
      .then(([d, c]) => {
        if (d.status === 'archived') {
          setError('보관된 채무는 수정할 수 없습니다.')
          return
        }
        setDebt(d)
        setContactId(d.contact_id ?? '')
        setOccurredOn(d.occurred_on)
        setReason(d.reason)
        setDueOn(d.due_on ?? '')
        setContacts(c.items)
      })
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !debt) return
    setSubmitting(true)
    setError(null)
    setFieldErrors({})
    try {
      await api.patchDebt(id, {
        contact_id: contactId,
        occurred_on: occurredOn,
        reason: reason.trim(),
        due_on: dueOn || null,
        updated_at: debt.updated_at,
      })
      navigate(`/debts/${id}`)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        if (err.fields) setFieldErrors(err.fields)
      } else {
        setError('수정에 실패했습니다.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="skeleton" style={{ height: '10rem' }} />
  if (error && !debt) return <div className="state-box state-box--error">{error}</div>
  if (!debt) return null

  return (
    <div>
      <Link to={`/debts/${id}`} className="back">
        ← 상세
      </Link>
      <h1 className="page-title">채무 수정</h1>

      <form className="form-stack" onSubmit={submit}>
        <label className="field">
          <span>상대</span>
          <select className="input" value={contactId} onChange={(e) => setContactId(e.target.value)} required>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.display_name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>방향</span>
          <input className="input" disabled value={debt.direction === 'lent' ? '빌려줌' : '빌림'} />
        </label>
        <label className="field">
          <span>원금</span>
          <input className="input" disabled value={debt.principal.toLocaleString('ko-KR')} />
        </label>
        <label className="field">
          <span>발생일</span>
          <input
            className="input"
            type="date"
            max={todayLocal()}
            value={occurredOn}
            onChange={(e) => setOccurredOn(e.target.value)}
            required
          />
          {fieldErrors.occurred_on && <p className="field-error">{fieldErrors.occurred_on}</p>}
        </label>
        <label className="field">
          <span>사유</span>
          <textarea
            className="input"
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
          {fieldErrors.reason && <p className="field-error">{fieldErrors.reason}</p>}
        </label>
        <label className="field">
          <span>예정일 (선택)</span>
          <input
            className="input"
            type="date"
            min={occurredOn}
            value={dueOn}
            onChange={(e) => setDueOn(e.target.value)}
          />
          {fieldErrors.due_on && <p className="field-error">{fieldErrors.due_on}</p>}
        </label>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
          {submitting ? '저장 중…' : '저장'}
        </button>
      </form>
    </div>
  )
}
