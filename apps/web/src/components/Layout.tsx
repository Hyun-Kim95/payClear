import { useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api/client'

const NAV = [
  { to: '/', label: '홈', icon: 'home' },
  { to: '/debts', label: '채무', icon: 'debts' },
  { to: '/contacts', label: '상대', icon: 'contacts' },
  { to: '/settings', label: '설정', icon: 'settings' },
] as const

type NavIconName = (typeof NAV)[number]['icon']

function NavIcon({ name }: { name: NavIconName }) {
  const common = {
    className: 'bottom-nav__icon',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  switch (name) {
    case 'home':
      return (
        <svg {...common}>
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9.5Z" />
          <path d="M9 21V12h6v9" />
        </svg>
      )
    case 'debts':
      return (
        <svg {...common}>
          <path d="M8 6h13" />
          <path d="M8 12h13" />
          <path d="M8 18h13" />
          <path d="M3 6h.01" />
          <path d="M3 12h.01" />
          <path d="M3 18h.01" />
        </svg>
      )
    case 'contacts':
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    case 'settings':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      )
  }
}

function ThemeIcon({ dark }: { dark: boolean }) {
  const common = {
    className: 'theme-toggle__icon',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  if (dark) {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <path d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5Z" />
    </svg>
  )
}

export function Layout({ onToggleTheme, theme }: { onToggleTheme: () => void; theme: string }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const isDark = theme === 'dark'

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
          <button
            type="button"
            className="btn btn--ghost theme-toggle"
            onClick={onToggleTheme}
            aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
          >
            <ThemeIcon dark={isDark} />
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
            <NavIcon name={n.icon} />
            <span className="bottom-nav__label">{n.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
