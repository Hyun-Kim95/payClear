import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  api,
  ApiError,
  formatKRW,
  PAYMENT_STRATEGY_LABELS,
  WEEKDAY_LABELS,
  type ContactDetail,
  type DueScheduleType,
} from '../api/client'

type PaymentResult = {
  allocated_total: number
  unallocated: number
  payments: Array<{ debt_id: string; amount: number; reason: string }>
}

export function ContactDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const paymentResult = (location.state as { paymentResult?: PaymentResult } | null)?.paymentResult
  const [contact, setContact] = useState<ContactDetail | null>(null)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [scheduleType, setScheduleType] = useState<DueScheduleType>('none')
  const [scheduleValue, setScheduleValue] = useState('')
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const load = () => {
    if (!id) return
    api
      .contact(id)
      .then((c) => {
        setContact(c)
        setName(c.display_name)
        setNote(c.note ?? '')
        setScheduleType(c.due_schedule_type ?? 'none')
        setScheduleValue(c.due_schedule_value != null ? String(c.due_schedule_value) : '')
        setError(null)
        setFieldErrors({})
      })
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  const allocatableBalance = useMemo(() => {
    if (!contact) return 0
    return contact.debts
      .filter((d) => d.status === 'active')
      .reduce((sum, d) => sum + Math.max(0, d.balance), 0)
  }, [contact])

  const strategyLabel =
    PAYMENT_STRATEGY_LABELS[contact?.payment_strategy ?? 'oldest_first'] ?? PAYMENT_STRATEGY_LABELS.oldest_first

  const save = async () => {
    if (!id) return
    const trimmedName = name.trim()
    if (!trimmedName) {
      setFieldErrors({ display_name: '이름을 입력해 주세요.' })
      setError(null)
      return
    }

    let parsedValue: number | null = null
    if (scheduleType !== 'none') {
      if (scheduleValue === '') {
        setFieldErrors({ due_schedule: '주기 값을 선택해 주세요.' })
        setError(null)
        return
      }
      parsedValue = Number(scheduleValue)
      if (!Number.isInteger(parsedValue)) {
        setFieldErrors({ due_schedule: '주기 값을 선택해 주세요.' })
        setError(null)
        return
      }
    }

    setError(null)
    setFieldErrors({})
    try {
      await api.updateContact(id, {
        display_name: trimmedName,
        note: note.trim() || null,
        due_schedule_type: scheduleType,
        due_schedule_value: parsedValue,
      })
      setEditing(false)
      load()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        if (err.fields) setFieldErrors(err.fields)
      } else {
        setError('저장에 실패했습니다. 네트워크 연결을 확인해 주세요.')
      }
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
            {fieldErrors.display_name && <p className="field-error">{fieldErrors.display_name}</p>}
          </label>
          <label className="field">
            <span>메모</span>
            <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <fieldset className="field">
            <legend>정기 상환 주기</legend>
            <label className="radio-row">
              <input
                type="radio"
                name="scheduleType"
                checked={scheduleType === 'none'}
                onChange={() => {
                  setScheduleType('none')
                  setScheduleValue('')
                }}
              />
              없음
            </label>
            <label className="radio-row">
              <input
                type="radio"
                name="scheduleType"
                checked={scheduleType === 'monthly'}
                onChange={() => {
                  setScheduleType('monthly')
                  setScheduleValue('1')
                }}
              />
              매월
            </label>
            {scheduleType === 'monthly' && (
              <select
                className="input"
                value={scheduleValue}
                onChange={(e) => setScheduleValue(e.target.value)}
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>
                    {day}일
                  </option>
                ))}
              </select>
            )}
            <label className="radio-row">
              <input
                type="radio"
                name="scheduleType"
                checked={scheduleType === 'weekly'}
                onChange={() => {
                  setScheduleType('weekly')
                  setScheduleValue('1')
                }}
              />
              매주
            </label>
            {scheduleType === 'weekly' && (
              <select
                className="input"
                value={scheduleValue}
                onChange={(e) => setScheduleValue(e.target.value)}
              >
                {WEEKDAY_LABELS.map((label, i) => (
                  <option key={i} value={String(i)}>
                    {label}요일
                  </option>
                ))}
              </select>
            )}
            {fieldErrors.due_schedule && <p className="field-error">{fieldErrors.due_schedule}</p>}
          </fieldset>
          {error && <p className="form-error">{error}</p>}
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
          <p className="muted" style={{ marginTop: '0.5rem' }}>
            기본 배분: {strategyLabel}
          </p>
          {contact.due_schedule_label && (
            <p className="muted" style={{ marginTop: '0.25rem' }}>
              정기 상환: {contact.due_schedule_label}
            </p>
          )}
          <div className="action-row" style={{ marginTop: '0.75rem' }}>
            {allocatableBalance > 0 && (
              <Link to={`/contacts/${id}/payment`} className="btn btn--primary action-row__span">
                일괄 상환
              </Link>
            )}
            <button type="button" className="btn btn--secondary" onClick={() => setEditing(true)}>
              수정
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => void remove()}>
              삭제
            </button>
          </div>
        </div>
      )}

      {paymentResult && (
        <div className="state-box state-box--success" style={{ marginBottom: '1rem' }}>
          <p style={{ margin: 0 }}>
            {formatKRW(paymentResult.allocated_total)} 배분 완료
            {paymentResult.unallocated > 0 && ` · ${formatKRW(paymentResult.unallocated)} 미배분`}
          </p>
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
      {error && !editing && <p className="form-error">{error}</p>}
    </div>
  )
}
