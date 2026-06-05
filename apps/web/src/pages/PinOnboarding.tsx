import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import { useLock } from '../lock/LockProvider'

export function PinOnboardingPage() {
  const navigate = useNavigate()
  const { refreshSecurity } = useLock()
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pin !== confirm) {
      setError('PIN 확인이 일치하지 않습니다.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await api.setPin(pin)
      await refreshSecurity()
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '설정에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>앱 PIN 설정</h1>
        <p className="muted">앱을 열 때 사용할 PIN을 설정해 주세요. (건너뛸 수 없습니다)</p>
        <form className="form-stack" onSubmit={submit}>
          <label className="field">
            <span>PIN (4~6자리)</span>
            <input
              className="input"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              required
            />
          </label>
          <label className="field">
            <span>PIN 확인</span>
            <input
              className="input"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ''))}
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
            저장
          </button>
        </form>
      </div>
    </div>
  )
}
