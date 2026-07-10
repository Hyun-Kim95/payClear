import { useEffect, useLayoutEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { getToken, isNativePlatform, setPinRequiredHandler, setUnauthorizedHandler } from './api/client'
import { Layout } from './components/Layout'
import { LockProvider } from './lock/LockProvider'
import { SESSION_LOCK_KEY } from './lock/session-keys'
import { LoginPage } from './pages/Login'
import { HomePage } from './pages/Home'
import { DebtsPage } from './pages/Debts'
import { DebtDetailPage } from './pages/DebtDetail'
import { ContactsPage } from './pages/Contacts'
import { SettingsPage } from './pages/Settings'
import { SettingsSecurityPage } from './pages/SettingsSecurity'
import { SettingsNotificationsPage } from './pages/SettingsNotifications'
import { DebtNewPage } from './pages/DebtNew'
import { DebtPaymentPage } from './pages/DebtPayment'
import { DebtAdjustmentPage } from './pages/DebtAdjustment'
import { DebtEditPage } from './pages/DebtEdit'
import { DebtSharePage } from './pages/DebtShare'
import { ContactPaymentPage } from './pages/ContactPayment'
import { ContactDetailPage } from './pages/ContactDetail'
import { ShareViewPage } from './pages/ShareView'
import { AuthCallbackPage } from './pages/AuthCallback'
import { RegisterEmailPage } from './pages/RegisterEmail'
import { PinOnboardingPage } from './pages/PinOnboarding'
import { LockPage } from './pages/Lock'
import { LegalPrivacyPage } from './pages/LegalPrivacy'
import { LegalTermsPage } from './pages/LegalTerms'

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!getToken()) return <Navigate to="/login" replace />
  return <>{children}</>
}

/**
 * 네이티브 앱 전용 OAuth 딥링크 처리.
 * payclear://auth/callback?code=...|error=... 를 가로채 code 교환 후 토큰을 저장한다.
 * 웹에서는 아무 동작도 하지 않는다(기존 /auth/callback 쿼리 흐름 유지).
 */
function useDeepLinkAuth() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!isNativePlatform()) return

    let removeListener: (() => void) | undefined

    void (async () => {
      const { exchangeAuthCode, routeAfterOAuthLogin } = await import('./api/client')
      const { App: CapApp } = await import('@capacitor/app')
      const handle = await CapApp.addListener('appUrlOpen', ({ url }) => {
        if (!url || !url.startsWith('payclear://')) return
        let code: string | null = null
        let error: string | null = null
        try {
          const parsed = new URL(url)
          code = parsed.searchParams.get('code')
          error = parsed.searchParams.get('error')
        } catch {
          error = 'invalid_callback'
        }

        void import('@capacitor/browser')
          .then(({ Browser }) => Browser.close())
          .catch(() => {})

        if (code) {
          void (async () => {
            try {
              await exchangeAuthCode(code)
              await routeAfterOAuthLogin(navigate)
            } catch {
              navigate('/login', { replace: true, state: { error: 'exchange_failed' } })
            }
          })()
          return
        }
        navigate('/login', { replace: true, state: { error: error ?? 'unknown' } })
      })
      removeListener = () => {
        void handle.remove()
      }
    })()

    return () => {
      removeListener?.()
    }
  }, [navigate])
}

/**
 * API가 401(UNAUTHORIZED)을 반환하면(토큰 만료/무효) 로그인 화면으로 즉시 이동시킨다.
 * 토큰은 client.request에서 이미 비워진 상태로 호출된다.
 */
function useUnauthorizedRedirect() {
  const navigate = useNavigate()
  useLayoutEffect(() => {
    setUnauthorizedHandler(() => {
      navigate('/login', { replace: true })
    })
    return () => setUnauthorizedHandler(null)
  }, [navigate])
}

function usePinRequiredRedirect() {
  const navigate = useNavigate()
  useLayoutEffect(() => {
    setPinRequiredHandler(() => {
      sessionStorage.setItem(SESSION_LOCK_KEY, '1')
      navigate('/lock', { replace: true })
    })
    return () => setPinRequiredHandler(null)
  }, [navigate])
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('payclear-theme')
    return saved === 'dark' ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('payclear-theme', theme)
  }, [theme])

  useDeepLinkAuth()
  useUnauthorizedRedirect()
  usePinRequiredRedirect()

  return (
    <LockProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/privacy" element={<LegalPrivacyPage />} />
        <Route path="/terms" element={<LegalTermsPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/s/:token" element={<ShareViewPage />} />
        <Route
          path="/onboarding/pin"
          element={
            <RequireAuth>
              <PinOnboardingPage />
            </RequireAuth>
          }
        />
        <Route
          path="/lock"
          element={
            <RequireAuth>
              <LockPage />
            </RequireAuth>
          }
        />
        <Route
          element={
            <RequireAuth>
              <Layout theme={theme} onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))} />
            </RequireAuth>
          }
        >
          <Route path="/" element={<HomePage />} />
          <Route path="/debts" element={<DebtsPage />} />
          <Route path="/debts/:id" element={<DebtDetailPage />} />
          <Route path="/debts/new" element={<DebtNewPage />} />
          <Route path="/debts/:id/payment" element={<DebtPaymentPage />} />
          <Route path="/debts/:id/adjustment" element={<DebtAdjustmentPage />} />
          <Route path="/debts/:id/edit" element={<DebtEditPage />} />
          <Route path="/debts/:id/share" element={<DebtSharePage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/contacts/new" element={<Navigate to="/debts/new" replace />} />
          <Route path="/contacts/:id/payment" element={<ContactPaymentPage />} />
          <Route path="/contacts/:id" element={<ContactDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/security" element={<SettingsSecurityPage />} />
          <Route path="/settings/notifications" element={<SettingsNotificationsPage />} />
        </Route>
        <Route
          path="/register-email"
          element={
            <RequireAuth>
              <RegisterEmailPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </LockProvider>
  )
}
