import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { setToken } from '../api/client'

export function AuthCallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = params.get('token')
    const err = params.get('error')
    if (token) {
      setToken(token)
      navigate('/', { replace: true })
      return
    }
    if (err) {
      setError(err)
      return
    }
    setError('unknown')
  }, [params, navigate])

  if (error) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <h1>로그인 실패</h1>
          <p className="muted">소셜 로그인에 실패했습니다. ({error})</p>
          <Link to="/login" className="btn btn--primary btn--block" style={{ marginTop: '1rem' }}>
            로그인으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <p className="muted">로그인 처리 중…</p>
      </div>
    </div>
  )
}
