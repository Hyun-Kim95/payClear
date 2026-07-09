import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'
import { isBrowserOnline } from '../hooks/useOnlineStatus'

const TOKEN_KEY = 'payclear-token'

// 네이티브(Capacitor) 여부. 웹 빌드에서는 항상 false.
const isNative = Capacitor.isNativePlatform()

// 네이티브에서는 Preferences가 비동기라, 동기 getToken 시그니처를 유지하기 위해
// 앱 시작 시 initAuth()로 토큰을 메모리 캐시에 로드한다. 웹은 sessionStorage 동기 사용.
let tokenCache: string | null = null

/**
 * 앱 시작 시 1회 호출. 네이티브면 Secure Storage(레거시 Preferences 마이그레이션 포함)에서 토큰 로드.
 * 웹에서는 sessionStorage를 직접 동기 사용하므로 별도 작업이 없다.
 */
export async function initAuth(): Promise<void> {
  if (!isNative) return
  try {
    const secure = await SecureStoragePlugin.get({ key: TOKEN_KEY }).catch(() => null)
    if (secure?.value) {
      tokenCache = secure.value
      return
    }
    const legacy = await Preferences.get({ key: TOKEN_KEY })
    if (legacy.value) {
      tokenCache = legacy.value
      await SecureStoragePlugin.set({ key: TOKEN_KEY, value: legacy.value })
      await Preferences.remove({ key: TOKEN_KEY })
    } else {
      tokenCache = null
    }
  } catch {
    tokenCache = null
  }
}

export function getToken(): string | null {
  if (isNative) return tokenCache
  return sessionStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  if (isNative) {
    tokenCache = token
    void SecureStoragePlugin.set({ key: TOKEN_KEY, value: token }).catch(() => {
      void Preferences.set({ key: TOKEN_KEY, value: token })
    })
    return
  }
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  if (isNative) {
    tokenCache = null
    void SecureStoragePlugin.remove({ key: TOKEN_KEY }).catch(() => {})
    void Preferences.remove({ key: TOKEN_KEY })
    return
  }
  sessionStorage.removeItem(TOKEN_KEY)
}

// 인증 만료/무효(401 UNAUTHORIZED) 시 호출되는 전역 핸들러.
// App에서 react-router navigate로 /login 이동을 등록한다.
let unauthorizedHandler: (() => void) | null = null
export function setUnauthorizedHandler(fn: (() => void) | null) {
  unauthorizedHandler = fn
}

// 서버 PIN 잠금 세션 만료(423 APP_PIN_REQUIRED) 시 /lock 이동.
let pinRequiredHandler: (() => void) | null = null
export function setPinRequiredHandler(fn: (() => void) | null) {
  pinRequiredHandler = fn
}

export class ApiError extends Error {
  code: string
  status: number
  fields?: Record<string, string>
  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message)
    this.status = status
    this.code = code
    this.fields = fields
  }
}

export function isUnauthorizedError(err: unknown): err is ApiError {
  return err instanceof ApiError && err.status === 401 && err.code === 'UNAUTHORIZED'
}

export function isPinRequiredError(err: unknown): err is ApiError {
  return err instanceof ApiError && err.status === 423 && err.code === 'APP_PIN_REQUIRED'
}

export function isVersionConflictError(err: unknown): err is ApiError {
  return err instanceof ApiError && err.status === 409 && err.code === 'VERSION_CONFLICT'
}

export function isOfflineError(err: unknown): err is ApiError {
  return err instanceof ApiError && err.code === 'OFFLINE'
}

export const VERSION_CONFLICT_MESSAGE =
  '다른 기기에서 수정되었습니다. 새로고침 후 다시 시도해 주세요.'

export const OFFLINE_MESSAGE = '연결 필요 — 인터넷 연결을 확인해 주세요.'

