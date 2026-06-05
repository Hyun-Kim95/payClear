import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function SettingsPage() {
  const { logout } = useAuth()

  return (
    <div className="page">
      <h1 className="page-title">설정</h1>
      <ul className="settings-list">
        <li>
          <Link to="/settings/security">잠금·PIN</Link>
        </li>
        <li>
          <Link to="/settings/notifications">알림</Link>
        </li>
        <li>
          <button type="button" className="linkish" onClick={logout}>
            로그아웃
          </button>
        </li>
      </ul>
      <p className="muted settings-note">PWA: 홈 화면에 추가 안내 (목업)</p>
    </div>
  )
}

export function ContactsPage() {
  return (
    <div className="page">
      <h1 className="page-title">상대</h1>
      <ul className="simple-list">
        <li>
          <span>김민수</span>
          <span className="muted">채무 1건</span>
        </li>
        <li>
          <span>박지영</span>
          <span className="muted">채무 1건</span>
        </li>
        <li>
          <span>이준호</span>
          <span className="muted">합의 종료</span>
        </li>
      </ul>
    </div>
  )
}
