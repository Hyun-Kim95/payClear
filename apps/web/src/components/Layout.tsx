import { useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api/client'

const NAV = [
  { to: '/', label: '홈' },
  { to: '/debts', label: '채무' },
  { to: '/contacts', label: '상대' },
  { to: '/settings', label: '설정' },
]

export function Layout({ onToggleTheme, theme }: { onToggleTheme: () => void; theme: string }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (pathname === '/register-email') return
    api.me().then((m) => {
      if (m.providers.length > 0 && !m.email) {
        navigate('/register-email', { replace: true })
      }
    }).catch(() => {})
  }, [pathname, navigate])

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">
          payClear
        </Link>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button type="button" className="btn btn--ghost theme-toggle" onClick={onToggleTheme}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <nav className="bottom-nav" aria-label="주요 메뉴">
        {NAV.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className={
              pathname === n.to || (n.to !== '/' && pathname.startsWith(n.to)) ? 'active' : ''
            }
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
