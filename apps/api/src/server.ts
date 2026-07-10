import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import { randomBytes, randomUUID } from 'crypto'
import 'dotenv/config'
import { assertProductionEnv, corsAllowedOrigins } from './env-guard.js'
import { pingDb, query, queryOne } from './db/pool.js'
import { runMigrations } from './db/migrate.js'
import { seedDemo } from './db/seed.js'
import {
  agreementClosedError,
  archivedError,
  createContact,
  findOrCreateContact,
  formatPgDate,
  getDebtRow,
  getLedger,
  isAgreementLocked,
  refreshDebtStatus,
} from './debt-helpers.js'
import {
  computeBalance,
  computeDisplayLabel,
  deriveStatus,
  isOverdue,
  type DebtRow,
  type LedgerRow,
} from './domain.js'
import {
  validateAdjustmentAmount,
  validateAdjustmentNote,
  validateDateOnOrBeforeToday,
  validatePaymentAmount,
  validatePrincipal,
  validateReason,
  validationError,
} from './validate.js'
import { resolveUserId, signJwt } from './auth/jwt.js'
import {
  consumeExchangeCode,
  createExchangeCode,
  createOAuthState,
  googleAuthUrl,
  handleGoogleCallback,
  handleKakaoCallback,
  kakaoAuthUrl,
  redirectWithCode,
  redirectWithError,
  verifyOAuthState,
  type OAuthClient,
} from './auth/oauth.js'
import {
  buildPublicShareView,
  createShareToken,
  getActiveShareForDebt,
  revokeActiveForDebt,
  revokeShareForDebt,
  toShareResponse,
} from './share-helpers.js'
import {
  getSecurityState,
  isPinUnlockActive,
  setAppPin,
  unlockSession,
  updateLockTimeout,
  verifyAppPin,
} from './security-helpers.js'
import {
  cancelDeletion,
  cancelDeletionIfScheduled,
  getDeletionState,
  scheduleDeletion,
  purgeDueAccounts,
} from './account-deletion.js'
import { startAccountPurgeCronSchedule } from './account-purge-cron.js'
import { runDueReminders } from './notify/send.js'
import { startNotifyCronSchedule } from './notify/schedule-cron.js'
import {
  allocateContactPayment,
  AllocatePaymentError,
  buildUpcomingDue,
  isValidDebtDirection,
  isValidPaymentStrategy,
  mapContactRow,
  validateDueSchedule,
  type DueScheduleType,
  type PaymentStrategy,
} from './payment-helpers.js'

assertProductionEnv()

await runMigrations()
// 데모 시드는 SEED_DEMO=true일 때만 실행(운영 기본 off, 데모 데이터 유입 차단).
// 이미 데모 유저가 있으면 seedDemo 내부에서 skip한다.
if (process.env.SEED_DEMO === 'true') {
  await seedDemo()
} else {
  console.log('Seed skipped: SEED_DEMO !== "true"')
}

const app = Fastify({ logger: true, trustProxy: true })

const allowedOrigins = corsAllowedOrigins()

app.addHook('onRoute', (routeOptions) => {
  const url = routeOptions.url ?? ''
  const base = { ...(routeOptions.config as Record<string, unknown> | undefined) }
  if (url.startsWith('/api/v1/auth/')) {
    routeOptions.config = { ...base, rateLimit: { max: 20, timeWindow: '15 minutes' } }
  } else if (url.startsWith('/api/v1/public/share/')) {
    routeOptions.config = { ...base, rateLimit: { max: 30, timeWindow: '15 minutes' } }
  } else if (url === '/api/v1/me/security/verify-pin') {
    routeOptions.config = { ...base, rateLimit: { max: 10, timeWindow: '15 minutes' } }
  }
})

await app.register(rateLimit, {
  global: true,
  max: 300,
  timeWindow: '1 minute',
  allowList: (request) => {
    const path = request.url.split('?')[0]
    return path === '/api/v1/health' || path.startsWith('/api/v1/internal/')
  },
  errorResponseBuilder: () => ({
    error: { code: 'RATE_LIMITED', message: '잠시 후 다시 시도해 주세요.' },
  }),
})

await app.register(cors, {
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true)
      return
    }
    cb(new Error('CORS not allowed'), false)
  },
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})

type AuthedRequest = { userId: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// EMAIL_VERIFY_DEV: 명시값(true/false)이 있으면 그대로 따른다(운영에서 false 주입 시 확실히 off).
// 미설정 시에만 dev token 허용 여부(ALLOW_DEV_TOKEN)를 기본값으로 사용한다.
const EMAIL_VERIFY_DEV =
  process.env.EMAIL_VERIFY_DEV !== undefined
    ? process.env.EMAIL_VERIFY_DEV === 'true'
    : process.env.ALLOW_DEV_TOKEN !== 'false'

function mapDebt(row: DebtRow, ledger: LedgerRow[]) {
  const principal = Number(row.principal)
  const balance = computeBalance(principal, ledger)
  const status = deriveStatus(row.status, !!row.agreement_closed, balance)
  const display_label = computeDisplayLabel(status, !!row.agreement_closed, balance)
  return {
    id: row.id,
    contact_id: row.contact_id,
    contact: { display_name: row.contact_name },
    direction: row.direction,
    principal,
    occurred_on: formatPgDate(row.occurred_on),
    reason: row.reason,
    due_on: row.due_on ? formatPgDate(row.due_on) : null,
    status,
    is_split: !!row.is_split,
    agreement_closed: !!row.agreement_closed,
    balance,
    display_label,
    is_overdue: isOverdue(row.due_on ? formatPgDate(row.due_on) : null, status, balance),
    archived_at: row.archived_at,
    completed_at: row.completed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

async function mapDebtAsync(row: DebtRow) {
  const ledger = await getLedger(row.id)
  return mapDebt(row, ledger)
}

function debtEditBlocked(row: DebtRow) {
  if (row.status === 'archived') return archivedError()
  if (isAgreementLocked(row)) return agreementClosedError()
  return null
}

function isPinUnlockExempt(path: string): boolean {
  return path === '/api/v1/me' || path.startsWith('/api/v1/me/security')
}

app.addHook('onRequest', async (req, reply) => {
  const path = req.url.split('?')[0]
  if (
    path.startsWith('/api/v1/public/') ||
    path.startsWith('/api/v1/auth/') ||
    path === '/api/v1/health'
  ) {
    return
  }
  if (path === '/api/v1/internal/health') {
    const secret = process.env.HEALTH_SECRET
    if (!secret || req.headers['x-health-secret'] !== secret) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: '헬스 시크릿이 올바르지 않습니다.' },
      })
    }
    return
  }
  if (path === '/api/v1/internal/notify/run' || path === '/api/v1/internal/account-purge/run') {
    const secret = process.env.NOTIFY_CRON_SECRET
    if (!secret || req.headers['x-notify-cron-secret'] !== secret) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: '크론 시크릿이 올바르지 않습니다.' },
      })
    }
    return
  }
  const userId = await resolveUserId(req.headers.authorization)
  if (!userId) {
    return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } })
  }
  const userExists = await queryOne<{ id: string }>('SELECT id FROM users WHERE id = $1', [userId])
  if (!userExists) {
    return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } })
  }
  if (!isPinUnlockExempt(path) && !(await isPinUnlockActive(userId))) {
    return reply.status(423).send({
      error: { code: 'APP_PIN_REQUIRED', message: '앱 잠금을 해제해 주세요.' },
    })
  }
  ;(req as AuthedRequest).userId = userId
})