function parseApiErrorMessage(body: Record<string, unknown>): string {
  const nested = body.error
  if (nested && typeof nested === 'object' && 'message' in nested && typeof nested.message === 'string') {
    return nested.message
  }
  if (typeof body.message === 'string') return body.message
  return '요청 실패'
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? 'GET').toUpperCase()
  if (method !== 'GET' && !isBrowserOnline()) {
    throw new ApiError(0, 'OFFLINE', OFFLINE_MESSAGE)
  }

  const token = getToken()
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string>),
  }
  if (token) headers.Authorization = `Bearer ${token}`
  if (init?.body) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers })
  if (res.status === 204) return undefined as T
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const errObj = typeof body.error === 'object' && body.error ? body.error : null
    const code = (errObj?.code as string | undefined) ?? (typeof body.code === 'string' ? body.code : 'ERROR')
    // 인증 토큰 만료/무효: 토큰을 비우고 로그인 화면으로 보낸다.
    // (공유 PIN 오류 등 비인증 401은 code가 달라 제외된다)
    if (res.status === 401 && code === 'UNAUTHORIZED') {
      clearToken()
      unauthorizedHandler?.()
    }
    if (res.status === 423 && code === 'APP_PIN_REQUIRED') {
      pinRequiredHandler?.()
    }
    throw new ApiError(
      res.status,
      code,
      parseApiErrorMessage(body),
      errObj?.fields as Record<string, string> | undefined,
    )
  }
  return body as T
}

export interface Debt {
  id: string
  contact_id?: string
  contact: { display_name: string }
  direction: 'lent' | 'borrowed'
  principal: number
  balance: number
  status: 'active' | 'completed' | 'archived'
  agreement_closed: boolean
  display_label: string | null
  is_overdue: boolean
  due_on: string | null
  reason: string
  occurred_on: string
  updated_at: string
  is_split?: boolean
}

export type UpcomingDueKind = 'debt' | 'contact_schedule'

export interface UpcomingDueItem {
  kind: UpcomingDueKind
  due_on: string
  contact_name: string
  contact_id: string
  balance: number
  direction: 'lent' | 'borrowed'
  debt_id?: string
  schedule_label?: string | null
}

export interface Summary {
  total_receivable: number
  total_payable: number
  active_count: number
  overdue_count: number
  upcoming_due: UpcomingDueItem[]
}

export interface DebtDetail extends Debt {
  opening: { principal: number; occurred_on: string; reason: string }
  ledger_entries: Array<{
    id: string
    type: 'payment' | 'adjustment'
    amount: number
    occurred_on: string
    note: string | null
  }>
}

export type PaymentStrategy = 'oldest_first' | 'largest_first' | 'newest_first' | 'smallest_first'

export const PAYMENT_STRATEGY_LABELS: Record<PaymentStrategy, string> = {
  oldest_first: '오래된 채무부터',
  newest_first: '최근 채무부터',
  largest_first: '잔액 큰 순',
  smallest_first: '잔액 작은 순',
}

export type DueScheduleType = 'none' | 'monthly' | 'weekly'

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const

export interface Contact {
  id: string
  display_name: string
  note?: string | null
  payment_strategy?: PaymentStrategy
  due_schedule_type?: DueScheduleType
  due_schedule_value?: number | null
  due_schedule_label?: string | null
}

export interface ContactDetail extends Contact {
  debts: Debt[]
}

export interface CreateDebtInput {
  contact_id?: string
  contact_name?: string
  direction: 'lent' | 'borrowed'
  principal: number
  occurred_on: string
  reason: string
  due_on?: string | null
}

export interface PaymentInput {
  amount: number
  occurred_on: string
  note?: string | null
}

export interface AdjustmentInput {
  amount: number
  occurred_on: string
  note: string
}

export interface PatchDebtInput {
  reason?: string
  due_on?: string | null
  occurred_on?: string
  contact_id?: string
  updated_at: string
}

export interface ShareLink {
  token: string
  url: string
  expires_at: string | null
  has_pin: boolean
  anonymous: boolean
  include_reason: boolean
  created_at: string
}

export interface PublicShareView {
  direction: 'lent' | 'borrowed'
  contact: { display_name: string }
  balance: number
  display_label: string | null
  is_overdue: boolean
  occurred_on: string
  due_on: string | null
  reason?: string
  opening: { principal: number; occurred_on: string; reason?: string }
  ledger_entries: Array<{
    id: string
    type: 'payment' | 'adjustment'
    amount: number
    occurred_on: string
    note: string | null
  }>
}

