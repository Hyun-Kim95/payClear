export const SESSION_LOCK_KEY = 'payclear-locked'
export const SESSION_ACTIVITY_KEY = 'payclear-last-activity'

/** 새 로그인 직후 이전 탭에 남은 잠금 플래그 제거 */
export function clearClientLockSession(): void {
  sessionStorage.removeItem(SESSION_LOCK_KEY)
  sessionStorage.setItem(SESSION_ACTIVITY_KEY, String(Date.now()))
}