app.get('/api/v1/health', async () => ({ ok: true }))

app.get('/api/v1/internal/health', async (_req, reply) => {
  if (!process.env.HEALTH_SECRET) {
    return reply.status(503).send({
      error: { code: 'HEALTH_NOT_CONFIGURED', message: '상세 헬스가 설정되지 않았습니다.' },
    })
  }
  return { ok: true, db: await pingDb() }
})

/** 운영 크론 수동 실행·검증용. NOTIFY_CRON_SECRET 헤더 필요. */
app.post<{ Querystring: { dryRun?: string } }>(
  '/api/v1/internal/notify/run',
  async (req) => {
    const dryRun = req.query.dryRun === 'true'
    const result = await runDueReminders(dryRun)
    return result
  },
)

/** P13 탈퇴 유예 만료 계정 영구 삭제. NOTIFY_CRON_SECRET 헤더 필요. */
app.post<{ Querystring: { dryRun?: string } }>(
  '/api/v1/internal/account-purge/run',
  async (req) => {
    const dryRun = req.query.dryRun === 'true'
    return purgeDueAccounts(dryRun)
  },
)

app.get('/api/v1/me', async (req) => {
  const { userId } = req as AuthedRequest
  const user = await queryOne<{
    id: string
    email: string | null
    email_verified_at: string | null
  }>('SELECT id, email, email_verified_at FROM users WHERE id = $1', [userId])
  const providers = await query<{ provider: string }>(
    'SELECT provider FROM oauth_accounts WHERE user_id = $1',
    [userId],
  )
  const deletion = await getDeletionState(userId)
  return {
    id: user!.id,
    email: user!.email,
    email_verified_at: user!.email_verified_at,
    email_verified: !!user!.email_verified_at,
    providers: providers.rows.map((r) => r.provider),
    deletion,
  }
})

app.post('/api/v1/me/delete-request', async (req) => {
  const { userId } = req as AuthedRequest
  const deletion = await scheduleDeletion(userId)
  return {
    ok: true,
    deletion,
    message:
      '30일 후 계정이 삭제됩니다. 그 전에 다시 로그인하면 탈퇴가 취소됩니다.',
  }
})

app.post('/api/v1/me/delete-request/cancel', async (req, reply) => {
  const { userId } = req as AuthedRequest
  const cancelled = await cancelDeletion(userId)
  if (!cancelled) {
    return reply.status(400).send({
      error: { code: 'DELETE_NOT_SCHEDULED', message: '탈퇴 예약이 없습니다.' },
    })
  }
  return { ok: true, deletion: null }
})

app.post<{ Body: { email: string } }>('/api/v1/me/email', async (req, reply) => {
  const { userId } = req as AuthedRequest
  const email = req.body?.email?.trim().toLowerCase()
  if (!email || !EMAIL_RE.test(email)) {
    return reply.status(400).send(validationError({ email: '올바른 이메일을 입력해 주세요.' }))
  }
  const token = randomBytes(24).toString('hex')
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  await query(
    `UPDATE users SET email = $1, email_verified_at = NULL,
     email_verify_token = $2, email_verify_expires_at = $3, updated_at = NOW() WHERE id = $4`,
    [email, token, expires, userId],
  )
  const payload: Record<string, unknown> = { ok: true, message: '인증 메일을 확인해 주세요.' }
  if (EMAIL_VERIFY_DEV) {
    payload.dev_verify_token = token
    console.log(`[EMAIL_VERIFY_DEV] user=${userId} token=${token}`)
  }
  return payload
})

app.post<{ Body: { token: string } }>('/api/v1/me/email/verify', async (req, reply) => {
  const { userId } = req as AuthedRequest
  const token = req.body?.token?.trim()
  if (!token) {
    return reply.status(400).send(validationError({ token: '인증 토큰이 필요합니다.' }))
  }
  const user = await queryOne<{
    email_verify_token: string | null
    email_verify_expires_at: string | null
  }>(
    'SELECT email_verify_token, email_verify_expires_at FROM users WHERE id = $1',
    [userId],
  )
  if (!user?.email_verify_token || user.email_verify_token !== token) {
    return reply.status(400).send({
      error: { code: 'VALIDATION_ERROR', message: '인증 토큰이 올바르지 않습니다.' },
    })
  }
  if (user.email_verify_expires_at && new Date(user.email_verify_expires_at) < new Date()) {
    return reply.status(400).send({
      error: { code: 'VALIDATION_ERROR', message: '인증 토큰이 만료되었습니다.' },
    })
  }
  await query(
    `UPDATE users SET email_verified_at = NOW(), email_verify_token = NULL,
     email_verify_expires_at = NULL, updated_at = NOW() WHERE id = $1`,
    [userId],
  )
  return { ok: true }
})

app.get('/api/v1/me/security', async (req) => {
  const { userId } = req as AuthedRequest
  return getSecurityState(userId)
})

