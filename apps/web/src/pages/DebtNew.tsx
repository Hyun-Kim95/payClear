import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { api, ApiError, todayLocal } from '../api/client'

export function DebtNewPage() {
  const navigate = useNavigate()
  const online = useOnlineStatus()
  const [contacts, setContacts] = useState<Array<{ id: string; display_name: string }>>([])
  const [contactName, setContactName] = useState('')
  const [direction, setDirection] = useState<'lent' | 'borrowed'>('lent')
  const [principal, setPrincipal] = useState('')
  const [occurredOn, setOccurredOn] = useState(todayLocal())
  const [reason, setReason] = useState('')
  const [dueOn, setDueOn] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    api.contacts().then((r) => setContacts(r.items))
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    setSubmitting(true)

    try {
      const amount = Number(principal.replace(/,/g, ''))
      const debt = await api.createDebt({
        contact_name: contactName.trim(),
        direction,
        principal: amount,
        occurred_on: occurredOn,
        reason: reason.trim(),
        due_on: dueOn || null,
      })
      navigate(`/debts/${debt.id}`)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        if (err.fields) setFieldErrors(err.fields)
      } else {
        setError('등록에 실패했습니다.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <Link to="/debts" className="back">
        ← 취소
      </Link>
      <h1 className="page-title">채무 등록</h1>

      <form className="form-stack" onSubmit={submit}>
        <label className="field">
          <span>상대</span>
          <input
            className="input"
            list="contact-name-suggestions"
            placeholder="이름 입력 (자동 등록)"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            required
          />
          <datalist id="contact-name-suggestions">
            {contacts.map((c) => (
              <option key={c.id} value={c.display_name} />
            ))}
          </datalist>
          {fieldErrors.contact_name && <p className="field-error">{fieldErrors.contact_name}</p>}
          {fieldErrors.contact_id && <p className="field-error">{fieldErrors.contact_id}</p>}
        </label>

        <fieldset className="field">
          <legend>방향</legend>
          <div className="chip-row" style={{ marginBottom: 0 }}>
            <button
              type="button"
              className={direction === 'lent' ? 'chip chip--on' : 'chip'}
              onClick={() => setDirection('lent')}
            >
              빌려줌
            </button>
            <button
              type="button"
              className={direction === 'borrowed' ? 'chip chip--on' : 'chip'}
              onClick={() => setDirection('borrowed')}
            >
              빌림
            </button>
          </div>
          {fieldErrors.direction && <p className="field-error">{fieldErrors.direction}</p>}
        </fieldset>

        <label className="field">
          <span>원금 (원)</span>
          <input
            className="input"
            type="text"
            inputMode="numeric"
            placeholder="500000"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value.replace(/[^\d]/g, ''))}
            required
          />
          {fieldErrors.principal && <p className="field-error">{fieldErrors.principal}</p>}
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
            placeholder="1~500자"
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

        {fieldErrors.split && <p className="field-error">{fieldErrors.split}</p>}
        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn btn--primary btn--block" disabled={submitting || !online}>
          {submitting ? '등록 중…' : '등록'}
        </button>
      </form>
    </div>
  )
}
