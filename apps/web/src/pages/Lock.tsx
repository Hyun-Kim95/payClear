import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import { useLock } from '../lock/LockProvider'

export function LockPage() {
  const navigate = useNavigate()
  const { unlockSession, security } = useLock()
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await api.verifyPin(pin)
      unlockSession()
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'PIN이 맞지 않습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const locked =
    security?.locked_until && new Date(security.locked_until) > new Date()

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>잠금 해제</h1>
        {locked ? (
          <p className="muted">5분 후 다시 시도해 주세요.</p>
        ) : (
          <form className="form-stack" onSubmit={submit}>
            <label className="field">
              <span>PIN</span>
              <input
                className="input"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                autoFocus
                required
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
              해제
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