app.post<{ Body: { pin: string; current_pin?: string } }>(
  '/api/v1/me/security/pin',
  async (req, reply) => {
    const { userId } = req as AuthedRequest
    const result = await setAppPin(userId, req.body?.pin ?? '', req.body?.current_pin)
    if (!result.ok) {
      return reply.status(400).send({ error: { code: result.code, message: result.message } })
    }
    return { ok: true }
  },
)

app.post<{ Body: { pin: string } }>('/api/v1/me/security/verify-pin', async (req, reply) => {
  const { userId } = req as AuthedRequest
  const result = await verifyAppPin(userId, req.body?.pin ?? '')
  if (!result.ok) {
    const status = result.code === 'APP_PIN_LOCKED' ? 429 : 401
    return reply.status(status).send({
      error: { code: result.code, message: result.message, remaining: result.remaining },
    })
  }
  return { ok: true }
})

app.post('/api/v1/me/security/unlock-session', async (req) => {
  const { userId } = req as AuthedRequest
  return unlockSession(userId)
})

app.patch<{ Body: { lock_timeout_minutes: number } }>('/api/v1/me/security', async (req, reply) => {
  const { userId } = req as AuthedRequest
  const result = await updateLockTimeout(userId, req.body?.lock_timeout_minutes)
  if (!result.ok) {
    return reply.status(400).send(validationError({ lock_timeout_minutes: result.message }))
  }
  return getSecurityState(userId)
})

