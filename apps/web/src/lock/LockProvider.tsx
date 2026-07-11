import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api, getToken, type SecurityState } from '../api/client'

import { SESSION_LOCK_KEY, SESSION_ACTIVITY_KEY } from './session-keys'

function isExemptPath(path: string): boolean {
  return (
    path === '/login' ||
    path.startsWith('/auth/') ||
    path.startsWith('/s/') ||
    path === '/register-email' ||
    path === '/onboarding/pin' ||
    path === '/lock' ||
    path === '/terms' ||
    path === '/privacy' ||
    path === '/delete-account' ||
    path === '/delete-data'
  )
}

type LockContextValue = {
  security: SecurityState | null
  refreshSecurity: () => Promise<void>
  unlockSession: () => void
  touchActivity: () => void
}

const LockContext = createContext<LockContextValue | null>(null)

export function useLock() {
  const ctx = useContext(LockContext)
  if (!ctx) throw new Error('useLock must be used within LockProvider')
  return ctx
}

export function LockProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [security, setSecurity] = useState<SecurityState | null>(null)

  const refreshSecurity = useCallback(async () => {
    if (!getToken()) return
    const s = await api.getSecurity()
    setSecurity(s)
  }, [])

  const touchActivity = useCallback(() => {
    sessionStorage.setItem(SESSION_ACTIVITY_KEY, String(Date.now()))
  }, [])

  const unlockSession = useCallback(() => {
    sessionStorage.removeItem(SESSION_LOCK_KEY)
    touchActivity()
  }, [touchActivity])

  useEffect(() => {
    if (!getToken()) return
    void refreshSecurity().catch(() => {})
  }, [refreshSecurity])

  useEffect(() => {
    if (!getToken() || !security || security.pin_set) return
    sessionStorage.removeItem(SESSION_LOCK_KEY)
    const pinSetupExempt =
      location.pathname === '/login' ||
      location.pathname.startsWith('/auth/') ||
      location.pathname === '/onboarding/pin' ||
      location.pathname === '/terms' ||
      location.pathname === '/privacy' ||
      location.pathname === '/delete-account' ||
      location.pathname === '/delete-data' ||
      location.pathname.startsWith('/s/')
    if (!pinSetupExempt) {
      navigate('/onboarding/pin', { replace: true })
    }
  }, [security, location.pathname, navigate])

  useEffect(() => {
    if (!getToken() || isExemptPath(location.pathname) || !security?.pin_set) return
    if (sessionStorage.getItem(SESSION_LOCK_KEY) === '1' && location.pathname !== '/lock') {
      navigate('/lock', { replace: true })
    }
  }, [location.pathname, security, navigate])

  useEffect(() => {
    const checkIdle = () => {
      if (!security?.pin_set || isExemptPath(location.pathname)) return
      const last = Number(sessionStorage.getItem(SESSION_ACTIVITY_KEY) || Date.now())
      const timeout = (security.lock_timeout_minutes ?? 5) * 60 * 1000
      if (Date.now() - last >= timeout) {
        sessionStorage.setItem(SESSION_LOCK_KEY, '1')
        if (location.pathname !== '/lock') {
          navigate('/lock', { replace: true })
        }
      }
    }
    const onVis = () => {
      if (document.visibilityState === 'visible') checkIdle()
    }
    touchActivity()
    window.addEventListener('click', touchActivity)
    window.addEventListener('keydown', touchActivity)
    document.addEventListener('visibilitychange', onVis)
    const timer = window.setInterval(checkIdle, 30_000)
    return () => {
      window.removeEventListener('click', touchActivity)
      window.removeEventListener('keydown', touchActivity)
      document.removeEventListener('visibilitychange', onVis)
      window.clearInterval(timer)
    }
  }, [security, location.pathname, navigate, touchActivity])

  return (
    <LockContext.Provider value={{ security, refreshSecurity, unlockSession, touchActivity }}>
      {children}
    </LockContext.Provider>
  )
}
