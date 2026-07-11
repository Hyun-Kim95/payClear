import { Link, useNavigate } from 'react-router-dom'
import { getToken } from '../api/client'
import { LEGAL_META } from '../legal/config'

export function LegalLayout({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  const navigate = useNavigate()
  const loggedIn = Boolean(getToken())

  function goBack() {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate(loggedIn ? '/settings' : '/login', { replace: true })
  }

  return (
    <div className="legal-wrap">
      <article className="legal-card">
        <button type="button" className="back" onClick={goBack}>
          ← 뒤로
        </button>
        <header className="legal-header">
          <p className="legal-brand">{LEGAL_META.serviceName}</p>
          <h1>{title}</h1>
          <p className="muted">시행일: {LEGAL_META.effectiveDate}</p>
        </header>
        <div className="legal-prose">{children}</div>
        <footer className="legal-footer">
          <Link to="/terms">이용약관</Link>
          <span aria-hidden="true">·</span>
          <Link to="/privacy">개인정보 처리방침</Link>
          <span aria-hidden="true">·</span>
          <Link to="/delete-account">계정 삭제</Link>
          <span aria-hidden="true">·</span>
          {loggedIn ? <Link to="/settings">설정</Link> : <Link to="/login">로그인</Link>}
        </footer>
      </article>
    </div>
  )
}
