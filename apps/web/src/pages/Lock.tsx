import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError, isNativePlatform } from '../api/client'
import { useLock } from '../lock/LockProvider'
import { getBiometricEnabled, verifyBiometricUnlock } from '../native/biometric'

export function LockPage() {
  const navigate = useNavigate()
  const { unlockSession, security } = useLock()
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [biometricTried, setBiometricTried] = useState(false)

  useEffect(() => {
    if (!isNativePlatform() || biometricTried) return
    setBiometricTried(true)
    void (async () => {
      const enabled = await getBiometricEnabled()
      if (!enabled) return
      const ok = await verifyBiometricUnlock()
      if (ok) {
        await api.unlockSession()
        unlockSession()
        navigate('/', { replace: true })
      }
    })()
  }, [biometricTried, navigate, unlockSession])

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

  const tryBiometric = async () => {
    setError(null)
    const ok = await verifyBiometricUnlock()
    if (ok) {
      await api.unlockSession()
      unlockSession()
      navigate('/', { replace: true })
      return
    }
    setError('생체 인증에 실패했습니다. PIN을 입력해 주세요.')
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
          <>
            {isNativePlatform() && (
              <button
                type="button"
                className="btn btn--secondary btn--block"
                style={{ marginBottom: '1rem' }}
                onClick={() => void tryBiometric()}
              >
                생체 인증
              </button>
            )}
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
                  autoFocus={!isNativePlatform()}
                  required
                />
              </label>
              {error && <p className="form-error">{error}</p>}
              <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
                해제
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
