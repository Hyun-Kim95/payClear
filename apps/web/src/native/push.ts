import { Preferences } from '@capacitor/preferences'
import { api, isNativePlatform } from '../api/client'

export type PushResult = { ok: boolean; message: string }

const FCM_TOKEN_KEY = 'payclear_fcm_token'

export type NativePushState = {
  fcmBuildEnabled: boolean
  permission: 'granted' | 'denied' | 'prompt' | 'unknown'
  hasStoredToken: boolean
}

async function getStoredFcmToken(): Promise<string | null> {
  const { value } = await Preferences.get({ key: FCM_TOKEN_KEY })
  return value || null
}

async function setStoredFcmToken(token: string): Promise<void> {
  await Preferences.set({ key: FCM_TOKEN_KEY, value: token })
}

async function clearStoredFcmToken(): Promise<void> {
  await Preferences.remove({ key: FCM_TOKEN_KEY })
}

/** 네이티브 앱 푸시 등록·권한·로컬 토큰 상태 */
export async function getNativePushState(): Promise<NativePushState> {
  const fcmBuildEnabled = import.meta.env.VITE_FCM_ENABLED === 'true'
  if (!isNativePlatform()) {
    return { fcmBuildEnabled: false, permission: 'unknown', hasStoredToken: false }
  }
  if (!fcmBuildEnabled) {
    return { fcmBuildEnabled: false, permission: 'unknown', hasStoredToken: false }
  }

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    const perm = await PushNotifications.checkPermissions()
    const permission =
      perm.receive === 'granted'
        ? 'granted'
        : perm.receive === 'denied'
          ? 'denied'
          : perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale'
            ? 'prompt'
            : 'unknown'
    const hasStoredToken = !!(await getStoredFcmToken())
    return { fcmBuildEnabled: true, permission, hasStoredToken }
  } catch {
    return { fcmBuildEnabled: true, permission: 'unknown', hasStoredToken: false }
  }
}

/**
 * 네이티브(안드로이드) 앱 알림 등록.
 * 권한 요청 → register → 토큰을 서버·Preferences에 저장한다.
 */
export async function registerNativePush(): Promise<PushResult> {
  if (!isNativePlatform()) {
    return { ok: false, message: '네이티브 앱에서만 사용할 수 있습니다.' }
  }

  if (import.meta.env.VITE_FCM_ENABLED !== 'true') {
    return { ok: false, message: '앱 알림은 준비 중입니다.' }
  }

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    let perm = await PushNotifications.checkPermissions()
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
      perm = await PushNotifications.requestPermissions()
    }
    if (perm.receive !== 'granted') {
      return { ok: false, message: '알림 권한이 거부되었습니다. 기기 설정에서 알림을 허용해 주세요.' }
    }

    return await new Promise<PushResult>((resolve) => {
      let settled = false
      const finish = (result: PushResult) => {
        if (settled) return
        settled = true
        resolve(result)
      }

      void PushNotifications.addListener('registration', (token) => {
        void setStoredFcmToken(token.value)
          .then(() => api.registerFcmToken(token.value))
          .then(() => finish({ ok: true, message: '앱 알림이 등록되었습니다.' }))
          .catch(() =>
            finish({ ok: false, message: '앱 알림 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.' }),
          )
      })

      void PushNotifications.addListener('registrationError', () => {
        finish({
          ok: false,
          message: '앱 알림 등록 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        })
      })

      PushNotifications.register().catch(() => {
        finish({ ok: false, message: '앱 알림 등록을 시작할 수 없습니다.' })
      })

      setTimeout(() => {
        finish({ ok: false, message: '앱 알림 등록 응답이 없습니다. 네트워크·설정을 확인해 주세요.' })
      }, 15_000)
    })
  } catch {
    return { ok: false, message: '이 기기에서 앱 알림을 사용할 수 없습니다.' }
  }
}

/** 저장된 FCM 토큰을 서버·로컬에서 제거한다. */
export async function unregisterNativePush(): Promise<PushResult> {
  if (!isNativePlatform()) {
    return { ok: false, message: '네이티브 앱에서만 사용할 수 있습니다.' }
  }

  const token = await getStoredFcmToken()
  try {
    if (token) {
      await api.deleteFcmToken(token)
    }
    await clearStoredFcmToken()
    return { ok: true, message: '앱 알림이 꺼졌습니다.' }
  } catch {
    await clearStoredFcmToken()
    return { ok: true, message: '앱 알림이 꺼졌습니다.' }
  }
}
