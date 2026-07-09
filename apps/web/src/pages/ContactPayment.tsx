import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import {
  api,
  ApiError,
  formatKRW,
  PAYMENT_STRATEGY_LABELS,
  todayLocal,
  type ContactDetail,
  type PaymentStrategy,
} from '../api/client'
import { formatAmountDigits, parseAmountInput, sanitizeAmountDigits } from '../utils/amountInput'
import {
  CONTACT_PAYMENT_COPY,
  excessAllocatableAmount,
  isContactPaymentDirection,
  minAllocatableOccurredOn,
  sumAllocatableBalance,
  type ContactPaymentDirection,
} from '../utils/contactPayment'

const STRATEGY_OPTIONS: PaymentStrategy[] = [
  'oldest_first',
  'newest_first',
  'largest_first',
  'smallest_first',
]

export function ContactPaymentPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const directionParam = searchParams.get('direction')
  const direction: ContactPaymentDirection | null = isContactPaymentDirection(directionParam)
    ? directionParam
    : null
  const navigate = useNavigate()
  const online = useOnlineStatus()
  const [contact, setContact] = useState<ContactDetail | null>(null)
  const [amount, setAmount] = useState('')
  const [occurredOn, setOccurredOn] = useState(todayLocal())
  const [note, setNote] = useState('')
  const [strategy, setStrategy] = useState<PaymentStrategy>('oldest_first')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [showExcessModal, setShowExcessModal] = useState(false)

  const copy = direction ? CONTACT_PAYMENT_COPY[direction] : null

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

  const minOccurredOn = useMemo(() => {
    if (!contact || !direction) return null
    return minAllocatableOccurredOn(contact.debts, direction)
  }, [contact, direction])

  const totalBalance = useMemo(() => {
    if (!contact || !direction) return 0
    return sumAllocatableBalance(contact.debts, direction)
  }, [contact, direction])

  const allocatableBalance = useMemo(() => {
    if (!contact || !direction) return 0
    return sumAllocatableBalance(contact.debts, direction, occurredOn)
  }, [contact, direction, occurredOn])

  const parsedAmount = parseAmountInput(amount)
  const unallocatedAmount = excessAllocatableAmount(parsedAmount, allocatableBalance)
  const hasExcessAmount = unallocatedAmount > 0

  const doSubmit = async () => {
    if (!id || !direction) return
    setError(null)
    setFieldErrors({})
    setSubmitting(true)
    try {
      const result = await api.allocateContactPayment(id, {
        amount: parsedAmount,
        occurred_on: occurredOn,
        direction,
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
        setError(direction === 'borrowed' ? '일괄 상환에 실패했습니다.' : '일괄 받음 기록에 실패했습니다.')
      }
    } finally {
      setSubmitting(false)
      setShowExcessModal(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (hasExcessAmount) {
      setShowExcessModal(true)
      return
    }
    void doSubmit()
  }

  if (loading) return <div className="skeleton" style={{ height: '10rem' }} />
  if (!direction) {
    return (
      <div>
        <Link to={`/contacts/${id}`} className="back">
          ← 상대
        </Link>
        <div className="state-box state-box--error" style={{ marginTop: '1rem' }}>
          채무 방향이 지정되지 않았습니다. 상대 상세에서 다시 선택해 주세요.
        </div>
      </div>
    )
  }
  if (error && !contact) return <div className="state-box state-box--error">{error}</div>
  if (!contact || !copy) return null

  const balanceHint =
    allocatableBalance < totalBalance
      ? `선택한 일자 기준 배분 가능 ${formatKRW(allocatableBalance)}`
      : null

  return (
    <div>
      <Link to={`/contacts/${id}`} className="back">
        ← 상대
      </Link>
      <h1 className="page-title">{copy.pageTitle}</h1>
      <p className="muted" style={{ marginBottom: '1rem' }}>
        {contact.display_name} · {copy.balanceSummary} {formatKRW(totalBalance)}
        {balanceHint && (
          <>
            <br />
            {balanceHint}
          </>
        )}
        <br />
        분할 채무는 자동 배분 대상에서 제외됩니다.
      </p>

      <form className="form-stack" onSubmit={handleSubmit}>
        <label className="field">
          <span>{copy.amountLabel}</span>
          <input
            className="input"
            type="text"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(formatAmountDigits(sanitizeAmountDigits(e.target.value)))}
            required
          />
          <div className="chip-row" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
            <button
              type="button"
              className="chip"
              disabled={allocatableBalance <= 0}
              onClick={() => setAmount(formatAmountDigits(String(allocatableBalance)))}
            >
              전액
            </button>
          </div>
          {hasExcessAmount && (
            <p className="field-hint" style={{ marginTop: '0.5rem', color: 'var(--pc-muted)' }}>
              배분 가능 잔액({formatKRW(allocatableBalance)})보다 {formatKRW(unallocatedAmount)} 많습니다.
              초과분은 미배분으로 남습니다.
            </p>
          )}
          {fieldErrors.amount && <p className="field-error">{fieldErrors.amount}</p>}
          {fieldErrors.direction && <p className="field-error">{fieldErrors.direction}</p>}
        </label>

        <label className="field">
          <span>일자</span>
          <input
            className="input"
            type="date"
            min={minOccurredOn ?? undefined}
            max={todayLocal()}
            value={occurredOn}
            onChange={(e) => setOccurredOn(e.target.value)}
            required
          />
          {minOccurredOn && (
            <p className="field-hint" style={{ marginTop: '0.35rem', color: 'var(--pc-muted)', fontSize: '0.8125rem' }}>
              채무 최초 발생일({minOccurredOn}) 이후만 선택할 수 있습니다.
            </p>
          )}
          {allocatableBalance <= 0 && totalBalance > 0 && (
            <p className="field-error">선택한 일자에 배분 가능한 채무가 없습니다.</p>
          )}
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

        <button
          type="submit"
          className="btn btn--primary btn--block"
          disabled={submitting || !online || allocatableBalance <= 0}
        >
          {submitting ? copy.submittingLabel : copy.submitLabel}
        </button>
      </form>

      {showExcessModal && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowExcessModal(false)}>
          <div className="modal" role="dialog" aria-labelledby="excess-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="excess-title">초과 금액 확인</h2>
            <p>
              입력 금액 {formatKRW(parsedAmount)} 중 {formatKRW(allocatableBalance)}만 배분되고,
              <br />
              {formatKRW(unallocatedAmount)}은 미배분으로 남습니다. 계속할까요?
            </p>
            <div className="action-row">
              <button type="button" className="btn btn--ghost" onClick={() => setShowExcessModal(false)}>
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
