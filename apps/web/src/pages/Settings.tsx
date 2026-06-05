import { Link, useNavigate } from 'react-router-dom'
import { clearToken } from '../api/client'
import { InstallPrompt } from '../components/InstallPrompt'

export function SettingsPage() {
  const navigate = useNavigate()

  return (
    <div>
      <h1 className="page-title">설정</h1>
      <InstallPrompt />
      <Link to="/settings/security" className="list-row">
        <span>잠금·PIN</span>
      </Link>
      <Link to="/settings/notifications" className="list-row">
        <span>알림</span>
      </Link>
      <button
        type="button"
        className="btn btn--ghost btn--block"
        style={{ marginTop: '1.5rem' }}
        onClick={() => {
          clearToken()
          navigate('/login')
        }}
      >
        로그아웃
      </button>
    </div>
  )
}