async function ensureNotificationSettings(userId: string) {
  await query(
    `INSERT INTO notification_settings (user_id) VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId],
  )
}

async function isEmailVerified(userId: string): Promise<boolean> {
  const user = await queryOne<{ email_verified_at: unknown }>(
    'SELECT email_verified_at FROM users WHERE id = $1',
    [userId],
  )
  return !!user?.email_verified_at
}

app.get('/api/v1/me/notification-settings', async (req) => {
  const { userId } = req as AuthedRequest
  await ensureNotificationSettings(userId)
  const row = await queryOne(
    'SELECT push_enabled, email_enabled, remind_d1, remind_d0 FROM notification_settings WHERE user_id = $1',
    [userId],
  )
  return row
})

app.patch<{
  Body: Partial<{
    push_enabled: boolean
    email_enabled: boolean
    remind_d1: boolean
    remind_d0: boolean
  }>
}>('/api/v1/me/notification-settings', async (req, reply) => {
  const { userId } = req as AuthedRequest
  const body = req.body ?? {}
  // 이메일 알림을 켤 때만 인증을 요구한다. FCM(push_enabled)은 토큰 등록과 별도로 허용.
  if (body.email_enabled === true && !(await isEmailVerified(userId))) {
    return reply.status(403).send({
      error: {
        code: 'EMAIL_REQUIRED',
        message: '이메일 알림을 켜려면 이메일 인증이 필요합니다.',
      },
    })
  }
  await ensureNotificationSettings(userId)
  const fields: string[] = []
  const params: unknown[] = []
  let n = 1
  for (const key of ['push_enabled', 'email_enabled', 'remind_d1', 'remind_d0'] as const) {
    if (body[key] !== undefined) {
      fields.push(`${key} = $${n++}`)
      params.push(body[key])
    }
  }
  if (fields.length === 0) {
    return reply.status(400).send(validationError({ _: '변경할 항목이 없습니다.' }))
  }
  fields.push(`updated_at = NOW()`)
  params.push(userId)
  await query(
    `UPDATE notification_settings SET ${fields.join(', ')} WHERE user_id = $${n}`,
    params,
  )
  const row = await queryOne(
    'SELECT push_enabled, email_enabled, remind_d1, remind_d0 FROM notification_settings WHERE user_id = $1',
    [userId],
  )
  return row
})

app.post<{
  Body: { endpoint: string; keys: { p256dh: string; auth: string } }
}>('/api/v1/me/push-subscription', async (req, reply) => {
  const { userId } = req as AuthedRequest
  const { endpoint, keys } = req.body ?? {}
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return reply.status(400).send(validationError({ endpoint: '구독 정보가 올바르지 않습니다.' }))
  }
  const existing = await queryOne<{ user_id: string }>(
    'SELECT user_id FROM push_subscriptions WHERE endpoint = $1',
    [endpoint],
  )
  if (existing && existing.user_id !== userId) {
    return reply.status(409).send({
      error: {
        code: 'PUSH_TOKEN_OWNED',
        message: '이 브라우저 푸시 구독은 다른 계정에 등록되어 있습니다.',
      },
    })
  }
  const id = randomUUID()
  await query(
    `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (endpoint) DO UPDATE SET user_id = $2, p256dh = $4, auth = $5`,
    [id, userId, endpoint, keys.p256dh, keys.auth],
  )
  return reply.status(201).send({ ok: true })
})

app.delete<{ Body: { endpoint: string } }>('/api/v1/me/push-subscription', async (req, reply) => {
  const { userId } = req as AuthedRequest
  const endpoint = req.body?.endpoint
  if (!endpoint) {
    return reply.status(400).send(validationError({ endpoint: 'endpoint가 필요합니다.' }))
  }
  await query('DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2', [
    userId,
    endpoint,
  ])
  return reply.status(204).send()
})

app.post<{ Body: { token: string; platform?: string } }>(
  '/api/v1/me/fcm-token',
  async (req, reply) => {
    const { userId } = req as AuthedRequest
    const token = req.body?.token?.trim()
    if (!token) {
      return reply.status(400).send(validationError({ token: 'FCM 토큰이 필요합니다.' }))
    }
    const platform = req.body?.platform?.trim() || 'android'
    const existing = await queryOne<{ user_id: string }>(
      'SELECT user_id FROM fcm_tokens WHERE token = $1',
      [token],
    )
    if (existing && existing.user_id !== userId) {
      return reply.status(409).send({
        error: {
          code: 'PUSH_TOKEN_OWNED',
          message: '이 기기는 다른 계정에 등록되어 있습니다.',
        },
      })
    }
    const id = randomUUID()
    await query(
      `INSERT INTO fcm_tokens (id, user_id, token, platform)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (token) DO UPDATE SET user_id = $2, platform = $4, updated_at = NOW()`,
      [id, userId, token, platform],
    )
    return reply.status(201).send({ ok: true })
  },
)

app.delete<{ Body: { token: string } }>('/api/v1/me/fcm-token', async (req, reply) => {
  const { userId } = req as AuthedRequest
  const token = req.body?.token?.trim()
  if (!token) {
    return reply.status(400).send(validationError({ token: 'FCM 토큰이 필요합니다.' }))
  }
  await query('DELETE FROM fcm_tokens WHERE user_id = $1 AND token = $2', [userId, token])
  return reply.status(204).send()
})

app.get('/api/v1/public/push-vapid-key', async (_req, reply) => {
  const key = process.env.VAPID_PUBLIC_KEY
  if (!key) {
    return reply.status(503).send({
      error: { code: 'PUSH_NOT_CONFIGURED', message: 'Push가 설정되지 않았습니다.' },
    })
  }
  return { public_key: key }
})

// client 쿼리 정규화: 'app'만 앱 딥링크, 그 외(미지정 포함)는 web(기존 동작).
function resolveClient(client?: string): OAuthClient {
  return client === 'app' ? 'app' : 'web'
}

app.post<{ Body: { code?: string } }>('/api/v1/auth/exchange', async (req, reply) => {
  const code = req.body?.code?.trim()
  if (!code) {
    return reply.status(400).send({
      error: { code: 'EXCHANGE_INVALID', message: '교환 코드가 필요합니다.' },
    })
  }
  const userId = await consumeExchangeCode(code)
  if (!userId) {
    return reply.status(400).send({
      error: { code: 'EXCHANGE_INVALID', message: '교환 코드가 유효하지 않거나 만료되었습니다.' },
    })
  }
  const deletionCancelled = await cancelDeletionIfScheduled(userId)
  const token = await signJwt(userId)
  return { token, deletion_cancelled: deletionCancelled }
})

app.get<{ Querystring: { client?: string } }>(
  '/api/v1/auth/google/start',
  async (req, reply) => {
    const client = resolveClient(req.query.client)
    const state = createOAuthState('google', client)
    const url = googleAuthUrl(state)
    if (!url) {
      return reply.status(503).send({
        error: { code: 'OAUTH_NOT_CONFIGURED', message: 'Google 로그인이 설정되지 않았습니다.' },
      })
    }
    return reply.redirect(url)
  },
)

app.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
  '/api/v1/auth/google/callback',
  async (req, reply) => {
    const { code, state, error } = req.query
    // state에서 client를 복원(실패해도 web 기본). 에러/검증 실패 시에도 올바른 곳으로 redirect.
    const client = state ? verifyOAuthState(state, 'google') : null
    if (error) return reply.redirect(redirectWithError(error, client ?? 'web'))
    if (!code || !state || !client) {
      return reply.redirect(redirectWithError('invalid_state', 'web'))
    }
    try {
      const userId = await handleGoogleCallback(code)
      const exchangeCode = await createExchangeCode(userId)
      return reply.redirect(redirectWithCode(exchangeCode, client))
    } catch {
      return reply.redirect(redirectWithError('oauth_failed', client))
    }
  },
)

app.get<{ Querystring: { client?: string } }>(
  '/api/v1/auth/kakao/start',
  async (req, reply) => {
    const client = resolveClient(req.query.client)
    const state = createOAuthState('kakao', client)
    const url = kakaoAuthUrl(state)
    if (!url) {
      return reply.status(503).send({
        error: { code: 'OAUTH_NOT_CONFIGURED', message: 'Kakao 로그인이 설정되지 않았습니다.' },
      })
    }
    return reply.redirect(url)
  },
)

app.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
  '/api/v1/auth/kakao/callback',
  async (req, reply) => {
    const { code, state, error } = req.query
    const client = state ? verifyOAuthState(state, 'kakao') : null
    if (error) return reply.redirect(redirectWithError(error, client ?? 'web'))
    if (!code || !state || !client) {
      return reply.redirect(redirectWithError('invalid_state', 'web'))
    }
    try {
      const userId = await handleKakaoCallback(code)
      const exchangeCode = await createExchangeCode(userId)
      return reply.redirect(redirectWithCode(exchangeCode, client))
    } catch {
      return reply.redirect(redirectWithError('oauth_failed', client))
    }
  },
)

app.get<{ Params: { token: string }; Querystring: { pin?: string } }>(
  '/api/v1/public/share/:token',
  async (req, reply) => {
    if (req.query.pin) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'PIN은 POST로 전송해 주세요.',
          fields: { pin: 'GET 쿼리 pin은 지원하지 않습니다.' },
        },
      })
    }
    const result = await buildPublicShareView(req.params.token)
    if (!result.ok) {
      const status = result.code === 'SHARE_PIN_LOCKED' ? 429 : result.code === 'SHARE_INVALID' ? 404 : 401
      return reply.status(status).send({
        error: {
          code: result.code,
          message: result.message,
          remaining: result.remaining,
        },
      })
    }
    return result.view
  },
)

app.post<{ Params: { token: string }; Body: { pin?: string } }>(
  '/api/v1/public/share/:token',
  async (req, reply) => {
    const result = await buildPublicShareView(req.params.token, req.body?.pin)
    if (!result.ok) {
      const status = result.code === 'SHARE_PIN_LOCKED' ? 429 : result.code === 'SHARE_INVALID' ? 404 : 401
      return reply.status(status).send({
        error: {
          code: result.code,
          message: result.message,
          remaining: result.remaining,
        },
      })
    }
    return result.view
  },
)

app.get('/api/v1/summary', async (req) => {
  const { userId } = req as AuthedRequest
  const [debtsRes, contactsRes] = await Promise.all([
    query<DebtRow>(
      `SELECT d.*, c.display_name AS contact_name FROM debts d
     JOIN contacts c ON c.id = d.contact_id
     WHERE d.user_id = $1 AND d.status != 'archived'`,
      [userId],
    ),
    query<{
      id: string
      display_name: string
      due_schedule_type: DueScheduleType
      due_schedule_value: number | null
    }>(
      `SELECT id, display_name, due_schedule_type, due_schedule_value
       FROM contacts WHERE user_id = $1`,
      [userId],
    ),
  ])

  let totalReceivable = 0
  let totalPayable = 0
  let overdueCount = 0
  let activeCount = 0
  const debtInputs: Array<{
    id: string
    contact_id: string
    contact_name: string
    direction: 'lent' | 'borrowed'
    due_on: string | null
    status: string
    balance: number
  }> = []

  for (const raw of debtsRes.rows) {
    const row = raw as unknown as DebtRow
    const debt = await mapDebtAsync(row)
    if (debt.status === 'active') activeCount++
    if (debt.direction === 'lent') totalReceivable += debt.balance
    else totalPayable += debt.balance
    if (debt.is_overdue) overdueCount++
    debtInputs.push({
      id: debt.id,
      contact_id: debt.contact_id!,
      contact_name: debt.contact.display_name,
      direction: debt.direction,
      due_on: debt.due_on ? formatPgDate(debt.due_on) : null,
      status: debt.status,
      balance: debt.balance,
    })
  }

  const upcoming_due = buildUpcomingDue(debtInputs, contactsRes.rows)

  return {
    total_receivable: totalReceivable,
    total_payable: totalPayable,
    active_count: activeCount,
    overdue_count: overdueCount,
    upcoming_due,
  }
})

app.get<{ Querystring: { direction?: string; status?: string; filter?: string; q?: string } }>(
  '/api/v1/debts',
  async (req) => {
    const { userId } = req as AuthedRequest
    const { direction, status, filter, q } = req.query
    const res = await query<DebtRow>(
      `SELECT d.*, c.display_name AS contact_name FROM debts d
       JOIN contacts c ON c.id = d.contact_id WHERE d.user_id = $1`,
      [userId],
    )

    let mapped = await Promise.all(
      res.rows.map((r) =>
        mapDebtAsync({
          ...(r as unknown as DebtRow),
          principal: Number(r.principal),
          occurred_on: formatPgDate(r.occurred_on),
          due_on: r.due_on ? formatPgDate(r.due_on) : null,
          agreement_closed: Boolean(r.agreement_closed),
          contact_name: r.contact_name as string,
        }),
      ),
    )
    if (direction) mapped = mapped.filter((d) => d.direction === direction)
    if (status) mapped = mapped.filter((d) => d.status === status)
    if (filter === 'overdue') mapped = mapped.filter((d) => d.is_overdue)
    if (q) {
      const lower = q.toLowerCase()
      mapped = mapped.filter(
        (d) => d.contact.display_name.includes(q) || d.reason.toLowerCase().includes(lower),
      )
    }
    return { items: mapped }
  },
)

app.get<{ Params: { id: string } }>('/api/v1/debts/:id', async (req, reply) => {
  const { userId } = req as AuthedRequest
  const row = await getDebtRow(req.params.id, userId)
  if (!row) {
    return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '채무를 찾을 수 없습니다.' } })
  }

  const ledger = await getLedger(row.id)
  const debt = mapDebt(row, ledger)
  const ledger_entries = ledger
    .filter((e) => !e.deleted_at)
    .map((e) => ({
      id: e.id,
      debt_id: e.debt_id,
      type: e.type,
      amount: e.amount,
      occurred_on: e.occurred_on,
      note: e.note,
      created_at: e.created_at,
    }))

  return {
    ...debt,
    opening: { principal: row.principal, occurred_on: row.occurred_on, reason: row.reason },
    ledger_entries,
  }
})

app.patch<{
  Params: { id: string }
  Body: {
    reason?: string
    due_on?: string | null
    occurred_on?: string
    contact_id?: string
    updated_at: string
  }
}>('/api/v1/debts/:id', async (req, reply) => {
  const { userId } = req as AuthedRequest
  const row = await getDebtRow(req.params.id, userId)
  if (!row) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '채무를 찾을 수 없습니다.' } })
  const editBlock = debtEditBlocked(row)
  if (editBlock) return reply.status(400).send(editBlock)

  const body = req.body ?? {}
  const fields: Record<string, string> = {}

  if (!body.updated_at) fields.updated_at = 'updated_at가 필요합니다.'
  if (String(row.updated_at) !== body.updated_at) {
    return reply.status(409).send({
      error: { code: 'VERSION_CONFLICT', message: '다른 기기에서 수정되었습니다. 새로고침 후 다시 시도해 주세요.' },
    })
  }

  if (body.reason !== undefined) {
    const err = validateReason(body.reason)
    if (err) fields.reason = err
  }
  if (body.occurred_on !== undefined) {
    const err = validateDateOnOrBeforeToday(body.occurred_on, '발생일')
    if (err) fields.occurred_on = err
  }
  if (body.due_on !== undefined && body.due_on !== null) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.due_on)) fields.due_on = '예정일 형식이 올바르지 않습니다.'
    const occurred = body.occurred_on ?? row.occurred_on
    if (body.due_on < occurred) fields.due_on = '예정일은 발생일 이후여야 합니다.'
  }
  if (body.contact_id) {
    const c = await queryOne('SELECT id FROM contacts WHERE id = $1 AND user_id = $2', [
      body.contact_id,
      userId,
    ])
    if (!c) fields.contact_id = '상대를 찾을 수 없습니다.'
  }

  if (Object.keys(fields).length > 0) return reply.status(400).send(validationError(fields))

  const sets: string[] = ['updated_at = NOW()']
  const params: unknown[] = []
  let n = 1

  if (body.reason !== undefined) {
    sets.push(`reason = $${n++}`)
    params.push(body.reason.trim())
  }
  if (body.occurred_on !== undefined) {
    sets.push(`occurred_on = $${n++}`)
    params.push(body.occurred_on)
  }
  if (body.due_on !== undefined) {
    sets.push(`due_on = $${n++}`)
    params.push(body.due_on)
  }
  if (body.contact_id !== undefined) {
    sets.push(`contact_id = $${n++}`)
    params.push(body.contact_id)
  }

  params.push(row.id)
  await query(`UPDATE debts SET ${sets.join(', ')} WHERE id = $${n}`, params)

  const updated = await getDebtRow(row.id, userId)!
  return mapDebtAsync(updated)
})

app.patch<{
  Params: { id: string }
  Body: { action: string; updated_at: string }
}>('/api/v1/debts/:id/status', async (req, reply) => {
  const { userId } = req as AuthedRequest
  const row = await getDebtRow(req.params.id, userId)
  if (!row) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '채무를 찾을 수 없습니다.' } })

  const body = req.body ?? {}
  if (!body.updated_at || String(row.updated_at) !== body.updated_at) {
    return reply.status(409).send({
      error: { code: 'VERSION_CONFLICT', message: '다른 기기에서 수정되었습니다. 새로고침 후 다시 시도해 주세요.' },
    })
  }

  const action = body.action
  if (action === 'complete_agreement') {
    if (row.status === 'archived') return reply.status(400).send(archivedError())
    if (row.agreement_closed) {
      return reply.status(400).send({
        error: { code: 'ALREADY_AGREEMENT_CLOSED', message: '이미 합의 종료된 채무입니다.' },
      })
    }
    await query(
      `UPDATE debts SET agreement_closed = TRUE, status = 'completed',
       completed_at = COALESCE(completed_at, NOW()), updated_at = NOW() WHERE id = $1`,
      [row.id],
    )
  } else if (action === 'reopen_agreement') {
    if (row.status === 'archived') return reply.status(400).send(archivedError())
    if (!row.agreement_closed) {
      return reply.status(400).send({
        error: { code: 'NOT_AGREEMENT_CLOSED', message: '합의 종료 상태가 아닙니다.' },
      })
    }
    await query(`UPDATE debts SET agreement_closed = FALSE, updated_at = NOW() WHERE id = $1`, [row.id])
    await refreshDebtStatus(row.id)
  } else if (action === 'archive') {
    await revokeActiveForDebt(row.id)
    await query(
      `UPDATE debts SET status = 'archived', archived_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [row.id],
    )
  } else if (action === 'unarchive') {
    const ledger = await getLedger(row.id)
    const balance = computeBalance(row.principal, ledger)
    const nextStatus = balance === 0 || row.agreement_closed ? 'completed' : 'active'
    await query(
      `UPDATE debts SET status = $1, archived_at = NULL, updated_at = NOW() WHERE id = $2`,
      [nextStatus, row.id],
    )
  } else {
    return reply.status(400).send(validationError({ action: '지원하지 않는 action입니다.' }))
  }

  const updated = await getDebtRow(row.id, userId)!
  return mapDebtAsync(updated)
})

