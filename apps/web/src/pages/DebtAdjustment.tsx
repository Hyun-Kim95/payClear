import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { api, ApiError, formatKRW, todayLocal, type DebtDetail } from '../api/client'

export function DebtAdjustmentPage() {
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
  const [showNegativeModal, setShowNegativeModal] = useState(false)

  useEffect(() => {
    if (!id) return
    api
      .debt(id)
      .then((d) => {
        if (d.status === 'archived') {
          setError('보관된 채무는 조정할 수 없습니다.')
          return
        }
        setDebt(d)
      })
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const parsedAmount = Number(amount.replace(/,/g, ''))
  const projectedBalance = debt ? debt.balance + parsedAmount : 0

  const doSubmit = async () => {
    if (!id || !debt) return
    setSubmitting(true)
    setError(null)
    setFieldErrors({})
    try {
      await api.addAdjustment(id, {
        amount: parsedAmount,
        occurred_on: occurredOn,
        note: note.trim(),
      })
      navigate(`/debts/${id}`)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        if (err.fields) setFieldErrors(err.fields)
      } else {
        setError('조정 기록에 실패했습니다.')
      }
    } finally {
      setSubmitting(false)
      setShowNegativeModal(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!debt) return
    if (projectedBalance < 0) {
      setShowNegativeModal(true)
      return
    }
    void doSubmit()
  }

  if (loading) return <div className="skeleton" style={{ height: '10rem' }} />
  if (error && !debt) return <div className="state-box state-box--error">{error}</div>
  if (!debt) return null

  return (
    <div>
      <Link to={`/debts/${id}`} className="back">
        ← 상세
      </Link>
      <h1 className="page-title">조정 입력</h1>
      <div className="detail-hero" style={{ marginBottom: '1.25rem' }}>
        <div className="muted">{debt.contact.display_name}</div>
        <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>현재 잔액 {formatKRW(debt.balance)}</div>
      </div>

      <form className="form-stack" onSubmit={handleSubmit}>
        <label className="field">
          <span>조정 금액 (원, ±)</span>
          <input
            className="input"
            type="text"
            inputMode="numeric"
            placeholder="-10000 또는 50000"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d-]/g, ''))}
            required
          />
          {fieldErrors.amount && <p className="field-error">{fieldErrors.amount}</p>}
        </label>
        <label className="field">
          <span>사유 (필수)</span>
          <textarea
            className="input"
            rows={3}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            required
          />
          {fieldErrors.note && <p className="field-error">{fieldErrors.note}</p>}
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
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn btn--primary btn--block" disabled={submitting || !online}>
          {submitting ? '저장 중…' : '조정 기록'}
        </button>
      </form>

      {showNegativeModal && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowNegativeModal(false)}>
          <div className="modal" role="dialog" onClick={(e) => e.stopPropagation()}>
            <h2>잔액 확인</h2>
            <p>
              조정 후 잔액이 {formatKRW(projectedBalance)}이 됩니다. 계속할까요?
            </p>
            <div className="action-row">
              <button type="button" className="btn btn--ghost" onClick={() => setShowNegativeModal(false)}>
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
