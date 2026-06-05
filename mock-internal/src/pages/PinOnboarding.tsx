import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function PinOnboardingPage() {
  const [pin, setPin] = useState('')
  const { setPinDone } = useAuth()
  const navigate = useNavigate()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin.length >= 4) {
      setPinDone()
      navigate('/')
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>PIN 설정</h1>
        <p className="muted">앱 잠금을 위해 4~6자리 PIN을 설정하세요. (건너뛰기 없음)</p>
        <label className="field">
          <span>PIN</span>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="••••"
            required
          />
        </label>
        <button type="submit" className="btn btn--primary btn--block" disabled={pin.length < 4}>
          저장하고 시작
        </button>
      </form>
    </div>
  )
}
