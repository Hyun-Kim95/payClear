import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, ApiError, formatKRW, type PublicShareView } from '../api/client'

export function ShareViewPage() {
  const { token } = useParams()
  const [view, setView] = useState<PublicShareView | null>(null)
  const [pin, setPin] = useState('')
  const [needsPin, setNeedsPin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ code: string; message: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const load = (pinValue?: string) => {
    if (!token) return
    setLoading(true)
    setError(null)
    api
      .getPublicShare(token, pinValue)
      .then((v) => {
        setView(v)
        setNeedsPin(false)
      })
      .catch((e: ApiError) => {
        if (e.code === 'SHARE_PIN_INVALID' && !pinValue) {
          setNeedsPin(true)
          setError(null)
        } else {
          setError({ code: e.code, message: e.message })
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [token])

  const submitPin = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    load(pin)
    setSubmitting(false)
  }

  if (loading && !needsPin) {
    return (
      <div className="share-page">
        <div className="skeleton share-card" style={{ height: '12rem' }} />
      </div>
    )
  }

  if (error?.code === 'SHARE_INVALID') {
    return (
      <div className="share-page">
        <div className="share-card">
          <h1>링크를 사용할 수 없습니다</h1>
          <p className="muted">{error.message}</p>
        </div>
      </div>
    )
  }

  if (error?.code === 'SHARE_PIN_LOCKED') {
    return (
      <div className="share-page">
        <div className="share-card">
          <h1>잠시 후 다시 시도</h1>
          <p className="muted">{error.message}</p>
        </div>
      </div>
    )
  }

  if (needsPin || (error?.code === 'SHARE_PIN_INVALID' && !view)) {
    return (
      <div className="share-page">
        <form className="share-card" onSubmit={submitPin}>
          <h1>공유 보기</h1>
          <p className="muted">PIN을 입력하세요</p>
          <input
            className="input"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="PIN"
            required
          />
          {error && <p className="form-error">{error.message}</p>}
          <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
            확인
          </button>
        </form>
      </div>
    )
  }

  if (!view) return null

  const balanceText =
    view.balance < 0 ? `초과 상환 ${formatKRW(view.balance)}` : formatKRW(view.balance)

  return (
    <div className="share-page">
      <div className="share-card">
        <p className="share-kicker">payClear 공유 보기</p>
        <div className="debt-card__row">
          <h1 className="page-title" style={{ margin: 0, fontSize: '1.25rem' }}>
            {view.contact.display_name}
          </h1>
          <span className={`badge badge--dir-${view.direction}`}>
            {view.direction === 'lent' ? '빌려줌' : '빌림'}
          </span>
        </div>
        <div className="detail-balance">{balanceText}</div>
        {view.display_label && (
          <span
            className={`badge ${view.display_label === '합의 종료' ? 'badge--agreement' : 'badge--done'}`}
            style={{ marginTop: '0.5rem' }}
          >
            {view.display_label}
          </span>
        )}
        {view.reason && (
          <p className="muted" style={{ marginTop: '0.75rem' }}>
            {view.reason}
          </p>
        )}

        <div className="section-head" style={{ marginTop: '1.5rem' }}>
          <h2>타임라인</h2>
        </div>
        <ul className="timeline">
          <li>
            <div className="timeline__dot timeline__dot--opening" />
            <div>
              <strong>개설</strong>
              <div className="muted">{view.opening.occurred_on}</div>
              <div>{formatKRW(view.opening.principal)}</div>
            </div>
          </li>
          {view.ledger_entries.map((e) => (
            <li key={e.id}>
              <div className={`timeline__dot timeline__dot--${e.type}`} />
              <div>
                <strong>{e.type === 'payment' ? '상환' : '조정'}</strong>
                <div className="muted">{e.occurred_on}</div>
                <div>
                  {e.type === 'payment' ? '-' : e.amount > 0 ? '+' : ''}
                  {formatKRW(e.amount)}
                </div>
                {e.note && <div className="muted">{e.note}</div>}
              </div>
            </li>
          ))}
        </ul>

        <footer className="share-footer">
          <p>payClear에서 생성된 읽기 전용 보기입니다.</p>
          <p className="muted">법적 효력이 없으며 참고용으로만 사용하세요.</p>
        </footer>
      </div>
    </div>
  )
}