app.get('/api/v1/contacts', async (req) => {
  const { userId } = req as AuthedRequest
  const res = await query(
    'SELECT * FROM contacts WHERE user_id = $1 ORDER BY display_name',
    [userId],
  )
  return { items: res.rows.map((r) => mapContactRow(r as Record<string, unknown>)) }
})

app.get<{ Params: { id: string } }>('/api/v1/contacts/:id', async (req, reply) => {
  const { userId } = req as AuthedRequest
  const contact = await queryOne('SELECT * FROM contacts WHERE id = $1 AND user_id = $2', [
    req.params.id,
    userId,
  ])
  if (!contact) {
    return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '상대를 찾을 수 없습니다.' } })
  }

  const debtsRes = await query<DebtRow>(
    `SELECT d.*, c.display_name AS contact_name FROM debts d
     JOIN contacts c ON c.id = d.contact_id
     WHERE d.contact_id = $1 AND d.user_id = $2`,
    [req.params.id, userId],
  )
  const debts = await Promise.all(debtsRes.rows.map((r) => mapDebtAsync(r as unknown as DebtRow)))

  return { ...mapContactRow(contact as Record<string, unknown>), debts }
})

app.post<{
  Params: { id: string }
  Body: {
    amount: number
    occurred_on: string
    note?: string | null
    strategy?: PaymentStrategy
    direction: 'lent' | 'borrowed'
  }
}>('/api/v1/contacts/:id/allocate-payment', async (req, reply) => {
  const { userId } = req as AuthedRequest
  const contact = await queryOne('SELECT * FROM contacts WHERE id = $1 AND user_id = $2', [
    req.params.id,
    userId,
  ])
  if (!contact) {
    return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '상대를 찾을 수 없습니다.' } })
  }

  const body = req.body ?? {}
  const fields: Record<string, string> = {}
  const amountErr = validatePaymentAmount(body.amount)
  if (amountErr) fields.amount = amountErr
  const dateErr = validateDateOnOrBeforeToday(body.occurred_on, '일자')
  if (dateErr) fields.occurred_on = dateErr
  if (!body.direction || !isValidDebtDirection(body.direction)) {
    fields.direction = '채무 방향(lent 또는 borrowed)을 지정해 주세요.'
  }
  const strategy = body.strategy ?? (contact.payment_strategy as PaymentStrategy) ?? 'oldest_first'
  if (!isValidPaymentStrategy(strategy)) {
    fields.strategy = '배분 방식이 올바르지 않습니다.'
  }
  if (Object.keys(fields).length > 0) return reply.status(400).send(validationError(fields))

  try {
    const result = await allocateContactPayment(
      req.params.id,
      userId,
      body.amount,
      body.occurred_on,
      strategy,
      body.direction,
      body.note,
    )
    return reply.status(201).send(result)
  } catch (e) {
    if (e instanceof AllocatePaymentError) {
      return reply.status(400).send(validationError({ [e.field]: e.message }))
    }
    const msg = e instanceof Error ? e.message : '상환 배분에 실패했습니다.'
    return reply.status(400).send(validationError({ amount: msg }))
  }
})

