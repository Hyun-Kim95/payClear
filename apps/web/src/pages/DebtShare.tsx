import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, ApiError, type ShareLink } from '../api/client'

const EXPIRY_OPTIONS = [
  { value: 30, label: '30일' },
  { value: 90, label: '90일 (기본)' },
  { value: 180, label: '180일' },
  { value: 'none', label: '무제한' },
] as const

export function DebtSharePage() {
  const { id } = useParams()
  const [active, setActive] = useState<ShareLink | null>(null)
  const [expiresIn, setExpiresIn] = useState<string>('90')
  const [pin, setPin] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [includeReason, setIncludeReason] = useState(true)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showReplaceModal, setShowReplaceModal] = useState(false)

  const load = () => {
    if (!id) return
    api
      .getShare(id)
      .then(setActive)
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  const doCreate = async () => {
    if (!id) return
    setSubmitting(true)
    setError(null)
    try {
      const expires_in_days =
        expiresIn === 'none' ? null : Number(expiresIn)
      const created = await api.createShare(id, {
        expires_in_days,
        pin: pin.trim() || null,
        anonymous,
        include_reason: includeReason,
      })
      setActive(created)
      setShowReplaceModal(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '생성에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreate = () => {
    if (active) {
      setShowReplaceModal(true)
      return
    }
    void doCreate()
  }

  const handleRevoke = async () => {
    if (!id || !confirm('공유 링크를 회수할까요?')) return
    try {
      await api.revokeShare(id)
      setActive(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '회수에 실패했습니다.')
    }
  }

  const copyLink = async () => {
    if (!active?.url) return
    await navigator.clipboard.writeText(active.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="skeleton" style={{ height: '10rem' }} />

  return (
    <div>
      <Link to={`/debts/${id}`} className="back">
        ← 상세
      </Link>
      <h1 className="page-title">공유 링크</h1>

      {active && (
        <div className="detail-hero" style={{ marginBottom: '1.25rem' }}>
          <p className="muted">활성 링크</p>
          <p style={{ wordBreak: 'break-all', fontSize: '0.875rem' }}>{active.url}</p>
          <div className="action-row" style={{ marginTop: '0.75rem' }}>
            <button type="button" className="btn btn--primary" onClick={() => void copyLink()}>
              {copied ? '복사됨' : '링크 복사'}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => void handleRevoke()}>
              회수
            </button>
          </div>
        </div>
      )}

      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault()
          handleCreate()
        }}
      >
        <label className="field">
          <span>만료</span>
          <select className="input" value={expiresIn} onChange={(e) => setExpiresIn(e.target.value)}>
            {EXPIRY_OPTIONS.map((o) => (
              <option key={o.label} value={o.value === 'none' ? 'none' : String(o.value)}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>PIN (선택, 4~6자리)</span>
          <input
            className="input"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="비워두면 PIN 없음"
          />
        </label>
        <label className="radio-row">
          <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
          익명(상대)으로 표시
        </label>
        <label className="radio-row">
          <input
            type="checkbox"
            checked={includeReason}
            onChange={(e) => setIncludeReason(e.target.checked)}
          />
          사유 포함
        </label>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
          {active ? '새 링크 생성 (기존 회수)' : '링크 생성'}
        </button>
      </form>

      {showReplaceModal && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowReplaceModal(false)}>
          <div className="modal" role="dialog" onClick={(e) => e.stopPropagation()}>
            <h2>링크 교체</h2>
            <p>새 링크를 만들면 기존 공유 링크는 즉시 무효화됩니다. 계속할까요?</p>
            <div className="action-row">
              <button type="button" className="btn btn--ghost" onClick={() => setShowReplaceModal(false)}>
                취소
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={submitting}
                onClick={() => void doCreate()}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
