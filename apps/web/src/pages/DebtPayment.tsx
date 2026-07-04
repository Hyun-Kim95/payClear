import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { api, ApiError, formatKRW, todayLocal, type DebtDetail } from '../api/client'

export function DebtPaymentPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const online = useOnlineStatus()
  const [debt, setDebt] = useState<DebtDetail | null>(null)
  const [amount, setAmount] = useState('')
  const [occurredOn, setOccurredOn] = useState(todayLocal())
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [showOverpayModal, setShowOverpayModal] = useState(false)

  useEffect(() => {
    if (!id) return
    api
      .debt(id)
      .then((d) => {
        if (d.status === 'archived') {
          setError('보관된 채무는 상환할 수 없습니다.')
          return
        }
        setDebt(d)
        setOccurredOn(todayLocal())
      })
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const parsedAmount = Number(amount.replace(/,/g, ''))
  const effectiveBalance = debt?.balance ?? 0
  const isOverpayment =
    !!debt && effectiveBalance > 0 && parsedAmount > 0 && parsedAmount > effectiveBalance

  const doSubmit = async () => {
    if (!id || !debt) return
    setError(null)
    setFieldErrors({})
    setSubmitting(true)
    try {
      await api.addPayment(id, {
        amount: parsedAmount,
        occurred_on: occurredOn,
        note: note.trim() || null,
      })
      navigate(`/debts/${id}`)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        if (err.fields) setFieldErrors(err.fields)
      } else {
        setError('상환 기록에 실패했습니다.')
      }
    } finally {
      setSubmitting(false)
      setShowOverpayModal(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isOverpayment) {
      setShowOverpayModal(true)
      return
    }
    void doSubmit()
  }

  if (loading) return <div className="skeleton" style={{ height: '10rem' }} />
  if (error && !debt) return <div className="state-box state-box--error">{error}</div>
  if (!debt) return null

  const balanceLabel =
    effectiveBalance < 0 ? `초과 상환 ${formatKRW(effectiveBalance)}` : formatKRW(effectiveBalance)

  return (
    <div>
      <Link to={`/debts/${id}`} className="back">
        ← 상세
      </Link>
      <h1 className="page-title">상환 입력</h1>

      <div className="detail-hero" style={{ marginBottom: '1.25rem' }}>
        <div className="muted">{debt.contact.display_name}</div>
        <div className="detail-balance" style={{ fontSize: '1.5rem', margin: '0.25rem 0' }}>
          현재 잔액 {balanceLabel}
        </div>
      </div>

      <form className="form-stack" onSubmit={handleSubmit}>
        <label className="field">
          <span>상환 금액 (원)</span>
          <input
            className="input"
            type="text"
            inputMode="numeric"
            placeholder="100000"
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
            min={debt.occurred_on}
            max={todayLocal()}
            value={occurredOn}
            onChange={(e) => setOccurredOn(e.target.value)}
            required
          />
          {fieldErrors.occurred_on && <p className="field-error">{fieldErrors.occurred_on}</p>}
        </label>

        <label className="field">
          <span>메모 (선택)</span>
          <textarea
            className="input"
            rows={2}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {fieldErrors.note && <p className="field-error">{fieldErrors.note}</p>}
        </label>

        {error && debt && <p className="form-error">{error}</p>}

        <button type="submit" className="btn btn--primary btn--block" disabled={submitting || !online}>
          {submitting ? '저장 중…' : '상환 기록'}
        </button>
      </form>

      {showOverpayModal && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowOverpayModal(false)}>
          <div className="modal" role="dialog" aria-labelledby="overpay-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="overpay-title">초과 상환 확인</h2>
            <p>
              상환 금액이 잔액({formatKRW(effectiveBalance)})보다 큽니다.
              <br />
              초과분 {formatKRW(parsedAmount - effectiveBalance)}을 기록할까요?
            </p>
            <div className="action-row">
              <button type="button" className="btn btn--ghost" onClick={() => setShowOverpayModal(false)}>
                취소
              </button>
              <button type="button" className="btn btn--primary" onClick={() => void doSubmit()} disabled={submitting}>
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
