import { api, ApiError } from '../api/client'

export type WebPushResult = { ok: boolean; message: string }

export type WebPushState = {
  supported: boolean
  subscribed: boolean
}

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const buf = new ArrayBuffer(raw.length)
  const out = new Uint8Array(buf)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return buf
}

export function isWebPushSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
}

/** 브라우저 web-push 구독 여부 */
export async function getWebPushState(): Promise<WebPushState> {
  if (!isWebPushSupported()) {
    return { supported: false, subscribed: false }
  }
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    return { supported: true, subscribed: sub !== null }
  } catch {
    return { supported: true, subscribed: false }
  }
}

export async function enableWebPush(): Promise<WebPushResult> {
  if (!isWebPushSupported()) {
    return { ok: false, message: '이 브라우저는 알림을 지원하지 않습니다. 이메일 알림을 이용해 주세요.' }
  }

  try {
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') {
      return { ok: false, message: '알림 권한이 거부되었습니다. 브라우저 설정에서 알림을 허용해 주세요.' }
    }
    const { public_key } = await api.getPushVapidKey()
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(public_key),
    })
    await api.savePushSubscription(sub.toJSON())
    return { ok: true, message: '브라우저 알림이 등록되었습니다.' }
  } catch (err) {
    const msg = err instanceof ApiError ? err.message : '브라우저 알림 등록에 실패했습니다.'
    return { ok: false, message: msg }
  }
}

export async function disableWebPush(): Promise<WebPushResult> {
  if (!isWebPushSupported()) {
    return { ok: true, message: '브라우저 알림이 꺼졌습니다.' }
  }

  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub?.endpoint) {
      await api.deletePushSubscription(sub.endpoint)
      await sub.unsubscribe()
    }
    return { ok: true, message: '브라우저 알림이 꺼졌습니다.' }
  } catch {
    return { ok: true, message: '브라우저 알림이 꺼졌습니다.' }
  }
}
