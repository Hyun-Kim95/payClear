import { Link, Outlet, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

const navItems = [
  { to: '/', label: '홈' },
  { to: '/debts', label: '채무' },
  { to: '/contacts', label: '상대' },
  { to: '/settings', label: '설정' },
]

export function AppLayout() {
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="app-shell">
      <header className="top-bar">
        <Link to="/" className="brand">
          payClear
        </Link>
        <button type="button" className="icon-btn" onClick={toggleTheme} aria-label="테마 전환">
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </header>
      <main className="main-content">
        <Outlet />
      </main>
      <nav className="bottom-nav" aria-label="주요 메뉴">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to)) ? 'active' : ''}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}

export function PublicLayout() {
  return (
    <div className="app-shell app-shell--public">
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
