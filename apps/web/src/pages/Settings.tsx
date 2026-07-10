import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  api,
  ApiError,
  clearToken,
  type DeletionState,
  type MeProfile,
  type SecurityState,
} from '../api/client'
import { InstallPrompt } from '../components/InstallPrompt'

type ModalStep = 'confirm' | 'pin' | null

export function SettingsPage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<MeProfile | null>(null)
  const [security, setSecurity] = useState<SecurityState | null>(null)
  const [modalStep, setModalStep] = useState<ModalStep>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const [me, sec] = await Promise.all([api.me(), api.getSecurity()])
    setProfile(me)
    setSecurity(sec)
  }

  useEffect(() => {
    void load().catch((err) => {
      setError(err instanceof ApiError ? err.message : '설정을 불러올 수 없습니다.')
    })
  }, [])

  const closeModal = () => {
    setModalStep(null)
    setPin('')
    setError(null)
  }

  const handleCancelDeletion = async () => {
    setBusy(true)
    setError(null)
    try {
      await api.cancelAccountDeletion()
      setMessage('탈퇴 예정이 취소되었습니다.')
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '취소 실패')
    } finally {
      setBusy(false)
    }
  }

  const submitDeletion = async () => {
    setBusy(true)
    setError(null)
    try {
      if (security?.pin_set) {
        await api.verifyPin(pin)
      }
      await api.requestAccountDeletion()
      clearToken()
      navigate('/login', {
        replace: true,
        state: { accountDeletionScheduled: true },
      })
    } catch (err) {
      if (err instanceof ApiError && err.code === 'APP_PIN_REQUIRED') {
        setError('앱 잠금을 먼저 해제해 주세요.')
      } else {
        setError(err instanceof ApiError ? err.message : '탈퇴 요청 실패')
      }
      setBusy(false)
    }
  }

  const startDeletion = () => {
    setError(null)
    setMessage(null)
    if (security?.pin_set) {
      setModalStep('pin')
    } else {
      setModalStep('confirm')
    }
  }

  const deletion: DeletionState | null = profile?.deletion ?? null

  return (
    <div>
      <h1 className="page-title">설정</h1>
      <InstallPrompt />

      {message && (
        <p className="state-box" style={{ marginBottom: '1rem' }} role="status">
          {message}
        </p>
      )}

      {deletion && (
        <div
          className="state-box"
          style={{ marginBottom: '1rem', borderColor: 'var(--pc-danger)' }}
          role="status"
        >
          <p style={{ margin: 0 }}>
            <strong>{deletion.days_remaining}일 후</strong> 계정이 삭제됩니다.
          </p>
          <p className="muted" style={{ margin: '0.5rem 0 0', fontSize: '0.875rem' }}>
            30일 이내 다시 로그인하면 탈퇴가 취소됩니다.
          </p>
          <button
            type="button"
            className="btn btn--secondary"
            style={{ marginTop: '0.75rem' }}
            disabled={busy}
            onClick={() => void handleCancelDeletion()}
          >
            탈퇴 취소
          </button>
        </div>
      )}

      <Link to="/settings/security" className="list-row">
        <span>잠금·PIN</span>
      </Link>
      <Link to="/settings/notifications" className="list-row">
        <span>알림</span>
      </Link>
      <Link to="/terms" className="list-row">
        <span>이용약관</span>
      </Link>
      <Link to="/privacy" className="list-row">
        <span>개인정보 처리방침</span>
      </Link>
      <button
        type="button"
        className="btn btn--ghost btn--block"
        style={{ marginTop: '1.5rem' }}
        onClick={() => {
          clearToken()
          navigate('/login')
        }}
      >
        로그아웃
      </button>

      {!deletion && (
        <button
          type="button"
          className="btn btn--ghost btn--block"
          style={{ marginTop: '0.75rem', color: 'var(--pc-danger)', borderColor: 'var(--pc-danger)' }}
          onClick={startDeletion}
        >
          회원 탈퇴
        </button>
      )}

      {error && !modalStep && (
        <p className="form-error" role="alert" style={{ marginTop: '1rem' }}>
          {error}
        </p>
      )}

      {modalStep && (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <div className="modal" role="dialog" onClick={(e) => e.stopPropagation()}>
            <h2>회원 탈퇴</h2>
            <p>
              탈퇴 요청 후 <strong>30일 유예 기간</strong>이 지나면 채무·상대·상환 기록·공유 링크 등
              모든 데이터가 영구 삭제됩니다.
            </p>
            <p>
              <strong>30일 이내 다시 로그인하면 탈퇴가 취소됩니다.</strong>
            </p>
            {modalStep === 'pin' && (
              <label className="field" style={{ marginTop: '1rem', marginBottom: 0 }}>
                <span>PIN 확인</span>
                <input
                  className="input"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  maxLength={6}
                />
              </label>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
              <button type="button" className="btn btn--ghost" style={{ flex: 1 }} onClick={closeModal}>
                취소
              </button>
              <button
                type="button"
                className="btn btn--primary"
                style={{ flex: 1, background: 'var(--pc-danger)' }}
                disabled={busy || (modalStep === 'pin' && pin.length < 4)}
                onClick={() => void submitDeletion()}
              >
                탈퇴 요청
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
