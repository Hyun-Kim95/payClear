import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api/client'

export function RegisterEmailPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [verifyToken, setVerifyToken] = useState('')
  const [devToken, setDevToken] = useState<string | null>(null)
  const [step, setStep] = useState<'register' | 'verify'>('register')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const register = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await api.registerEmail(email.trim())
      if (res.dev_verify_token) {
        setDevToken(res.dev_verify_token)
        setVerifyToken(res.dev_verify_token)
      }
      setStep('verify')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '등록에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await api.verifyEmail(verifyToken.trim())
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '인증에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>이메일 등록</h1>
        <p className="muted">알림·계정 복구를 위해 이메일을 등록해 주세요.</p>

        {step === 'register' ? (
          <form className="form-stack" onSubmit={register}>
            <label className="field">
              <span>이메일</span>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
              등록
            </button>
          </form>
        ) : (
          <form className="form-stack" onSubmit={verify}>
            <p className="muted" style={{ fontSize: '0.875rem' }}>
              인증 토큰을 입력하세요.
              {devToken && ' (개발 모드: 아래 토큰이 자동 입력되었습니다)'}
            </p>
            <label className="field">
              <span>인증 토큰</span>
              <input
                className="input"
                value={verifyToken}
                onChange={(e) => setVerifyToken(e.target.value)}
                required
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
              인증 완료
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
