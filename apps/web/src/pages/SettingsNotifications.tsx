import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError, isNativePlatform, type NotificationSettings } from '../api/client'
import { registerNativePush } from '../native/push'

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const buf = new ArrayBuffer(raw.length)
  const out = new Uint8Array(buf)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return buf
}

export function SettingsNotificationsPage() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pushStatus, setPushStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .getNotificationSettings()
      .then(setSettings)
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const patch = async (patchData: Partial<NotificationSettings>) => {
    setError(null)
    try {
      const s = await api.patchNotificationSettings(patchData)
      setSettings(s)
      return true
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '저장 실패')
      return false
    }
  }

  const enablePush = async () => {
    setPushStatus(null)
    setError(null)

    // 네이티브 앱: FCM 경로로 분기(웹은 아래 web-push 흐름 유지).
    if (isNativePlatform()) {
      const result = await registerNativePush()
      if (result.ok) {
        const saved = await patch({ push_enabled: true })
        setPushStatus(
          saved ? result.message : `${result.message} (설정 저장은 나중에 다시 시도해 주세요.)`,
        )
        if (!saved) setError(null)
      } else {
        setPushStatus(result.message)
      }
      return
    }

    try {
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        setPushStatus('이 브라우저는 Push를 지원하지 않습니다. 이메일 알림을 사용하세요.')
        return
      }
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        setPushStatus('알림 권한이 거부되었습니다.')
        return
      }
      const { public_key } = await api.getPushVapidKey()
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(public_key),
      })
      await api.savePushSubscription(sub.toJSON())
      await patch({ push_enabled: true })
      setPushStatus('Push 구독이 등록되었습니다.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Push 등록 실패')
    }
  }

  if (loading) return <div className="skeleton" />
  if (!settings) return <div className="state-box state-box--error">{error}</div>

  return (
    <div>
      <Link to="/settings" className="back">
        ← 설정
      </Link>
      <h1 className="page-title">알림</h1>
      <p className="muted" style={{ marginBottom: '1rem' }}>
        예정일 1일 전·당일 09:00(KST)에 알림을 보냅니다. Android 앱은 FCM 푸시, 그 외 환경은 이메일 알림을 이용해 주세요.
      </p>

      <div className="form-stack">
        <button type="button" className="btn btn--secondary" onClick={() => void enablePush()}>
          Push 알림 등록
        </button>
        {pushStatus && <p className="muted">{pushStatus}</p>}

        <label className="radio-row">
          <input
            type="checkbox"
            checked={settings.push_enabled}
            onChange={(e) => void patch({ push_enabled: e.target.checked })}
          />
          Push 알림 사용
        </label>
        <label className="radio-row">
          <input
            type="checkbox"
            checked={settings.email_enabled}
            onChange={(e) => void patch({ email_enabled: e.target.checked })}
          />
          이메일 알림 사용
        </label>
        <label className="radio-row">
          <input
            type="checkbox"
            checked={settings.remind_d1}
            onChange={(e) => void patch({ remind_d1: e.target.checked })}
          />
          1일 전 알림 (D-1)
        </label>
        <label className="radio-row">
          <input
            type="checkbox"
            checked={settings.remind_d0}
            onChange={(e) => void patch({ remind_d0: e.target.checked })}
          />
          당일 알림 (D-0)
        </label>
      </div>
      {error && <p className="form-error">{error}</p>}
    </div>
  )
}
