import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError, isNativePlatform, type NotificationSettings } from '../api/client'
import {
  getNativePushState,
  registerNativePush,
  unregisterNativePush,
  type NativePushState,
} from '../native/push'
import {
  disableWebPush,
  enableWebPush,
  getWebPushState,
  isWebPushSupported,
  type WebPushState,
} from '../native/web-push'

function channelStatusHint(
  native: boolean,
  pushEnabled: boolean,
  nativeState: NativePushState | null,
  webState: WebPushState | null,
): string | null {
  if (native) {
    if (!nativeState?.fcmBuildEnabled) {
      return '앱 알림은 준비 중입니다.'
    }
    if (nativeState.permission === 'denied') {
      return '기기 설정에서 알림을 허용해 주세요.'
    }
    if (pushEnabled && nativeState.hasStoredToken && nativeState.permission === 'granted') {
      return '이 기기에서 알림을 받습니다.'
    }
    if (pushEnabled && !nativeState.hasStoredToken) {
      return '알림을 켜려면 토글을 다시 켜 주세요.'
    }
    return null
  }

  if (!webState?.supported) {
    return '이 브라우저는 알림을 지원하지 않습니다.'
  }
  if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
    return '브라우저 설정에서 알림을 허용해 주세요.'
  }
  if (pushEnabled && webState.subscribed) {
    return '이 브라우저에서 알림을 받습니다.'
  }
  if (pushEnabled && !webState.subscribed) {
    return '알림을 켜려면 토글을 다시 켜 주세요.'
  }
  return null
}

export function SettingsNotificationsPage() {
  const native = isNativePlatform()
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [nativeState, setNativeState] = useState<NativePushState | null>(null)
  const [webState, setWebState] = useState<WebPushState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [channelBusy, setChannelBusy] = useState(false)

  const refreshPushState = useCallback(async () => {
    if (native) {
      setNativeState(await getNativePushState())
    } else {
      setWebState(await getWebPushState())
    }
  }, [native])

  useEffect(() => {
    void (async () => {
      try {
        const s = await api.getNotificationSettings()
        setSettings(s)
      } catch (e) {
        setError(e instanceof ApiError ? e.message : '불러오기 실패')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    if (!settings) return
    void refreshPushState().catch(() => {
      /* 푸시 상태는 부가 정보 — 실패해도 설정 화면은 표시 */
    })
  }, [settings, refreshPushState])

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

  const channelRegistered = native
    ? !!(nativeState?.fcmBuildEnabled && nativeState.hasStoredToken && nativeState.permission === 'granted')
    : !!(webState?.supported && webState.subscribed)

  const channelToggleChecked = !!(settings?.push_enabled && channelRegistered)

  const channelToggleDisabled =
    channelBusy ||
    (native && nativeState !== null && !nativeState.fcmBuildEnabled) ||
    (!native && !isWebPushSupported())

  const statusHint =
    settings &&
    channelStatusHint(native, settings.push_enabled, nativeState, webState)

  const togglePushChannel = async (on: boolean) => {
    setMessage(null)
    setError(null)
    setChannelBusy(true)

    try {
      if (on) {
        const result = native ? await registerNativePush() : await enableWebPush()
        if (!result.ok) {
          setMessage(result.message)
          return
        }
        const saved = await patch({ push_enabled: true })
        await refreshPushState()
        setMessage(saved ? result.message : `${result.message} (설정 저장은 나중에 다시 시도해 주세요.)`)
      } else {
        const result = native ? await unregisterNativePush() : await disableWebPush()
        await patch({ push_enabled: false })
        await refreshPushState()
        setMessage(result.message)
      }
    } finally {
      setChannelBusy(false)
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
        예정일 <strong>하루 전·당일</strong> 오전 9시(KST)에 알려 드립니다.
      </p>

      <div className="form-stack">
        <h2 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>알림 받기</h2>
        <label className="radio-row">
          <input
            type="checkbox"
            checked={channelToggleChecked}
            disabled={channelToggleDisabled}
            onChange={(e) => void togglePushChannel(e.target.checked)}
          />
          {native ? '앱 알림' : '브라우저 알림'}
        </label>
        {statusHint && (
          <p className="muted" style={{ margin: 0, fontSize: '0.8125rem' }}>
            {statusHint}
          </p>
        )}
      </div>

      <div className="form-stack" style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>알림 시점</h2>
        <label className="radio-row">
          <input
            type="checkbox"
            checked={settings.remind_d1}
            onChange={(e) => void patch({ remind_d1: e.target.checked })}
          />
          하루 전 알림
        </label>
        <label className="radio-row">
          <input
            type="checkbox"
            checked={settings.remind_d0}
            onChange={(e) => void patch({ remind_d0: e.target.checked })}
          />
          당일 알림
        </label>
      </div>

      {error && <p className="form-error">{error}</p>}
      {message && <p className="muted">{message}</p>}
    </div>
  )
}