export interface MeProfile {
  id: string
  email: string | null
  email_verified_at: string | null
  email_verified: boolean
  providers: string[]
}

export interface SecurityState {
  pin_set: boolean
  lock_timeout_minutes: number
  locked_until: string | null
  failed_count: number
}

export interface NotificationSettings {
  push_enabled: boolean
  email_enabled: boolean
  remind_d1: boolean
  remind_d0: boolean
}

async function publicRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(
      res.status,
      body.error?.code ?? 'ERROR',
      body.error?.message ?? '요청 실패',
    )
  }
  return body as T
}

export const api = {
  me: () => request<MeProfile>('/me'),
  registerEmail: (email: string) =>
    request<{ ok: boolean; dev_verify_token?: string }>('/me/email', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  verifyEmail: (token: string) =>
    request<{ ok: boolean }>('/me/email/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
  summary: () => request<Summary>('/summary'),
  debts: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params)}` : ''
    return request<{ items: Debt[] }>(`/debts${q}`)
  },
  debt: (id: string) => request<DebtDetail>(`/debts/${id}`),
  contacts: () => request<{ items: Contact[] }>('/contacts'),
  contact: (id: string) => request<ContactDetail>(`/contacts/${id}`),
  createContact: (display_name: string, note?: string) =>
    request<Contact>('/contacts', {
      method: 'POST',
      body: JSON.stringify({ display_name, note }),
    }),
  updateContact: (
    id: string,
    data: {
      display_name?: string
      note?: string | null
      payment_strategy?: PaymentStrategy
      due_schedule_type?: DueScheduleType
      due_schedule_value?: number | null
    },
  ) => request<Contact>(`/contacts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  allocateContactPayment: (
    contactId: string,
    input: {
      amount: number
      occurred_on: string
      direction: 'lent' | 'borrowed'
      note?: string | null
      strategy?: PaymentStrategy
    },
  ) =>
    request<{
      allocated_total: number
      unallocated: number
      payments: Array<{ debt_id: string; amount: number; entry_id: string; reason: string }>
    }>(`/contacts/${contactId}/allocate-payment`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  deleteContact: (id: string) => request<void>(`/contacts/${id}`, { method: 'DELETE' }),
  createDebt: (input: CreateDebtInput) =>
    request<Debt>('/debts', { method: 'POST', body: JSON.stringify(input) }),
  patchDebt: (id: string, input: PatchDebtInput) =>
    request<Debt>(`/debts/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  patchDebtStatus: (
    id: string,
    action: 'complete_agreement' | 'reopen_agreement' | 'archive' | 'unarchive',
    updated_at: string,
  ) =>
    request<Debt>(`/debts/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ action, updated_at }),
    }),
  addPayment: (debtId: string, input: PaymentInput) =>
    request<{ debt: Debt; entry: DebtDetail['ledger_entries'][0] }>(`/debts/${debtId}/ledger`, {
      method: 'POST',
      body: JSON.stringify({ type: 'payment', ...input }),
    }),
  addAdjustment: (debtId: string, input: AdjustmentInput) =>
    request<{ debt: Debt; entry: DebtDetail['ledger_entries'][0] }>(`/debts/${debtId}/ledger`, {
      method: 'POST',
      body: JSON.stringify({ type: 'adjustment', ...input }),
    }),
  deleteLedgerEntry: (debtId: string, entryId: string) =>
    request<Debt>(`/debts/${debtId}/ledger/${entryId}`, { method: 'DELETE' }),
  getShare: (debtId: string) => request<ShareLink | null>(`/debts/${debtId}/share`),
  createShare: (
    debtId: string,
    input: {
      expires_in_days?: number | null
      pin?: string | null
      anonymous?: boolean
      include_reason?: boolean
    },
  ) =>
    request<ShareLink>(`/debts/${debtId}/share`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  revokeShare: (debtId: string) =>
    request<void>(`/debts/${debtId}/share`, { method: 'DELETE' }),
  getPublicShare: (token: string, pin?: string) => {
    if (pin) {
      return publicRequest<PublicShareView>(`/public/share/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
    }
    return publicRequest<PublicShareView>(`/public/share/${token}`)
  },
  getSecurity: () => request<SecurityState>('/me/security'),
  setPin: (pin: string, current_pin?: string) =>
    request<{ ok: boolean }>('/me/security/pin', {
      method: 'POST',
      body: JSON.stringify({ pin, current_pin }),
    }),
  verifyPin: (pin: string) =>
    request<{ ok: boolean }>('/me/security/verify-pin', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    }),
  unlockSession: () => request<{ ok: boolean }>('/me/security/unlock-session', { method: 'POST' }),
  patchSecurity: (lock_timeout_minutes: number) =>
    request<SecurityState>('/me/security', {
      method: 'PATCH',
      body: JSON.stringify({ lock_timeout_minutes }),
    }),
  getNotificationSettings: () => request<NotificationSettings>('/me/notification-settings'),
  patchNotificationSettings: (data: Partial<NotificationSettings>) =>
    request<NotificationSettings>('/me/notification-settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  savePushSubscription: (sub: PushSubscriptionJSON) =>
    request<{ ok: boolean }>('/me/push-subscription', {
      method: 'POST',
      body: JSON.stringify({
        endpoint: sub.endpoint,
        keys: sub.keys,
      }),
    }),
  deletePushSubscription: (endpoint: string) =>
    request<void>('/me/push-subscription', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint }),
    }),
  getPushVapidKey: () => publicRequest<{ public_key: string }>('/public/push-vapid-key'),
  registerFcmToken: (token: string) =>
    request<{ ok: boolean }>('/me/fcm-token', {
      method: 'POST',
      body: JSON.stringify({ token, platform: 'android' }),
    }),
  deleteFcmToken: (token: string) =>
    request<void>('/me/fcm-token', {
      method: 'DELETE',
      body: JSON.stringify({ token }),
    }),
}

// 빌드타임 환경변수 VITE_API_BASE로 API base를 주입한다.
// - 웹 빌드(미설정): 기존 상대경로 '/api/v1' 유지(같은 오리진 / Vite proxy).
// - 앱 빌드(설정): 'https://<railway-domain>/api/v1' 절대 URL.
export const API_BASE = import.meta.env.VITE_API_BASE ?? '/api/v1'

/** OAuth one-time code → JWT (POST /auth/exchange). */
export async function exchangeAuthCode(code: string): Promise<void> {
  const { token } = await publicRequest<{ token: string }>('/auth/exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  setToken(token)
}

export function oauthStartUrl(provider: 'google' | 'kakao'): string {
  // 네이티브 앱은 콜백을 딥링크(payclear://)로 받기 위해 client=app을 붙인다.
  const suffix = isNative ? '?client=app' : ''
  return `${API_BASE}/auth/${provider}/start${suffix}`
}

/**
 * OAuth 로그인 시작.
 * - 웹: 현재 탭을 서버 start URL로 이동(기존 동작).
 * - 네이티브: 시스템 브라우저(@capacitor/browser)로 열고, 콜백은 appUrlOpen 딥링크로 받는다.
 */
export async function startOAuth(provider: 'google' | 'kakao'): Promise<void> {
  const url = oauthStartUrl(provider)
  if (isNative) {
    const { Browser } = await import('@capacitor/browser')
    await Browser.open({ url })
    return
  }
  window.location.href = url
}

export function isNativePlatform(): boolean {
  return isNative
}

export function formatKRW(amount: number): string {
  return `${Math.abs(amount).toLocaleString('ko-KR')}원`
}

/** YYYY-MM-DD 또는 ISO 문자열을 화면용 날짜(YYYY-MM-DD)로 */
export function formatDateYMD(value: string | null | undefined): string {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)
  return value
}

export function todayLocal(): string {
  return new Date().toLocaleDateString('en-CA')
}
