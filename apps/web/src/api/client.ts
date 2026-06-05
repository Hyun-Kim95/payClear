const TOKEN_KEY = 'payclear-token'
export const DEV_TOKEN = 'dev-token'

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY)
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string>),
  }
  if (token) headers.Authorization = `Bearer ${token}`
  if (init?.body) headers['Content-Type'] = 'application/json'

  const res = await fetch(`/api/v1${path}`, { ...init, headers })
  if (res.status === 204) return undefined as T
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(
      res.status,
      body.error?.code ?? 'ERROR',
      body.error?.message ?? '요청 실패',
      body.error?.fields,
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
}

export interface Summary {
  total_receivable: number
  total_payable: number
  active_count: number
  overdue_count: number
  upcoming_due: Array<{
    debt_id: string
    contact_name: string
    due_on: string
    balance: number
    direction: string
  }>
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

export interface Contact {
  id: string
  display_name: string
  note?: string | null
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

async function publicRequest<T>(path: string): Promise<T> {
  const res = await fetch(`/api/v1${path}`)
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
  updateContact: (id: string, data: { display_name?: string; note?: string | null }) =>
    request<Contact>(`/contacts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteContact: (id: string) => request<void>(`/contacts/${id}`, { method: 'DELETE' }),
  createDebt: (input: CreateDebtInput) =>
    request<Debt>('/debts', { method: 'POST', body: JSON.stringify(input) }),
  patchDebt: (id: string, input: PatchDebtInput) =>
    request<Debt>(`/debts/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  patchDebtStatus: (id: string, action: 'complete_agreement' | 'archive' | 'unarchive', updated_at: string) =>
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
    const q = pin ? `?pin=${encodeURIComponent(pin)}` : ''
    return publicRequest<PublicShareView>(`/public/share/${token}${q}`)
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
}

export const API_BASE = '/api/v1'

export function oauthStartUrl(provider: 'google' | 'kakao'): string {
  return `${API_BASE}/auth/${provider}/start`
}

export function formatKRW(amount: number): string {
  return `${Math.abs(amount).toLocaleString('ko-KR')}원`
}

export function todayLocal(): string {
  return new Date().toLocaleDateString('en-CA')
}
