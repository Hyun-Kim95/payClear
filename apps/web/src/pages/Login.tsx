import { useNavigate } from 'react-router-dom'
import { DEV_TOKEN, oauthStartUrl, setToken } from '../api/client'

export function LoginPage() {
  const navigate = useNavigate()

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>payClear</h1>
        <p className="muted">개인 채무를 투명하게 관리하세요</p>

        <button
          type="button"
          className="btn btn--primary btn--block"
          style={{ marginTop: '1.5rem' }}
          onClick={() => {
            window.location.href = oauthStartUrl('google')
          }}
        >
          Google로 시작
        </button>
        <button
          type="button"
          className="btn btn--secondary btn--block"
          style={{ marginTop: '0.75rem' }}
          onClick={() => {
            window.location.href = oauthStartUrl('kakao')
          }}
        >
          Kakao로 시작
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--block"
          style={{ marginTop: '0.75rem' }}
          onClick={() => {
            setToken(DEV_TOKEN)
            navigate('/')
          }}
        >
          데모 계정으로 시작
        </button>
        <p className="muted" style={{ marginTop: '1rem', fontSize: '0.8125rem' }}>
          소셜 로그인은 API OAuth 설정이 필요합니다. 개발용 데모 계정을 사용할 수 있습니다.
        </p>
      </div>
    </div>
  )
}
