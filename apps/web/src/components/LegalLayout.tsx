import { Link } from 'react-router-dom'
import { LEGAL_META } from '../legal/config'

export function LegalLayout({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="legal-wrap">
      <article className="legal-card">
        <header className="legal-header">
          <p className="legal-brand">{LEGAL_META.serviceName}</p>
          <h1>{title}</h1>
          <p className="muted">시행일: {LEGAL_META.effectiveDate} · 초안(법무 검토 전)</p>
        </header>
        <div className="legal-prose">{children}</div>
        <footer className="legal-footer">
          <Link to="/terms">이용약관</Link>
          <span aria-hidden="true">·</span>
          <Link to="/privacy">개인정보 처리방침</Link>
          <span aria-hidden="true">·</span>
          <Link to="/login">로그인</Link>
        </footer>
      </article>
    </div>
  )
}
