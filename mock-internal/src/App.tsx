import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { AppLayout } from './components/Layout'
import { LoginPage } from './pages/Login'
import { PinOnboardingPage } from './pages/PinOnboarding'
import { HomePage } from './pages/Home'
import { DebtsPage } from './pages/Debts'
import { DebtDetailPage } from './pages/DebtDetail'
import { DebtNewPage } from './pages/DebtNew'
import { ShareViewPage } from './pages/ShareView'
import { ContactsPage, SettingsPage } from './pages/Settings'
import { PlaceholderPage } from './pages/Placeholder'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, pinSet } = useAuth()
  const location = useLocation()
  if (!isLoggedIn) return <Navigate to="/login" replace />
  if (!pinSet && location.pathname !== '/onboarding/pin') {
    return <Navigate to="/onboarding/pin" replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/onboarding/pin" element={<PinOnboardingPage />} />
      <Route path="/s/:token" element={<ShareViewPage />} />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<HomePage />} />
        <Route path="/debts" element={<DebtsPage />} />
        <Route path="/debts/new" element={<DebtNewPage />} />
        <Route path="/debts/:id" element={<DebtDetailPage />} />
        <Route path="/debts/:id/edit" element={<PlaceholderPage title="채무 수정" />} />
        <Route path="/debts/:id/payment" element={<PlaceholderPage title="상환 입력" />} />
        <Route path="/debts/:id/adjustment" element={<PlaceholderPage title="조정 입력" />} />
        <Route path="/debts/:id/share" element={<PlaceholderPage title="공유 링크" />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/security" element={<PlaceholderPage title="잠금·PIN" />} />
        <Route path="/settings/notifications" element={<PlaceholderPage title="알림 설정" />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
