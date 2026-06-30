import { useLocation } from 'react-router-dom'
import { startOAuth } from '../api/client'

export function LoginPage() {
  const location = useLocation()
  // 앱 딥링크 로그인 실패 시 App에서 navigate('/login', { state: { error } })로 전달한다.
  const oauthError = (location.state as { error?: string } | null)?.error ?? null

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>payClear</h1>
        <p className="muted">개인 채무를 투명하게 관리하세요</p>

        {oauthError && (
          <p className="form-error" role="alert" style={{ marginTop: '1rem' }}>
            소셜 로그인에 실패했습니다. ({oauthError})
          </p>
        )}

        <button
          type="button"
          className="btn btn--primary btn--block"
          style={{ marginTop: '1.5rem' }}
          onClick={() => {
            void startOAuth('google')
          }}
        >
          Google로 시작
        </button>
        <button
          type="button"
          className="btn btn--secondary btn--block"
          style={{ marginTop: '0.75rem' }}
          onClick={() => {
            void startOAuth('kakao')
          }}
        >
          Kakao로 시작
        </button>
      </div>
    </div>
  )
}
