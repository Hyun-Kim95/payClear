import { Link, useLocation } from 'react-router-dom'
import { startOAuth } from '../api/client'

export function LoginPage() {
  const location = useLocation()
  const oauthError = (location.state as { error?: string } | null)?.error ?? null
  const deletionScheduled =
    (location.state as { accountDeletionScheduled?: boolean } | null)?.accountDeletionScheduled ?? false

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>payClear</h1>
        <p className="muted">개인 채무를 투명하게 관리하세요</p>

        {deletionScheduled && (
          <p className="state-box" role="status" style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
            탈퇴가 예약되었습니다. 30일 후 계정이 삭제됩니다.
            <br />
            <strong>30일 이내 다시 로그인하면 탈퇴가 취소됩니다.</strong>
          </p>
        )}

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
        <p className="legal-login-note muted">
          로그인 시{' '}
          <Link to="/terms">이용약관</Link> 및 <Link to="/privacy">개인정보 처리방침</Link>에
          동의합니다.
        </p>
      </div>
    </div>
  )
}
