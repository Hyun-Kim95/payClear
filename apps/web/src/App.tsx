import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { getToken } from './api/client'
import { Layout } from './components/Layout'
import { LockProvider } from './lock/LockProvider'
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
import { ContactNewPage } from './pages/ContactNew'
import { ContactDetailPage } from './pages/ContactDetail'
import { ShareViewPage } from './pages/ShareView'
import { AuthCallbackPage } from './pages/AuthCallback'
import { RegisterEmailPage } from './pages/RegisterEmail'
import { PinOnboardingPage } from './pages/PinOnboarding'
import { LockPage } from './pages/Lock'

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!getToken()) return <Navigate to="/login" replace />
  return <>{children}</>
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

  return (
    <LockProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
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
          <Route path="/contacts/new" element={<ContactNewPage />} />
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
