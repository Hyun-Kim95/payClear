import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, ApiError, formatKRW, todayLocal } from '../api/client'

/** 총액을 n명에게 균등 분배(나머지는 첫 참여자에). */
function splitEqually(principal: number, n: number): number[] {
  if (n <= 0) return []
  const base = Math.floor(principal / n)
  const shares = Array(n).fill(base)
  shares[0] += principal - base * n
  return shares
}

/** 분담액을 count회차로 분할(나머지는 마지막 회차에). */
function splitInstallmentAmounts(share: number, count: number): number[] {
  if (count <= 0) return []
  const base = Math.floor(share / count)
  const amounts = Array(count).fill(base)
  amounts[count - 1] += share - base * count
  return amounts
}

/** YYYY-MM-DD에 months를 더한다(말일 보정). */
function addMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d) return isoDate
  const monthIndex = m - 1 + months
  const year = y + Math.floor(monthIndex / 12)
  const month = ((monthIndex % 12) + 12) % 12
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const day = Math.min(d, lastDay)
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function DebtNewPage() {
  const navigate = useNavigate()
  const [contacts, setContacts] = useState<Array<{ id: string; display_name: string }>>([])
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [contactId, setContactId] = useState('')
  const [contactName, setContactName] = useState('')
  const [direction, setDirection] = useState<'lent' | 'borrowed'>('lent')
  const [principal, setPrincipal] = useState('')
  const [occurredOn, setOccurredOn] = useState(todayLocal())
  const [reason, setReason] = useState('')
  const [dueOn, setDueOn] = useState('')
  const [isSplit, setIsSplit] = useState(false)
  const [participantNames, setParticipantNames] = useState<string[]>(['', ''])
  const [installCount, setInstallCount] = useState('3')
  const [intervalMonths, setIntervalMonths] = useState('1')
  const [startOn, setStartOn] = useState(todayLocal())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    api.contacts().then((r) => {
      setContacts(r.items)
      if (r.items[0]) setContactId(r.items[0].id)
    })
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    setSubmitting(true)

    try {
      const amount = Number(principal.replace(/,/g, ''))
      const trimmedNames = participantNames.map((n) => n.trim()).filter(Boolean)
      const debt = await api.createDebt({
        contact_id: mode === 'existing' ? contactId : undefined,
        contact_name: mode === 'new' ? contactName : undefined,
        direction,
        principal: amount,
        occurred_on: occurredOn,
        reason: reason.trim(),
        due_on: isSplit ? null : dueOn || null,
        split: isSplit
          ? {
              participants: trimmedNames.map((label) => ({ label })),
              installment: {
                count: Number(installCount) || 0,
                interval_months: Number(intervalMonths) || 0,
                start_on: startOn,
              },
            }
          : undefined,
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

  const principalNum = Number(principal.replace(/,/g, '')) || 0
  const validNames = participantNames.map((n) => n.trim()).filter(Boolean)
  const shares = splitEqually(principalNum, validNames.length)
  const countNum = Number(installCount) || 0
  const firstShare = shares[0] ?? 0
  const firstInstallments =
    countNum > 0 && firstShare > 0 ? splitInstallmentAmounts(firstShare, countNum) : []
  const intervalNum = Number(intervalMonths) || 0

  const setParticipant = (i: number, value: string) =>
    setParticipantNames((prev) => prev.map((n, idx) => (idx === i ? value : n)))
  const addParticipant = () => setParticipantNames((prev) => [...prev, ''])
  const removeParticipant = (i: number) =>
    setParticipantNames((prev) => (prev.length <= 2 ? prev : prev.filter((_, idx) => idx !== i)))

  return (
    <div>
      <Link to="/debts" className="back">
        ← 취소
      </Link>
      <h1 className="page-title">채무 등록</h1>

      <form className="form-stack" onSubmit={submit}>
        <fieldset className="field">
          <legend>상대</legend>
          <label className="radio-row">
            <input
              type="radio"
              name="contactMode"
              checked={mode === 'existing'}
              onChange={() => setMode('existing')}
            />
            기존 상대
          </label>
          {mode === 'existing' && (
            <select
              className="input"
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              required
            >
              {contacts.length === 0 && <option value="">상대 없음 — 새로 추가하세요</option>}
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.display_name}
                </option>
              ))}
            </select>
          )}
          <label className="radio-row">
            <input type="radio" name="contactMode" checked={mode === 'new'} onChange={() => setMode('new')} />
            새 상대
          </label>
          {mode === 'new' && (
            <input
              className="input"
              placeholder="이름"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              required
            />
          )}
          {fieldErrors.contact_id && <p className="field-error">{fieldErrors.contact_id}</p>}
        </fieldset>

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

        <fieldset className="field">
          <legend>분할 상환</legend>
          <label className="radio-row" style={{ marginBottom: 0 }}>
            <input
              type="checkbox"
              checked={isSplit}
              onChange={(e) => setIsSplit(e.target.checked)}
            />
            여러 명이 1/N로 나눠 회차별로 갚기
          </label>
        </fieldset>

        {!isSplit && (
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
        )}

        {isSplit && (
          <>
            <fieldset className="field">
              <legend>참여자 ({validNames.length}명)</legend>
              {participantNames.map((name, i) => (
                <div key={i} className="action-row" style={{ marginBottom: '0.5rem' }}>
                  <input
                    className="input"
                    placeholder={`참여자 ${i + 1} (예: 나, 동생)`}
                    value={name}
                    onChange={(e) => setParticipant(i, e.target.value)}
                    maxLength={40}
                  />
                  {participantNames.length > 2 && (
                    <button type="button" className="btn btn--ghost" onClick={() => removeParticipant(i)}>
                      삭제
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className="btn btn--ghost btn--block" onClick={addParticipant}>
                + 참여자 추가
              </button>
              {fieldErrors.split && <p className="field-error">{fieldErrors.split}</p>}
              {principalNum > 0 && validNames.length >= 2 && (
                <ul className="preview-list" style={{ marginTop: '0.75rem' }}>
                  {validNames.map((label, i) => (
                    <li key={i} className="preview-row">
                      <span>{label}</span>
                      <strong>{formatKRW(shares[i] ?? 0)}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </fieldset>

            <div className="field-grid">
              <label className="field">
                <span>회차 수</span>
                <input
                  className="input"
                  type="text"
                  inputMode="numeric"
                  value={installCount}
                  onChange={(e) => setInstallCount(e.target.value.replace(/[^\d]/g, ''))}
                />
              </label>
              <label className="field">
                <span>간격(개월)</span>
                <input
                  className="input"
                  type="text"
                  inputMode="numeric"
                  value={intervalMonths}
                  onChange={(e) => setIntervalMonths(e.target.value.replace(/[^\d]/g, ''))}
                />
              </label>
            </div>
            <label className="field">
              <span>1회차 예정일</span>
              <input
                className="input"
                type="date"
                value={startOn}
                onChange={(e) => setStartOn(e.target.value)}
              />
            </label>

            {firstInstallments.length > 0 && intervalNum > 0 && (
              <div className="state-box" style={{ textAlign: 'left' }}>
                <div className="muted" style={{ marginBottom: '0.5rem' }}>
                  회차 미리보기 (참여자 1인 기준, 각 {validNames.length}명 동일)
                </div>
                <ul className="preview-list">
                  {firstInstallments.map((amt, k) => (
                    <li key={k} className="preview-row">
                      <span>
                        {k + 1}회차 · {addMonths(startOn, k * intervalNum)}
                      </span>
                      <strong>{formatKRW(amt)}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
          {submitting ? '등록 중…' : '등록'}
        </button>
      </form>
    </div>
  )
}