app.post<{ Body: { display_name: string; note?: string } }>('/api/v1/contacts', async (req, reply) => {
  const { userId } = req as AuthedRequest
  const name = req.body?.display_name?.trim()
  if (!name) {
    return reply.status(400).send(validationError({ display_name: '이름을 입력해 주세요.' }))
  }
  const id = await createContact(userId, name, req.body?.note)
  const row = await queryOne('SELECT * FROM contacts WHERE id = $1', [id])
  return reply.status(201).send(mapContactRow(row!))
})

app.patch<{
  Params: { id: string }
  Body: { display_name?: string; note?: string | null; payment_strategy?: PaymentStrategy; due_schedule_type?: DueScheduleType; due_schedule_value?: number | null }
}>('/api/v1/contacts/:id', async (req, reply) => {
  const { userId } = req as AuthedRequest
  const contact = await queryOne('SELECT * FROM contacts WHERE id = $1 AND user_id = $2', [
    req.params.id,
    userId,
  ])
  if (!contact) {
    return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '상대를 찾을 수 없습니다.' } })
  }

  const body = req.body ?? {}
  const fields: Record<string, string> = {}
  if (body.display_name !== undefined && !body.display_name.trim()) {
    fields.display_name = '이름을 입력해 주세요.'
  }
  if (body.payment_strategy !== undefined && !isValidPaymentStrategy(body.payment_strategy)) {
    fields.payment_strategy = '배분 방식이 올바르지 않습니다.'
  }

  const contactRow = contact as Record<string, unknown>
  let nextScheduleType = (contactRow.due_schedule_type as DueScheduleType) ?? 'none'
  let nextScheduleValue =
    contactRow.due_schedule_value == null ? null : Number(contactRow.due_schedule_value)

  if (body.due_schedule_type !== undefined) {
    nextScheduleType = body.due_schedule_type
    if (body.due_schedule_type === 'none') nextScheduleValue = null
  }
  if (body.due_schedule_value !== undefined && nextScheduleType !== 'none') {
    nextScheduleValue = body.due_schedule_value
  }

  if (body.due_schedule_type !== undefined || body.due_schedule_value !== undefined) {
    const scheduleErr = validateDueSchedule(nextScheduleType, nextScheduleValue)
    if (scheduleErr) fields.due_schedule = scheduleErr
  }
  if (Object.keys(fields).length > 0) return reply.status(400).send(validationError(fields))

  const sets = ['updated_at = NOW()']
  const params: unknown[] = []
  let n = 1

  if (body.display_name !== undefined) {
    sets.push(`display_name = $${n++}`)
    params.push(body.display_name.trim())
  }
  if (body.note !== undefined) {
    sets.push(`note = $${n++}`)
    params.push(body.note)
  }
  if (body.payment_strategy !== undefined) {
    sets.push(`payment_strategy = $${n++}`)
    params.push(body.payment_strategy)
  }
  if (body.due_schedule_type !== undefined || body.due_schedule_value !== undefined) {
    sets.push(`due_schedule_type = $${n++}`)
    params.push(nextScheduleType)
    sets.push(`due_schedule_value = $${n++}`)
    params.push(nextScheduleValue)
  }

  params.push(req.params.id)
  await query(`UPDATE contacts SET ${sets.join(', ')} WHERE id = $${n}`, params)

  const row = await queryOne('SELECT * FROM contacts WHERE id = $1', [req.params.id])
  return mapContactRow(row!)
})

