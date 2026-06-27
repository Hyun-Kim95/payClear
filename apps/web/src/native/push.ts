import { api, isNativePlatform } from '../api/client'

export type FcmResult = { ok: boolean; message: string }

/**
 * 네이티브(안드로이드) FCM 푸시 등록.
 * 권한 요청 → register → 'registration' 이벤트의 토큰을 백엔드(POST /me/fcm-token)로 전송한다.
 *
 * google-services.json 미배치 등으로 등록이 실패해도 앱이 크래시하지 않도록
 * 모든 경로를 try/catch + 이벤트 기반으로 처리한다.
 */
export async function registerNativePush(): Promise<FcmResult> {
  if (!isNativePlatform()) {
    return { ok: false, message: '네이티브 앱에서만 사용할 수 있습니다.' }
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

    return await new Promise<FcmResult>((resolve) => {
      let settled = false
      const finish = (result: FcmResult) => {
        if (settled) return
        settled = true
        resolve(result)
      }

      void PushNotifications.addListener('registration', (token) => {
        api
          .registerFcmToken(token.value)
          .then(() => finish({ ok: true, message: 'FCM 푸시가 등록되었습니다.' }))
          .catch(() => finish({ ok: false, message: 'FCM 토큰 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.' }))
      })

      void PushNotifications.addListener('registrationError', () => {
        finish({
          ok: false,
          message: 'FCM 등록 중 오류가 발생했습니다. (google-services.json 설정이 필요할 수 있습니다.)',
        })
      })

      // 등록 시도. 콜백(registration/registrationError)에서 결과를 확정한다.
      PushNotifications.register().catch(() => {
        finish({ ok: false, message: 'FCM 등록을 시작할 수 없습니다.' })
      })

      // 안전장치: 일정 시간 내 콜백이 없으면 타임아웃 처리.
      setTimeout(() => {
        finish({ ok: false, message: 'FCM 등록 응답이 없습니다. 네트워크/설정을 확인해 주세요.' })
      }, 15_000)
    })
  } catch {
    return { ok: false, message: '이 기기에서 FCM 푸시를 사용할 수 없습니다.' }
  }
}
