import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleLogin = () => {
    login()
    navigate('/onboarding/pin')
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>payClear</h1>
        <p className="muted">개인 채무를 투명하게 관리하세요</p>
        <button type="button" className="btn btn--primary btn--block" onClick={handleLogin}>
          이메일로 계속하기 (목업)
        </button>
        <button type="button" className="btn btn--ghost btn--block">
          Google로 계속하기
        </button>
        <p className="auth-note">목업: 실제 인증 없이 다음 단계로 이동합니다.</p>
      </div>
    </div>
  )
}