app.delete<{ Params: { id: string } }>('/api/v1/contacts/:id', async (req, reply) => {
  const { userId } = req as AuthedRequest
  const contact = await queryOne('SELECT * FROM contacts WHERE id = $1 AND user_id = $2', [
    req.params.id,
    userId,
  ])
  if (!contact) {
    return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '상대를 찾을 수 없습니다.' } })
  }

  const used = await queryOne('SELECT id FROM debts WHERE contact_id = $1 AND user_id = $2 LIMIT 1', [
    req.params.id,
    userId,
  ])
  if (used) {
    return reply.status(400).send({
      error: { code: 'CONTACT_IN_USE', message: '연결된 채무가 있어 삭제할 수 없습니다.' },
    })
  }

  await query('DELETE FROM contacts WHERE id = $1', [req.params.id])
  return reply.status(204).send()
})

app.post<{
  Body: {
    contact_id?: string
    contact_name?: string
    direction: string
    principal: number
    occurred_on: string
    reason: string
    due_on?: string | null
  }
}>('/api/v1/debts', async (req, reply) => {
  const { userId } = req as AuthedRequest
  const body = req.body ?? {}
  const fields: Record<string, string> = {}

  if ((body as { split?: unknown }).split) {
    fields.split = '분할 상환 기능은 더 이상 지원하지 않습니다.'
  }

  let contactId = body.contact_id
  if (!contactId && body.contact_name?.trim()) {
    contactId = await findOrCreateContact(userId, body.contact_name)
  }
  if (!contactId) fields.contact_id = '상대를 선택하거나 이름을 입력해 주세요.'

  if (body.direction !== 'lent' && body.direction !== 'borrowed') {
    fields.direction = '방향을 선택해 주세요.'
  }

  const principalErr = validatePrincipal(body.principal)
  if (principalErr) fields.principal = principalErr

  const occurredErr = validateDateOnOrBeforeToday(body.occurred_on, '발생일')
  if (occurredErr) fields.occurred_on = occurredErr

  const reasonErr = validateReason(body.reason)
  if (reasonErr) fields.reason = reasonErr

  if (body.due_on) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.due_on)) {
      fields.due_on = '예정일 형식이 올바르지 않습니다.'
    } else if (body.occurred_on && body.due_on < body.occurred_on) {
      fields.due_on = '예정일은 발생일 이후여야 합니다.'
    }
  }

  if (contactId) {
    const c = await queryOne('SELECT id FROM contacts WHERE id = $1 AND user_id = $2', [contactId, userId])
    if (!c) fields.contact_id = '상대를 찾을 수 없습니다.'
  }

  if (Object.keys(fields).length > 0) return reply.status(400).send(validationError(fields))

  const id = randomUUID()
  await query(
    `INSERT INTO debts (id, user_id, contact_id, direction, principal, occurred_on, reason, due_on, status, is_split)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',FALSE)`,
    [
      id,
      userId,
      contactId!,
      body.direction,
      body.principal,
      body.occurred_on,
      body.reason.trim(),
      body.due_on ?? null,
    ],
  )

  const row = await getDebtRow(id, userId)!
  return reply.status(201).send(await mapDebtAsync(row))
})

