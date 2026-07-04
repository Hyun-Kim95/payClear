import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError, isNativePlatform, type SecurityState } from '../api/client'
import { useLock } from '../lock/LockProvider'
import { getBiometricEnabled, setBiometricEnabled, verifyBiometricUnlock } from '../native/biometric'

export function SettingsSecurityPage() {
  const { refreshSecurity } = useLock()
  const [security, setSecurity] = useState<SecurityState | null>(null)
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [timeout, setTimeout] = useState(5)
  const [biometricEnabled, setBiometricEnabledState] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    api.getSecurity().then((s) => {
      setSecurity(s)
      setTimeout(s.lock_timeout_minutes)
    })
    if (isNativePlatform()) {
      void getBiometricEnabled().then(setBiometricEnabledState)
    }
  }, [])

  const changePin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPin !== confirm) {
      setError('PIN 확인이 일치하지 않습니다.')
      return
    }
    setError(null)
    try {
      await api.setPin(newPin, security?.pin_set ? currentPin : undefined)
      setMessage('PIN이 변경되었습니다.')
      setCurrentPin('')
      setNewPin('')
      setConfirm('')
      await refreshSecurity()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '변경 실패')
    }
  }

  const saveTimeout = async () => {
    try {
      const s = await api.patchSecurity(timeout)
      setSecurity(s)
      await refreshSecurity()
      setMessage('잠금 시간이 저장되었습니다.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '저장 실패')
    }
  }

  const toggleBiometric = async () => {
    setError(null)
    setMessage(null)
    if (!biometricEnabled) {
      const ok = await verifyBiometricUnlock()
      if (!ok) {
        setError('생체 인증을 사용할 수 없습니다. 기기 설정을 확인해 주세요.')
        return
      }
      await setBiometricEnabled(true)
      setBiometricEnabledState(true)
      setMessage('생체 잠금이 켜졌습니다.')
      return
    }
    await setBiometricEnabled(false)
    setBiometricEnabledState(false)
    setMessage('생체 잠금이 꺼졌습니다.')
  }

  return (
    <div>
      <Link to="/settings" className="back">
        ← 설정
      </Link>
      <h1 className="page-title">잠금·PIN</h1>

      <form className="form-stack" onSubmit={changePin}>
        <h2 style={{ fontSize: '1rem' }}>PIN 변경</h2>
        {security?.pin_set && (
          <label className="field">
            <span>현재 PIN</span>
            <input
              className="input"
              type="password"
              inputMode="numeric"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
            />
          </label>
        )}
        <label className="field">
          <span>새 PIN</span>
          <input
            className="input"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
          />
        </label>
        <label className="field">
          <span>새 PIN 확인</span>
          <input
            className="input"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ''))}
          />
        </label>
        <button type="submit" className="btn btn--primary">
          PIN 저장
        </button>
      </form>

      <div className="form-stack" style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1rem' }}>백그라운드 잠금</h2>
        <label className="field">
          <span>잠금 시간</span>
          <select className="input" value={timeout} onChange={(e) => setTimeout(Number(e.target.value))}>
            <option value={1}>1분</option>
            <option value={5}>5분</option>
            <option value={15}>15분</option>
          </select>
        </label>
        <button type="button" className="btn btn--secondary" onClick={() => void saveTimeout()}>
          시간 저장
        </button>
      </div>

      {isNativePlatform() && security?.pin_set && (
        <div className="form-stack" style={{ marginTop: '2rem' }}>
          <h2 style={{ fontSize: '1rem' }}>생체 잠금 (Android)</h2>
          <label className="radio-row">
            <input
              type="checkbox"
              checked={biometricEnabled}
              onChange={() => void toggleBiometric()}
            />
            잠금 해제 시 생체 인증 사용
          </label>
          <p className="muted" style={{ margin: 0, fontSize: '0.8125rem' }}>
            실패 시 PIN 입력으로 전환됩니다.
          </p>
        </div>
      )}

      {error && <p className="form-error">{error}</p>}
      {message && <p className="muted">{message}</p>}
    </div>
  )
}
