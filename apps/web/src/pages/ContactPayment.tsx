import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  api,
  ApiError,
  formatKRW,
  PAYMENT_STRATEGY_LABELS,
  todayLocal,
  type ContactDetail,
  type PaymentStrategy,
} from '../api/client'

const STRATEGY_OPTIONS: PaymentStrategy[] = [
  'oldest_first',
  'newest_first',
  'largest_first',
  'smallest_first',
]

export function ContactPaymentPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [contact, setContact] = useState<ContactDetail | null>(null)
  const [amount, setAmount] = useState('')
  const [occurredOn, setOccurredOn] = useState(todayLocal())
  const [note, setNote] = useState('')
  const [strategy, setStrategy] = useState<PaymentStrategy>('oldest_first')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!id) return
    api
      .contact(id)
      .then((c) => {
        setContact(c)
        setStrategy(c.payment_strategy ?? 'oldest_first')
      })
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const totalBalance = useMemo(() => {
    if (!contact) return 0
    return contact.debts
      .filter((d) => d.status === 'active')
      .reduce((sum, d) => sum + Math.max(0, d.balance), 0)
  }, [contact])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    setError(null)
    setFieldErrors({})
    setSubmitting(true)
    try {
      const parsed = Number(amount.replace(/,/g, ''))
      const result = await api.allocateContactPayment(id, {
        amount: parsed,
        occurred_on: occurredOn,
        note: note.trim() || null,
        strategy,
      })
      await api.updateContact(id, { payment_strategy: strategy })
      navigate(`/contacts/${id}`, {
        state: {
          paymentResult: result,
        },
      })
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        if (err.fields) setFieldErrors(err.fields)
      } else {
        setError('일괄 상환에 실패했습니다.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="skeleton" style={{ height: '10rem' }} />
  if (error && !contact) return <div className="state-box state-box--error">{error}</div>
  if (!contact) return null

  return (
    <div>
      <Link to={`/contacts/${id}`} className="back">
        ← 상대
      </Link>
      <h1 className="page-title">일괄 상환</h1>
      <p className="muted" style={{ marginBottom: '1rem' }}>
        {contact.display_name} · 배분 가능 잔액 합계 {formatKRW(totalBalance)}
        <br />
        분할 채무는 자동 배분 대상에서 제외됩니다.
      </p>

      <form className="form-stack" onSubmit={submit}>
        <label className="field">
          <span>총 상환 금액 (원)</span>
          <input
            className="input"
            type="text"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
            required
          />
          {fieldErrors.amount && <p className="field-error">{fieldErrors.amount}</p>}
        </label>

        <label className="field">
          <span>일자</span>
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

        <fieldset className="field">
          <legend>배분 방식</legend>
          {STRATEGY_OPTIONS.map((value) => (
            <label key={value} className="radio-row">
              <input
                type="radio"
                name="strategy"
                checked={strategy === value}
                onChange={() => setStrategy(value)}
              />
              {PAYMENT_STRATEGY_LABELS[value]}
            </label>
          ))}
        </fieldset>

        <label className="field">
          <span>메모 (선택)</span>
          <textarea
            className="input"
            rows={2}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
          {submitting ? '배분 중…' : '자동 배분 상환'}
        </button>
      </form>
    </div>
  )
}