app.post<{
  Params: { id: string }
  Body: { type: string; amount: number; occurred_on: string; note?: string | null }
}>('/api/v1/debts/:id/ledger', async (req, reply) => {
  const { userId } = req as AuthedRequest
  const row = await getDebtRow(req.params.id, userId)
  if (!row) {
    return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '채무를 찾을 수 없습니다.' } })
  }
  const editBlock = debtEditBlocked(row)
  if (editBlock) return reply.status(400).send(editBlock)

  const body = req.body ?? {}
  const fields: Record<string, string> = {}

  if (body.type === 'payment') {
    const amountErr = validatePaymentAmount(body.amount)
    if (amountErr) fields.amount = amountErr
  } else if (body.type === 'adjustment') {
    const amountErr = validateAdjustmentAmount(body.amount)
    if (amountErr) fields.amount = amountErr
    const noteErr = validateAdjustmentNote(body.note)
    if (noteErr) fields.note = noteErr
  } else {
    fields.type = 'type은 payment 또는 adjustment여야 합니다.'
  }

  const dateErr = validateDateOnOrBeforeToday(body.occurred_on, '일자')
  if (dateErr) fields.occurred_on = dateErr
  else if (body.occurred_on < row.occurred_on) {
    fields.occurred_on = '일자는 채무 발생일 이후여야 합니다.'
  }

  if (body.type === 'payment' && body.note != null && body.note.length > 500) {
    fields.note = '메모는 500자 이하여야 합니다.'
  }

  if (Object.keys(fields).length > 0) return reply.status(400).send(validationError(fields))

  const entryId = randomUUID()
  await query(
    `INSERT INTO ledger_entries (id, debt_id, type, amount, occurred_on, note, participant_id) VALUES ($1,$2,$3,$4,$5,$6,NULL)`,
    [
      entryId,
      row.id,
      body.type,
      body.amount,
      body.occurred_on,
      body.type === 'adjustment' ? body.note?.trim() : body.note?.trim() || null,
    ],
  )

  await refreshDebtStatus(row.id)

  const updated = await getDebtRow(row.id, userId)!
  const ledger = await getLedger(row.id)
  const debt = mapDebt(updated, ledger)
  const entry = ledger.find((e) => e.id === entryId)

  return reply.status(201).send({
    entry: entry
      ? {
          id: entry.id,
          debt_id: entry.debt_id,
          type: entry.type,
          amount: entry.amount,
          occurred_on: entry.occurred_on,
          note: entry.note,
          created_at: entry.created_at,
        }
      : null,
    debt,
  })
})

app.get<{ Params: { id: string } }>('/api/v1/debts/:id/share', async (req, reply) => {
  const { userId } = req as unknown as AuthedRequest
  const row = await getDebtRow(req.params.id, userId)
  if (!row) {
    return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '채무를 찾을 수 없습니다.' } })
  }
  const active = await getActiveShareForDebt(row.id)
  return active ? toShareResponse(active) : null
})

app.post<{
  Params: { id: string }
  Body: {
    expires_in_days?: number | null
    pin?: string | null
    anonymous?: boolean
    include_reason?: boolean
  }
}>('/api/v1/debts/:id/share', async (req, reply) => {
  const { userId } = req as unknown as AuthedRequest
  const row = await getDebtRow(req.params.id, userId)
  if (!row) {
    return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '채무를 찾을 수 없습니다.' } })
  }
  if (row.status === 'archived') return reply.status(400).send(archivedError())

  const body = req.body ?? {}
  const fields: Record<string, string> = {}
  const allowedDays = [7, 30, 90, 180] as const
  let expiresIn: number = 30
  if (body.expires_in_days !== undefined) {
    if (typeof body.expires_in_days === 'number' && allowedDays.includes(body.expires_in_days as (typeof allowedDays)[number])) {
      expiresIn = body.expires_in_days
    } else {
      fields.expires_in_days = '만료일은 7, 30, 90, 180일만 가능합니다.'
    }
  }
  let pin: string | null = null
  if (body.pin != null && body.pin !== '') {
    if (!/^\d{4,6}$/.test(body.pin)) {
      fields.pin = 'PIN은 4~6자리 숫자입니다.'
    } else {
      pin = body.pin
    }
  }
  if (Object.keys(fields).length > 0) return reply.status(400).send(validationError(fields))

  const share = await createShareToken(row.id, {
    expires_in_days: expiresIn,
    pin,
    anonymous: body.anonymous ?? false,
    include_reason: body.include_reason !== false,
  })
  return reply.status(201).send(toShareResponse(share))
})

app.delete<{ Params: { id: string } }>('/api/v1/debts/:id/share', async (req, reply) => {
  const { userId } = req as unknown as AuthedRequest
  const ok = await revokeShareForDebt(req.params.id, userId)
  if (!ok) {
    return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '채무를 찾을 수 없습니다.' } })
  }
  return reply.status(204).send()
})

app.delete<{ Params: { id: string; entryId: string } }>(
  '/api/v1/debts/:id/ledger/:entryId',
  async (req, reply) => {
    const { userId } = req as AuthedRequest
    const row = await getDebtRow(req.params.id, userId)
    if (!row) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '채무를 찾을 수 없습니다.' } })
    }
    const editBlock = debtEditBlocked(row)
    if (editBlock) return reply.status(400).send(editBlock)

    const entry = await queryOne(
      'SELECT * FROM ledger_entries WHERE id = $1 AND debt_id = $2 AND deleted_at IS NULL',
      [req.params.entryId, row.id],
    )
    if (!entry) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '내역을 찾을 수 없습니다.' } })
    }

    await query('UPDATE ledger_entries SET deleted_at = NOW() WHERE id = $1', [req.params.entryId])
    await refreshDebtStatus(row.id)

    const updated = await getDebtRow(row.id, userId)!
    return mapDebtAsync(updated)
  },
)

const notifyCronEnabled =
  process.env.NOTIFY_CRON_ENABLED === 'true' ||
  (process.env.NOTIFY_CRON_ENABLED !== 'false' &&
    process.env.ALLOW_DEV_TOKEN === 'false')

const accountPurgeCronEnabled =
  process.env.ACCOUNT_PURGE_CRON_ENABLED === 'true' ||
  (process.env.ACCOUNT_PURGE_CRON_ENABLED !== 'false' &&
    process.env.ALLOW_DEV_TOKEN === 'false')

if (notifyCronEnabled) {
  startNotifyCronSchedule()
} else if (process.env.NOTIFY_CRON_DEV === 'true') {
  setInterval(() => {
    void runDueReminders(true).then((r) => console.log('[NOTIFY_CRON_DEV]', r))
  }, 60_000)
  console.log('NOTIFY_CRON_DEV: dry-run every 60s')
}

if (accountPurgeCronEnabled) {
  startAccountPurgeCronSchedule()
}

const port = Number(process.env.PORT) || 3910
await app.listen({ port, host: '0.0.0.0' })
console.log(`payClear API http://localhost:${port}`)
